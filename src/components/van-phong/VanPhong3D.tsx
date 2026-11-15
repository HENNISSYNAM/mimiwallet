/**
 * Cảnh 3D của Văn phòng kế toán (tải lười: chỉ chunk này kéo three.js về).
 *
 * Mỗi khách một bàn (bàn, màn hình, đèn trạng thái vẽ bằng InstancedMesh — 50 bàn vẫn là vài lệnh vẽ). Năm mèo agent
 * low-poly đi tới bàn của khách mà máy chủ nói chúng đang làm (`agent` trong danh mục, từ hoạt động THẬT 24 giờ hoặc
 * việc đang chờ). Không có việc → về góc nghỉ. Bấm bàn → mở bảng chi tiết khách.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CanvasTexture, Color, Object3D, SRGBColorSpace, Vector3, type Group, type InstancedMesh } from 'three';
import type { AgentDangLam, KhachVanPhong, TenAgentVP } from '@/lib/goiVanPhong';
import { AGENT, MAU_DEN } from './chu';

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

/** Mèo low-poly: thân, đầu, hai tai, đuôi — một màu cho mỗi agent. */
function Meo({ ten, dich }: { ten: TenAgentVP; dich: Vector3 }) {
  const g = useRef<Group>(null);
  const mau = AGENT[ten].mau;
  const tam = useMemo(() => new Vector3(), []);
  useFrame((s, dt) => {
    const o = g.current;
    if (!o) return;
    tam.copy(dich).sub(o.position); tam.y = 0;
    const xa = tam.length();
    const buoc = Math.min(xa, 2.6 * Math.min(dt, 0.05));
    if (xa > 0.05) {
      tam.normalize();
      o.position.addScaledVector(tam, buoc);
      o.rotation.y = Math.atan2(tam.x, tam.z);
      o.position.y = Math.abs(Math.sin(s.clock.elapsedTime * 10)) * 0.08;
    } else {
      o.position.y = 0;
    }
  });
  return (
    <group ref={g} position={[dich.x - 3, 0, dich.z + 3]}>
      <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.45, 0.35, 0.7]} /><meshStandardMaterial color={mau} flatShading /></mesh>
      <mesh position={[0, 0.65, 0.35]}><boxGeometry args={[0.4, 0.34, 0.34]} /><meshStandardMaterial color={mau} flatShading /></mesh>
      <mesh position={[-0.12, 0.88, 0.38]}><coneGeometry args={[0.08, 0.16, 4]} /><meshStandardMaterial color={mau} flatShading /></mesh>
      <mesh position={[0.12, 0.88, 0.38]}><coneGeometry args={[0.08, 0.16, 4]} /><meshStandardMaterial color={mau} flatShading /></mesh>
      <mesh position={[-0.09, 0.68, 0.53]}><boxGeometry args={[0.06, 0.06, 0.02]} /><meshBasicMaterial color="#111827" /></mesh>
      <mesh position={[0.09, 0.68, 0.53]}><boxGeometry args={[0.06, 0.06, 0.02]} /><meshBasicMaterial color="#111827" /></mesh>
      <mesh position={[0, 0.55, -0.45]} rotation={[0.7, 0, 0]}><cylinderGeometry args={[0.04, 0.05, 0.5, 5]} /><meshStandardMaterial color={mau} flatShading /></mesh>
      {[[-0.15, 0.25], [0.15, 0.25], [-0.15, -0.25], [0.15, -0.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.09, z]}><boxGeometry args={[0.1, 0.18, 0.1]} /><meshStandardMaterial color={mau} flatShading /></mesh>
      ))}
    </group>
  );
}

export default function VanPhong3D({ khach, agent, chon, onChon }: {
  khach: KhachVanPhong[]; agent: AgentDangLam[]; chon: string | null; onChon: (id: string) => void;
}) {
  const n = khach.length;
  const cot = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, n) * 1.4)));
  const rongX = cot * KHOANG_X;
  const sauZ = Math.ceil(Math.max(1, n) / cot) * KHOANG_Z;
  // Góc nghỉ của mèo: phía trước bên trái dãy bàn.
  const goc = useMemo(() => new Vector3(-rongX / 2 - 0.5, 0, sauZ / 2 + 1.2), [rongX, sauZ]);
  const dich = useMemo(() => {
    const theoBan = new Map<string, number>();
    return agent.map((a, i) => {
      const iBan = a.company_id ? khach.findIndex((k) => k.id === a.company_id) : -1;
      if (iBan < 0) return new Vector3(goc.x + i * 0.9, 0, goc.z);
      const thu = theoBan.get(a.company_id!) ?? 0;
      theoBan.set(a.company_id!, thu + 1);
      const [x, z] = viTriBan(iBan, n);
      // Đứng cạnh trái bàn, mèo thứ hai đứng sau mèo thứ nhất.
      return new Vector3(x - 1.45, 0, z + 0.1 + thu * 0.75);
    });
  }, [agent, khach, n, goc]);
  // Máy ảnh vừa khít dãy bàn: xa theo bề rộng (hoặc bề sâu) lớn hơn.
  const xa = Math.max(7, Math.max(rongX, sauZ * 1.3) * 0.62 + 2.5);
  const rong = Math.max(rongX, sauZ) + 8;
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, xa * 0.8, xa * 0.85], fov: 45 }} gl={{ antialias: true, powerPreference: 'low-power' }}>
      <color attach="background" args={['#f1f5f9']} />
      <hemisphereLight args={['#ffffff', '#cbd5e1', 1.1]} />
      <directionalLight position={[6, 12, 8]} intensity={1.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[rong, rong]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[goc.x + 1.8, 0.01, goc.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 24]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>
      {/* Đổi số bàn (sang trang khác) thì dựng lại: InstancedMesh giữ sức chứa lúc tạo. */}
      <CacBan key={n} khach={khach} chon={chon} onChon={onChon} />
      {agent.map((a, i) => <Meo key={a.agent} ten={a.agent} dich={dich[i]} />)}
      <OrbitControls makeDefault enablePan={false} minDistance={5} maxDistance={xa * 2} maxPolarAngle={Math.PI / 2.3} />
    </Canvas>
  );
}
