import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Menu, Send } from 'lucide-react';
import { NHOM_CHI, docKhungGio, moTaKhungGio } from '@/lib/tacTu';
import { dinhDangTien } from '@/lib/tien';
import { tenNhomChi } from '@/lib/nhanDich';
import type { ChinhSachRow, TacTu } from '@/lib/kiemSoatChi';
import {
  CAC_LENH,
  LENH_CAN_AGENT,
  buocTiep,
  buocTruoc,
  docLenh,
  nhanTraLoi,
  thanLuuChinhSach,
  timAgent,
  type Buoc,
  type Lenh,
  type Nhap,
} from './hoiThoai';

/**
 * Tạo và điều khiển agent bằng hội thoại — kiểu BotFather của Telegram.
 *
 * VÌ SAO CÓ CẢ HỘI THOẠI LẪN FORM. Form đặt mọi ô trước mặt cùng lúc; người không
 * rành công nghệ không biết "ngưỡng cần duyệt" hay "khung giờ" là gì nên bỏ trống
 * hoặc điền bừa. Hội thoại hỏi từng câu, mỗi câu có nút gợi ý (bấm thay vì gõ) và
 * một dòng giải thích. Kết quả cuối vẫn là đúng các hành động máy chủ sẵn có —
 * xem `hoiThoai.ts`.
 *
 * NÚT CHỈ VẼ CHO CÂU HỎI ĐANG MỞ. Telegram giữ bàn phím trên từng tin; ở đây bàn
 * phím vẽ từ trạng thái hiện tại, nên không bấm được nút của một câu đã qua và
 * gửi nhầm giá trị cũ.
 *
 * THAO TÁC KHÔNG HOÀN TÁC (thu hồi, cấp khoá mới) luôn dừng ở một nút xác nhận
 * riêng, có tên agent trên nút. Khoá mới không bao giờ in vào khung chat — nó đi
 * lên khung "Khoá mới" của trang, nơi hiện đúng một lần như khi bấm nút thường.
 */

type Row = Record<string, unknown>;

interface Props {
  ds: TacTu[];
  chinhSach: Record<string, ChinhSachRow | undefined>;
  /** Gọi edge function `tac-tu`. Ném lỗi khi máy chủ từ chối. */
  goi: (hanhDong: string, du: Row) => Promise<Row>;
  /** Khoá vừa sinh — trang hiện nó một lần ở khung "Khoá mới". */
  khiCoKhoa: (ten: string, khoa: string) => void;
}

interface TinNhan {
  id: number;
  tu: 'mimi' | 'ban';
  chu: string;
}

interface Nut {
  nhan: string;
  gui: string;
  nguyHiem?: boolean;
  dangChon?: boolean;
}

type Cho =
  | { loai: 'thuhoi' | 'khoamoi'; agent: TacTu }
  | { loai: 'luuLai'; tacTuId: string; ten: string };

const nutGoc =
  'inline-flex min-h-9 items-center justify-center rounded-lg border px-3 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

let soTin = 0;
const tin = (tu: TinNhan['tu'], chu: string): TinNhan => ({ id: ++soTin, tu, chu });

const MOC_MOI_LAN = [500_000, 1_000_000, 2_000_000, 5_000_000];
const MOC_NGAY = [2_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000];
const MOC_THANG = [20_000_000, 50_000_000, 100_000_000, 200_000_000, 500_000_000];
const MOC_NGUONG = [500_000, 1_000_000, 2_000_000];
const MOC_NGUOI_NHAN = [5_000_000, 10_000_000, 20_000_000];

export default function TaoAgentHoiThoai({ ds, chinhSach, goi, khiCoKhoa }: Props) {
  const { t: tr } = useTranslation();
  const [dsTin, setDsTin] = useState<TinNhan[]>(() => [tin('mimi', tr('app.tacTu.hoiThoai.chao'))]);
  const [buoc, setBuoc] = useState<Buoc | null>(null);
  const [nhap, setNhap] = useState<Nhap>({});
  const [nhomTam, setNhomTam] = useState<string[]>([]);
  const [cho, setCho] = useState<Cho | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [go, setGo] = useState('');
  const [moMenu, setMoMenu] = useState(false);
  const cuoi = useRef<HTMLDivElement>(null);
  /** Lệnh cần agent mà chưa rõ agent nào: bàn phím liệt kê agent để bấm. */
  const [chonAgent, setChonAgent] = useState<{ lenh: Lenh; ds: TacTu[] } | null>(null);
  /** Câu trả lời của lần bấm "Tạo agent" cuối — để "Lưu lại chính sách" không cần hỏi lại. */
  const nhapDaGui = useRef<Nhap>({});

  const dangDung = useMemo(() => ds.filter((a) => a.trang_thai !== 'thu_hoi'), [ds]);

  useEffect(() => {
    cuoi.current?.scrollIntoView?.({ block: 'nearest' });
  }, [dsTin]);

  const noi = (...chu: string[]) => setDsTin((cu) => [...cu, ...chu.map((c) => tin('mimi', c))]);
  const loiCua = (e: unknown) => (e instanceof Error ? e.message : tr('app.chung.khongThucHienDuoc'));

  /* ── Câu hỏi của từng bước ──────────────────────────────────────── */
  const cauHoi = (b: Buoc, n: Nhap): string => {
    if (b === 'xacNhan') return tomTat(n);
    return tr(`app.tacTu.hoiThoai.hoi.${b}`, { ten: n.ten ?? '' });
  };

  const tomTat = (n: Nhap): string => {
    const dongTom = [
      tr('app.tacTu.hoiThoai.tom.tieuDe', { ten: n.ten }),
      tr('app.tacTu.hoiThoai.tom.nhom', { v: n.nhom ? n.nhom.map(tenNhomChi).join(', ') : tr('app.tacTu.hoiThoai.moiNhom') }),
      tr('app.tacTu.hoiThoai.tom.hanMuc', { moiLan: dinhDangTien(n.moiLan), ngay: dinhDangTien(n.ngay), thang: dinhDangTien(n.thang) }),
      tr('app.tacTu.hoiThoai.tom.nguong', {
        v: n.nguong === 0 ? tr('app.tacTu.hoiThoai.moiKhoan') : tr('app.tacTu.hoiThoai.tren', { tien: dinhDangTien(n.nguong) }),
      }),
      tr('app.tacTu.hoiThoai.tom.nguoiNhan', { v: n.chiNguoiDaDuyet ? tr('app.tacTu.hoiThoai.nguoiLaTuChoi') : tr('app.tacTu.hoiThoai.nguoiLaHoi') }),
      tr('app.tacTu.hoiThoai.tom.tranNguoiNhan', { v: n.tranNguoiNhan ? dinhDangTien(n.tranNguoiNhan) : tr('app.tacTu.hoiThoai.khongGioiHan') }),
      tr('app.tacTu.hoiThoai.tom.khungGio', {
        v: n.khungGio
          ? `${moTaKhungGio(n.khungGio)} · ${tr(`app.tacTu.hoiThoai.ngoaiGio.${n.ngoaiGio ?? 'cho_duyet'}`)}`
          : tr('app.tacTu.hoiThoai.moiLuc'),
      }),
      tr('app.tacTu.hoiThoai.tom.hetHan', {
        v: n.hetHanNgay ? tr('app.tacTu.hoiThoai.sauNgay', { n: n.hetHanNgay }) : tr('app.tacTu.hoiThoai.khongHetHan'),
      }),
      tr('app.tacTu.hoiThoai.tom.cuoi'),
    ];
    return dongTom.join('\n');
  };

  const sangBuoc = (b: Buoc, n: Nhap) => {
    setBuoc(b);
    if (b === 'nhom') setNhomTam(n.nhom ?? []);
    noi(cauHoi(b, n));
  };

  const xongHoi = () => {
    setBuoc(null);
    setNhap({});
    setNhomTam([]);
  };

  /* ── Gọi máy chủ ────────────────────────────────────────────────── */
  const luuChinhSach = async (tacTuId: string, ten: string, n: Nhap) => {
    try {
      await goi('luu_chinh_sach', thanLuuChinhSach(n, tacTuId));
      setCho(null);
      noi(tr('app.tacTu.hoiThoai.xong', { ten }));
    } catch (e) {
      // Agent đã có, chính sách thì chưa: máy chủ để nó ở chính sách mặc định chặt nhất
      // (mọi khoản phải duyệt). Nói thẳng, và cho thử lưu lại mà không tạo agent thứ hai.
      setCho({ loai: 'luuLai', tacTuId, ten });
      noi(tr('app.tacTu.hoiThoai.chuaLuu', { ten, loi: loiCua(e) }));
    }
  };

  const taoAgent = async () => {
    if (!nhap.ten) return;
    setDangGui(true);
    try {
      let kq: Row;
      try {
        kq = await goi('tao_tac_tu', { ten: nhap.ten, mo_ta: null });
      } catch (e) {
        noi(tr('app.tacTu.hoiThoai.khongTao', { loi: loiCua(e) }));
        return;
      }
      const tt = kq.tac_tu as { id: string } | undefined;
      if (typeof kq.khoa === 'string') khiCoKhoa(nhap.ten, kq.khoa);
      noi(tr('app.tacTu.hoiThoai.daTao', { ten: nhap.ten }));
      const n = nhap;
      xongHoi();
      if (tt?.id) await luuChinhSach(tt.id, n.ten as string, n);
    } finally {
      setDangGui(false);
    }
  };

  const lamVoiAgent = async (lenh: Lenh, a: TacTu) => {
    switch (lenh) {
      case 'hanmuc': {
        const cs = chinhSach[a.id] as (ChinhSachRow & Row) | undefined;
        if (!cs) return noi(tr('app.tacTu.hoiThoai.chuaCoCs', { ten: a.ten }));
        const k = docKhungGio(cs.khung_gio_chi);
        const tran = cs.han_muc_moi_nguoi_nhan_thang as number | null | undefined;
        return noi([
          tr('app.tacTu.hoiThoai.tom.tieuDeCo', { ten: a.ten, tt: tr(`app.tacTu.ttAgent.${a.trang_thai}`) }),
          tr('app.tacTu.hoiThoai.tom.nhom', { v: cs.nhom_chi_duoc_phep ? cs.nhom_chi_duoc_phep.map(tenNhomChi).join(', ') : tr('app.tacTu.hoiThoai.moiNhom') }),
          tr('app.tacTu.hoiThoai.tom.hanMuc', { moiLan: dinhDangTien(cs.han_muc_moi_lan), ngay: dinhDangTien(cs.han_muc_ngay), thang: dinhDangTien(cs.han_muc_thang) }),
          tr('app.tacTu.hoiThoai.tom.nguong', {
            v: Number(cs.nguong_can_duyet) === 0 ? tr('app.tacTu.hoiThoai.moiKhoan') : tr('app.tacTu.hoiThoai.tren', { tien: dinhDangTien(cs.nguong_can_duyet) }),
          }),
          tr('app.tacTu.hoiThoai.tom.nguoiNhan', { v: cs.chi_tra_nguoi_nhan_da_duyet ? tr('app.tacTu.hoiThoai.nguoiLaTuChoi') : tr('app.tacTu.hoiThoai.nguoiLaHoi') }),
          tr('app.tacTu.hoiThoai.tom.tranNguoiNhan', { v: tran ? dinhDangTien(tran) : tr('app.tacTu.hoiThoai.khongGioiHan') }),
          tr('app.tacTu.hoiThoai.tom.khungGio', {
            v: k && k !== 'sai'
              ? `${moTaKhungGio(k)} · ${tr(`app.tacTu.hoiThoai.ngoaiGio.${cs.ngoai_khung_gio === 'tu_choi' ? 'tu_choi' : 'cho_duyet'}`)}`
              : tr('app.tacTu.hoiThoai.moiLuc'),
          }),
        ].join('\n'));
      }
      case 'tamdung':
      case 'batlai': {
        const moi = lenh === 'tamdung' ? 'tam_dung' : 'hoat_dong';
        if (a.trang_thai === moi) return noi(tr(`app.tacTu.hoiThoai.daLa.${moi}`, { ten: a.ten }));
        setDangGui(true);
        try {
          await goi('doi_trang_thai', { tac_tu_id: a.id, trang_thai: moi });
          noi(tr(`app.tacTu.hoiThoai.daDoi.${moi}`, { ten: a.ten }));
        } catch (e) {
          noi(tr('app.tacTu.hoiThoai.loi', { loi: loiCua(e) }));
        } finally {
          setDangGui(false);
        }
        return;
      }
      case 'thuhoi':
      case 'khoamoi':
        setCho({ loai: lenh, agent: a });
        return noi(tr(`app.tacTu.hoiThoai.canhBao.${lenh}`, { ten: a.ten }));
      default:
        return;
    }
  };

  const xacNhanNguyHiem = async () => {
    if (!cho || cho.loai === 'luuLai') return;
    const { loai, agent: a } = cho;
    setCho(null);
    setDangGui(true);
    try {
      if (loai === 'thuhoi') {
        await goi('doi_trang_thai', { tac_tu_id: a.id, trang_thai: 'thu_hoi' });
        noi(tr('app.tacTu.hoiThoai.daThuHoi', { ten: a.ten }));
      } else {
        const kq = await goi('xoay_khoa', { tac_tu_id: a.id });
        if (typeof kq.khoa === 'string') khiCoKhoa(a.ten, kq.khoa);
        noi(tr('app.tacTu.hoiThoai.daCapKhoa', { ten: a.ten }));
      }
    } catch (e) {
      noi(tr('app.tacTu.hoiThoai.loi', { loi: loiCua(e) }));
    } finally {
      setDangGui(false);
    }
  };

  /* ── Lệnh ───────────────────────────────────────────────────────── */
  const chayLenh = async (lenh: Lenh, thamSo: string) => {
    switch (lenh) {
      case 'huy':
        if (!buoc && !cho) return noi(tr('app.tacTu.hoiThoai.khongCoGiHuy'));
        xongHoi();
        setCho(null);
        return noi(tr('app.tacTu.hoiThoai.daHuy'));
      case 'quaylai':
        if (!buoc || buoc === 'ten') return noi(tr('app.tacTu.hoiThoai.khongQuayLai'));
        return sangBuoc(buocTruoc(buoc, nhap), nhap);
      case 'taoagent': {
        setCho(null);
        setNhap({});
        const ten = thamSo.trim();
        // "/taoagent Agent quảng cáo" như /newbot kèm tên: bỏ qua câu hỏi tên.
        if (ten) {
          const kq = nhanTraLoi('ten', ten, {});
          if (kq.ok) {
            setNhap(kq.nhap);
            return sangBuoc('nhom', kq.nhap);
          }
        }
        return sangBuoc('ten', {});
      }
      case 'danhsach':
        if (!dangDung.length) return noi(tr('app.tacTu.hoiThoai.chuaCoAgent'));
        return noi(
          [tr('app.tacTu.hoiThoai.dsTieuDe', { n: dangDung.length }),
            ...dangDung.map((a) => `• ${a.ten} — ${tr(`app.tacTu.ttAgent.${a.trang_thai}`)}`)].join('\n'),
        );
      case 'trogiup':
        return noi([tr('app.tacTu.hoiThoai.lenhTieuDe'), ...CAC_LENH.map((l) => `/${l} — ${tr(`app.tacTu.hoiThoai.lenh.${l}`)}`)].join('\n'));
      default: {
        if (!LENH_CAN_AGENT.has(lenh)) return;
        const ketQua = thamSo ? timAgent(dangDung, thamSo) : [];
        if (ketQua.length === 1) return lamVoiAgent(lenh, ketQua[0]);
        if (!dangDung.length) return noi(tr('app.tacTu.hoiThoai.chuaCoAgent'));
        setChonAgent({ lenh, ds: ketQua.length > 1 ? ketQua : dangDung });
        return noi(
          thamSo && !ketQua.length
            ? tr('app.tacTu.hoiThoai.khongThayAgent', { ten: thamSo })
            : tr('app.tacTu.hoiThoai.chonAgent'),
        );
      }
    }
  };

  /** Một câu từ người dùng — gõ hay bấm nút đều đi qua đây. `hien` là chữ in lên khung chat. */
  const gui = async (giaTri: string, hien?: string) => {
    const v = giaTri.trim();
    if (!v || dangGui) return;

    // Bấm chọn nhóm: đổi trạng thái nút, không in tin.
    if (v.startsWith('chon:')) {
      const n = v.slice(5);
      setNhomTam((cu) => (cu.includes(n) ? cu.filter((x) => x !== n) : [...cu, n]));
      return;
    }

    setDsTin((cu) => [...cu, tin('ban', hien ?? v)]);
    setChonAgent(null);

    const l = docLenh(v);
    if (l) {
      // Thu hẹp bằng `in`: repo không bật strictNullChecks nên `lenh === null` không thu hẹp được kiểu.
      if ('ten' in l) return noi(tr('app.tacTu.hoiThoai.lenhLa', { ten: l.ten }));
      return chayLenh(l.lenh, l.thamSo);
    }

    if (v.startsWith('agent:')) {
      const [, lenh, id] = v.split(':');
      const a = dangDung.find((x) => x.id === id);
      if (a) return lamVoiAgent(lenh as Lenh, a);
      return;
    }

    if (cho) {
      if (v === 'thoi') {
        setCho(null);
        return noi(tr('app.tacTu.hoiThoai.daHuy'));
      }
      if (cho.loai === 'luuLai' && v === 'luu_lai') {
        setDangGui(true);
        try {
          // Lưu lại dùng câu trả lời đã giữ trong `nhapDaGui`.
          await luuChinhSach(cho.tacTuId, cho.ten, nhapDaGui.current);
        } finally {
          setDangGui(false);
        }
        return;
      }
      if (cho.loai !== 'luuLai' && v === `xac_nhan:${cho.agent.id}`) return xacNhanNguyHiem();
      // Gõ chữ khác khi đang chờ xác nhận: không đoán ý — nhắc phải bấm nút.
      if (cho.loai !== 'luuLai') return noi(tr('app.tacTu.hoiThoai.canBamNut'));
    }

    if (!buoc) return noi(tr('app.tacTu.hoiThoai.chuaHieu'));

    if (buoc === 'xacNhan') {
      if (v === 'tao') {
        nhapDaGui.current = nhap;
        return taoAgent();
      }
      return noi(tr('app.tacTu.hoiThoai.canBamNut'));
    }

    // Bước nhóm: nút "Xong" gửi các nhóm đang chọn.
    const traLoi = buoc === 'nhom' && v === 'xong_nhom' ? nhomTam.join(',') : v;
    const kq = nhanTraLoi(buoc, traLoi, nhap);
    if ('loi' in kq) return noi(tr(`app.tacTu.hoiThoai.loiNhap.${kq.loi}`));
    setNhap(kq.nhap);
    sangBuoc(buocTiep(buoc, kq.nhap), kq.nhap);
  };

  /* ── Bàn phím của câu đang mở ───────────────────────────────────── */
  const banPhim = useMemo((): Nut[][] => {
    const tien = (n: number): Nut => ({ nhan: dinhDangTien(n), gui: String(n) });
    if (chonAgent) {
      return [chonAgent.ds.map((a) => ({ nhan: a.ten, gui: `agent:${chonAgent.lenh}:${a.id}` }))];
    }
    if (cho?.loai === 'luuLai') {
      return [[{ nhan: tr('app.tacTu.hoiThoai.nut.luuLai'), gui: 'luu_lai' }, { nhan: tr('app.tacTu.hoiThoai.nut.thoi'), gui: 'thoi' }]];
    }
    if (cho) {
      return [[
        { nhan: tr(`app.tacTu.hoiThoai.nut.${cho.loai}`, { ten: cho.agent.ten }), gui: `xac_nhan:${cho.agent.id}`, nguyHiem: cho.loai === 'thuhoi' },
        { nhan: tr('app.tacTu.hoiThoai.nut.thoi'), gui: 'thoi' },
      ]];
    }
    if (!buoc) {
      return [[
        { nhan: tr('app.tacTu.hoiThoai.nut.taoAgent'), gui: '/taoagent' },
        { nhan: tr('app.tacTu.hoiThoai.nut.danhSach'), gui: '/danhsach' },
        { nhan: tr('app.tacTu.hoiThoai.nut.troGiup'), gui: '/trogiup' },
      ]];
    }
    const dieuHuong: Nut[] = [
      ...(buoc !== 'ten' ? [{ nhan: tr('app.tacTu.hoiThoai.nut.quayLai'), gui: '/quaylai' }] : []),
      { nhan: tr('app.tacTu.hoiThoai.nut.huy'), gui: '/huy' },
    ];
    const hang = (ds: Nut[]) => [ds, dieuHuong];
    switch (buoc) {
      case 'ten':
        return [dieuHuong];
      case 'nhom':
        return [
          NHOM_CHI.map((n) => ({ nhan: tenNhomChi(n), gui: `chon:${n}`, dangChon: nhomTam.includes(n) })),
          [
            { nhan: tr('app.tacTu.hoiThoai.nut.xongNhom', { n: nhomTam.length }), gui: 'xong_nhom' },
            { nhan: tr('app.tacTu.hoiThoai.moiNhom'), gui: 'moi_nhom' },
          ],
          dieuHuong,
        ];
      case 'moiLan':
        return hang(MOC_MOI_LAN.map(tien));
      case 'ngay':
        return hang(MOC_NGAY.filter((n) => n >= (nhap.moiLan ?? 0)).map(tien));
      case 'thang':
        return hang(MOC_THANG.filter((n) => n >= (nhap.ngay ?? 0)).map(tien));
      case 'nguong':
        return hang([
          { nhan: tr('app.tacTu.hoiThoai.moiKhoan'), gui: '0' },
          ...MOC_NGUONG.filter((n) => n <= (nhap.moiLan ?? Infinity)).map(tien),
        ]);
      case 'nguoiNhan':
        return hang([
          { nhan: tr('app.tacTu.hoiThoai.nut.chiNguoiDaDuyet'), gui: 'co' },
          { nhan: tr('app.tacTu.hoiThoai.nut.nguoiLaHoi'), gui: 'khong' },
        ]);
      case 'tranNguoiNhan':
        return hang([
          { nhan: tr('app.tacTu.hoiThoai.khongGioiHan'), gui: 'khong_gioi_han' },
          ...MOC_NGUOI_NHAN.filter((n) => n <= (nhap.thang ?? Infinity)).map(tien),
        ]);
      case 'khungGio':
        return hang([
          { nhan: tr('app.tacTu.hoiThoai.nut.ngayThuong'), gui: 'ngay_thuong' },
          { nhan: tr('app.tacTu.hoiThoai.nut.moiNgay'), gui: 'moi_ngay' },
          { nhan: tr('app.tacTu.hoiThoai.moiLuc'), gui: 'moi_luc' },
        ]);
      case 'ngoaiGio':
        return hang([
          { nhan: tr('app.tacTu.hoiThoai.ngoaiGio.cho_duyet'), gui: 'cho_duyet' },
          { nhan: tr('app.tacTu.hoiThoai.ngoaiGio.tu_choi'), gui: 'tu_choi' },
        ]);
      case 'hetHan':
        return hang([
          { nhan: tr('app.tacTu.hoiThoai.sauNgay', { n: 30 }), gui: '30' },
          { nhan: tr('app.tacTu.hoiThoai.sauNgay', { n: 90 }), gui: '90' },
          { nhan: tr('app.tacTu.hoiThoai.sauNgay', { n: 365 }), gui: '365' },
          { nhan: tr('app.tacTu.hoiThoai.khongHetHan'), gui: 'khong_het_han' },
        ]);
      case 'xacNhan':
        return hang([{ nhan: tr('app.tacTu.hoiThoai.nut.tao'), gui: 'tao' }]);
    }
  }, [buoc, nhap, nhomTam, cho, chonAgent, tr]);

  const guiForm = (e: FormEvent) => {
    e.preventDefault();
    const v = go;
    setGo('');
    void gui(v);
  };

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card" data-mimi="tac-tu.hoi-thoai">
      <div
        role="log"
        aria-live="polite"
        aria-label={tr('app.tacTu.hoiThoai.khung')}
        className="max-h-96 min-h-48 space-y-2 overflow-y-auto p-3"
      >
        {dsTin.map((m) => (
          <p
            key={m.id}
            className={`max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm ${
              m.tu === 'ban' ? 'ml-auto bg-foreground text-background' : 'bg-accent text-foreground'
            }`}
          >
            {m.chu}
          </p>
        ))}
        {dangGui && (
          <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" aria-hidden /> {tr('app.tacTu.hoiThoai.dangLam')}
          </p>
        )}
        <div ref={cuoi} />
      </div>

      <div role="group" aria-label={tr('app.tacTu.hoiThoai.goiY')} className="space-y-1.5 border-t border-border p-3">
        {banPhim.map((hang, i) => (
          <div key={i} className="flex flex-wrap gap-1.5">
            {hang.map((n) => (
              <button
                key={n.gui}
                type="button"
                disabled={dangGui}
                aria-pressed={n.dangChon ?? undefined}
                onClick={() => void gui(n.gui, n.nhan)}
                // Nút làm thay đổi agent thật: con trỏ "MIMI làm hộ" không tự bấm.
                data-mimi-khong-tu-bam={n.gui.startsWith('xac_nhan') || n.gui === 'tao' ? '' : undefined}
                className={`${nutGoc} ${
                  n.nguyHiem
                    ? 'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : n.dangChon
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                }`}
              >
                {n.nhan}
              </button>
            ))}
          </div>
        ))}
      </div>

      {moMenu && (
        <ul aria-label={tr('app.tacTu.hoiThoai.lenhTieuDe')} className="max-h-56 overflow-y-auto border-t border-border text-sm">
          {CAC_LENH.map((l) => (
            <li key={l}>
              <button
                type="button"
                onClick={() => {
                  setMoMenu(false);
                  // Lệnh cần tên agent: điền sẵn vào ô để gõ tiếp, như Telegram.
                  if (LENH_CAN_AGENT.has(l)) setGo(`/${l} `);
                  else void gui(`/${l}`);
                }}
                className="flex w-full gap-2 px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="font-mono text-xs text-foreground">/{l}</span>
                <span className="text-xs text-muted-foreground">{tr(`app.tacTu.hoiThoai.lenh.${l}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={guiForm} className="flex items-center gap-2 border-t border-border p-2">
        <button
          type="button"
          onClick={() => setMoMenu((m) => !m)}
          aria-expanded={moMenu}
          aria-label={tr('app.tacTu.hoiThoai.menu')}
          className={`${nutGoc} border-border px-2.5`}
        >
          <Menu size={14} aria-hidden />
        </button>
        <label className="flex-1">
          <span className="sr-only">{tr('app.tacTu.hoiThoai.o')}</span>
          <input
            value={go}
            onChange={(e) => setGo(e.target.value)}
            placeholder={tr('app.tacTu.hoiThoai.oPh')}
            maxLength={200}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button type="submit" disabled={dangGui || !go.trim()} aria-label={tr('app.tacTu.hoiThoai.gui')} className={`${nutGoc} border-foreground bg-foreground px-2.5 text-background`}>
          <Send size={14} aria-hidden />
        </button>
      </form>
    </div>
  );
}
