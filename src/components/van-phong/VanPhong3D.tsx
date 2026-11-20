/**
 * Cảnh 3D của Văn phòng kế toán (tải lười: chỉ chunk này kéo three.js về).
 *
 * Mỗi khách một bàn (bàn, màn hình, đèn trạng thái vẽ bằng InstancedMesh — 50 bàn vẫn là vài lệnh vẽ). Năm mèo khối
 * (`meoKhoi.ts`) đi tới bàn của khách mà máy chủ nói chúng đang làm (`agent` trong danh mục, từ hoạt động THẬT 24 giờ hoặc
 * việc đang chờ). Biểu cảm theo việc thật: gấp ở bàn đỏ, mừng khi kế toán vừa duyệt việc của nó, rảnh thì về góc
 * nghỉ cạnh bàn kế toán. HẾT XU (năng lượng AI tháng này = 0) thì mọi mèo về góc nghỉ và ngủ. Kế toán (mèo cam gõ laptop) ngồi bàn chính. Bấm bàn → mở bảng chi tiết khách.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CanvasTexture, Color, Object3D, SRGBColorSpace, Vector3, type InstancedMesh } from 'three';
import type { AgentDangLam, KhachVanPhong, TenAgentVP } from '@/lib/goiVanPhong';
import { AGENT, MAU_DEN } from './chu';
import { capNhatKeToan, capNhatMeo, huyMeo, taoKeToan, taoMeo } from './meoKhoi';
import { giamChuyenDong } from './kiemMay';

/** Mèo khối dựng ở kích thước ~1,1; bàn khách rộng 2,2 → co mèo lại cho cân. */
const TI_LE_MEO = 0.6;
const GIAM_CHUYEN_DONG = giamChuyenDong();

const KHOANG_X = 3.4;
const KHOANG_Z = 3.2;

export function viTriBan(i: number, tong: number): [number, number] {
  const cot = Math.max(1, Math.ceil(Math.sqrt(tong * 1.4)));
  const hang = Math.ceil(tong / cot);
  const x = (i % cot) * KHOANG_X - ((cot - 1) * KHOANG_X) / 2;
  const z = Math.floor(i / cot) * KHOANG_Z - ((hang - 1) * KHOANG_Z) / 2;
  return [x, z];
}

function taoNhan(chu: string, mau: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.beginPath(); g.roundRect(4, 8, 504, 80, 24); g.fill();
  g.fillStyle = mau; g.beginPath(); g.arc(44, 48, 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#111827'; g.font = '600 34px system-ui, sans-serif'; g.textBaseline = 'middle';
  const ten = chu.length > 24 ? `${chu.slice(0, 23)}…` : chu;
  g.fillText(ten, 76, 50);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function NhanBan({ ten, mau, x, z }: { ten: string; mau: string; x: number; z: number }) {
  const tex = useMemo(() => taoNhan(ten, mau), [ten, mau]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <sprite position={[x, 2.1, z - 0.2]} scale={[3.0, 0.56, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  );
}

function CacBan({ khach, chon, onChon }: { khach: KhachVanPhong[]; chon: string | null; onChon: (id: string) => void }) {
  const mat = useRef<InstancedMesh>(null);
  const man = useRef<InstancedMesh>(null);
  const den = useRef<InstancedMesh>(null);
  const n = khach.length;
  useLayoutEffect(() => {
    const o = new Object3D();
    const mau = new Color();
    khach.forEach((k, i) => {
      const [x, z] = viTriBan(i, n);
      o.position.set(x, 0.75, z); o.scale.set(1, 1, 1); o.updateMatrix(); mat.current?.setMatrixAt(i, o.matrix);
      o.position.set(x, 1.25, z - 0.35); o.updateMatrix(); man.current?.setMatrixAt(i, o.matrix);
      o.position.set(x + 0.85, 0.95, z + 0.2); o.updateMatrix(); den.current?.setMatrixAt(i, o.matrix);
      den.current?.setColorAt(i, mau.set(MAU_DEN[k.muc]));
    });
    for (const m of [mat.current, man.current, den.current]) {
      if (!m) continue;
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [khach, n]);
  const bam = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && khach[e.instanceId]) onChon(khach[e.instanceId].id);
  };
  const iChon = khach.findIndex((k) => k.id === chon);
  const [cx, cz] = iChon >= 0 ? viTriBan(iChon, n) : [0, 0];
  const toiDa = Math.max(1, n);
  return (
    <group>
      <instancedMesh ref={mat} args={[undefined, undefined, toiDa]} onClick={bam}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <boxGeometry args={[2.2, 0.12, 1.2]} />
        <meshStandardMaterial color="#d6b48a" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={man} args={[undefined, undefined, toiDa]} onClick={bam}>
        <boxGeometry args={[0.9, 0.55, 0.06]} />
        <meshStandardMaterial color="#1f2937" roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={den} args={[undefined, undefined, toiDa]} onClick={bam}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {khach.map((k, i) => { const [x, z] = viTriBan(i, n); return <NhanBan key={k.id} ten={k.ten} mau={MAU_DEN[k.muc]} x={x} z={z} />; })}
      {iChon >= 0 && (
        <mesh position={[cx, 0.02, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.7, 40]} />
          <meshBasicMaterial color="#6366f1" />
        </mesh>
      )}
    </group>
  );
}

/** Mèo khối voxel (xem `meoKhoi.ts`): biểu cảm theo việc thật — gấp ở bàn đỏ, mừng khi được duyệt, ngủ khi hết việc. */
function Meo({ ten, dich, coViec, banDo, hetXu, vuiDenMs }: { ten: TenAgentVP; dich: Vector3; coViec: boolean; banDo: boolean; hetXu: boolean; vuiDenMs: number }) {
  const meo = useMemo(() => {
    const m = taoMeo(ten, AGENT[ten].mau, TI_LE_MEO);
    m.position.set(dich.x - 3, 0, dich.z + 3);
    return m;
    // Dựng một lần cho mỗi agent; vị trí sau đó do capNhatMeo dẫn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ten]);
  useEffect(() => () => huyMeo(meo), [meo]);
  useFrame((s, dt) => {
    capNhatMeo(meo, { dich, coViec, banDo, hetXu, vuiDenMs, t: s.clock.elapsedTime, dt, giam: GIAM_CHUYEN_DONG, tocDo: 2.6 });
  });
  return <primitive object={meo} />;
}

function KeToan({ x, z }: { x: number; z: number }) {
  const g = useMemo(() => taoKeToan('#e07b24', TI_LE_MEO * 1.25), []);
  useEffect(() => () => huyMeo(g), [g]);
  useFrame((s) => capNhatKeToan(g, s.clock.elapsedTime, GIAM_CHUYEN_DONG));
  return <primitive object={g} position={[x, 0, z]} />;
}

export default function VanPhong3D({ khach, agent, chon, onChon, vui = null, hetXu = false }: {
  khach: KhachVanPhong[]; agent: AgentDangLam[]; chon: string | null; onChon: (id: string) => void;
  /** Agent vừa được kế toán duyệt việc → nhảy mừng tới mốc Date.now() này. */
  vui?: { agent: TenAgentVP; den: number } | null;
  /** Hết xu tháng này: agent AI tạm nghỉ → mọi mèo về góc nghỉ ngủ. */
  hetXu?: boolean;
}) {
  const n = khach.length;
  const cot = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, n) * 1.4)));
  const rongX = cot * KHOANG_X;
  const sauZ = Math.ceil(Math.max(1, n) / cot) * KHOANG_Z;
  // Bàn kế toán: giữa phía trước dãy bàn khách, quay mặt về phía người xem.
  const ke = useMemo(() => new Vector3(0, 0, sauZ / 2 + 2.6), [sauZ]);
  const dich = useMemo(() => {
    const theoBan = new Map<string, number>();
    return agent.map((a, i) => {
      const iBan = a.company_id ? khach.findIndex((k) => k.id === a.company_id) : -1;
      if (iBan < 0 || hetXu) return new Vector3(ke.x - 2.4 - i * 0.9, 0, ke.z + 0.2);
      const thu = theoBan.get(a.company_id!) ?? 0;
      theoBan.set(a.company_id!, thu + 1);
      const [x, z] = viTriBan(iBan, n);
      // Đứng cạnh trái bàn, mèo thứ hai đứng sau mèo thứ nhất.
      return new Vector3(x - 1.45, 0, z + 0.1 + thu * 0.75);
    });
  }, [agent, khach, n, ke, hetXu]);
  const mucCua = (id: string | null) => (id ? khach.find((k) => k.id === id)?.muc ?? null : null);
  // Máy ảnh vừa khít dãy bàn: xa theo bề rộng (hoặc bề sâu) lớn hơn.
  const xa = Math.max(8, Math.max(rongX, (sauZ + 4) * 1.3) * 0.62 + 2.5);
  const rong = Math.max(rongX, sauZ) + 8;
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, xa * 0.8, xa * 0.85], fov: 45 }} gl={{ antialias: true, powerPreference: 'low-power' }}>
      <color attach="background" args={['#efe7dd']} />
      <hemisphereLight args={['#ffffff', '#b9a894', 1.0]} />
      <directionalLight position={[6, 12, 8]} intensity={1.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[rong + 6, rong + 6]} />
        <meshStandardMaterial color="#efe7dd" />
      </mesh>
      {/* Góc nghỉ: thảm cạnh bàn kế toán, mèo hết việc về đây ngủ. */}
      <mesh position={[ke.x - 3.3, 0.01, ke.z + 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.4, 1.4]} />
        <meshStandardMaterial color="#fbeee2" />
      </mesh>
      <KeToan x={ke.x} z={ke.z} />
      {/* Đổi số bàn (sang trang khác) thì dựng lại: InstancedMesh giữ sức chứa lúc tạo. */}
      <CacBan key={n} khach={khach} chon={chon} onChon={onChon} />
      {agent.map((a, i) => (
        <Meo key={a.agent} ten={a.agent} dich={dich[i]} coViec={a.company_id !== null} banDo={mucCua(a.company_id) === 'do'} hetXu={hetXu}
          vuiDenMs={vui?.agent === a.agent ? vui.den : 0} />
      ))}
      <OrbitControls makeDefault enablePan={false} minDistance={5} maxDistance={xa * 2.2} maxPolarAngle={Math.PI / 2.3} />
    </Canvas>
  );
}
