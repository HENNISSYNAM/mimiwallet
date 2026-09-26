/**
 * MIMI Assistant — một ô hỏi cho mọi việc tài chính của doanh nghiệp.
 *
 * Người dùng chỉ thấy một trợ lý; phía sau là các năng lực (`_shared/tro-ly/tinh-toan.ts`)
 * chia 7 nhóm: trợ lý & agent, chi phí, hoá đơn & chứng từ, ngân hàng & đối soát, AI &
 * token, báo cáo, kết nối. Luồng: câu hỏi → hiểu → đọc dữ liệu → tính → đề xuất → người
 * dùng xác nhận trên màn hình → giao diện gọi đúng backend đã có (tac-tu, chi-phi-ai,
 * bank-link, hoặc `luu_chung_tu` ở đây).
 *
 * HAI CHẾ ĐỘ HIỂU CÂU HỎI:
 *   - `mo_hinh`: có `LOVABLE_API_KEY` (hoặc `OPENROUTER_API_KEY`) → mô hình chọn năng lực và viết lời (`mo-hinh.ts`).
 *   - `co_dinh`: không có khoá, hoặc cổng lỗi → bộ nhận ý định (`y-dinh.ts`). Tới 15/09/2026
 *     production chưa có khoá nên đây là đường đang chạy.
 *
 * HÀNH ĐỘNG. Function này KHÔNG duyệt, không đồng bộ, không đổi agent — chỉ trả đề xuất.
 * Việc duy nhất nó ghi là chứng từ quét người dùng đã xác nhận (`luu_chung_tu`).
 *
 * Chỉ chủ doanh nghiệp (JWT). Đọc bằng service role, luôn lọc theo công ty đang dùng.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { danhSachCongTy, kiemQuyen, LoiQuyen, resolveCompanyVaiTro } from "../_shared/company.ts";
import { cauTuChoi, type HanhDong, type VaiTro } from "../_shared/quyen/vai-tro.ts";
import { deXuatDuocPhep, locDeXuat, locPhanTich } from "../_shared/quyen/loc-de-xuat.ts";
import { NHOM_NANG_LUC } from "../_shared/tro-ly/kieu.ts";
import type { BangChung, DeXuat, DoDayNguon, KetQuaNangLuc, LoaiBangChung, NhomNangLuc, TraLoi } from "../_shared/tro-ly/kieu.ts";
import { apDoDay, danhGiaDoDay, trangThaiChung } from "../_shared/tro-ly/do-day.ts";
import { docLichSu as docLichSuChi, quetCongTy, TRAN_DONG as TRAN_DONG_BAT_THUONG } from "../_shared/bat-thuong/doc-db.ts";
import { chuanSoTaiKhoan, dauHieuHoanCanh, kiemKhoan, mucDoChung } from "../_shared/bat-thuong/phat-hien.ts";
import { coBangChungMayChu, doiChieuQuyetDinh, PHUT_TREO } from "../_shared/doi-soat/quyet-dinh.ts";
import { nhanYDinh } from "../_shared/tro-ly/y-dinh.ts";
import { chonNguon, type DoanLuat } from "../_shared/luat/nguon-luat.ts";
import { dungTraLoi } from "../_shared/tro-ly/tra-loi.ts";
import { docAnhChungTu, docKetQuaQuet, giaiMaAnh, hoiMoHinh, kiemAnh, LoiMoHinh, type TinNhanCu } from "../_shared/tro-ly/mo-hinh.ts";
import {
  congNgay,
  danhSachKetNoi,
  duLieuTrong,
  NANG_LUC,
  phanTichNhanh,
  SO_THANG_BIEU_DO_AI,
  thangLui,
  viecHomNay,
  type DuLieu,
  type NguonCan,
} from "../_shared/tro-ly/tinh-toan.ts";
import { khoangNgayKyKeKhai, kyKeKhaiKeTiep, lucGioVietNam } from "../_shared/thue/han-ke-khai.ts";
import { CAN_CU, suyLuan } from "../_shared/luat/he-luat.ts";
import { docHieuLuc, kiemCanCu } from "../_shared/luat/doc-can-cu.ts";
import { nhanHieuLuc } from "../_shared/luat/hieu-luc.ts";
import { docDoanhThuQuy, docHoSo, dungSuKien } from "../_shared/luat/doc-su-kien.ts";
import { docLichCongTy } from "../_shared/luat/doc-lich-thue.ts";
import { docHanhTrinh, dsHanhTrinhDangMo, LoiHanhTrinh, type HanhTrinhDay } from "../_shared/hanh-trinh/luu.ts";
import {
  danhDauBuocViec, docChiTietViec, dsViecCanLam, ghiNhanDaNop as ghiNhanDaNopViec, ghiNhanPhanHoi, huyViec, LoiViec, moViecHanhTrinh, traLoiViec,
} from "../_shared/viec/luu.ts";
import { xuLyChatViec } from "../_shared/viec/chat-viec.ts";
import { laLoaiHanhTrinh, nhanHanhTrinh, type TrangThaiBuoc } from "../_shared/hanh-trinh/dong-co.ts";
import { dsTaiLieu, duyetTaiLieu, ghiNhanDaNop, LoiTaiLieu, moTaiLieu, taoTaiLieu, type KetQuaDuyet } from "../_shared/tai-lieu/luu.ts";
import { congVanGiaiTrinh, goiBangChung, goiSanSangThue, memoTaiChinh, type BanDung } from "../_shared/tai-lieu/tao.ts";
import { phanTichChenhLech } from "../_shared/phan-tich/chenh-lech.ts";
import { ghepTienVe } from "../_shared/doi-soat/cham-diem.ts";
import { docHet } from "../_shared/doc-het.ts";
import { dungNguCanh, nguCanhChoMoHinh } from "../_shared/tro-ly/ngu-canh.ts";
import { chuanBiNop, dsYeuCauNop, ghiDaNop, ghiKetQua, huyNop, kiemTruocKhiNop, LoiNop, xacNhanNop } from "../_shared/thuc-thi/luu.ts";
import { chonCongMoHinh, coDo, nhaCungCapCua, type LanGoi } from "../_shared/ai/nha-cung-cap.ts";
import { duocLam } from "../_shared/quyen/vai-tro.ts";
import { chonThuTuc } from "../_shared/tro-ly/thu-tuc.ts";
import { ngayHopLe } from "../_shared/ngay.ts";
import { cauHinhXInvoice, dongBoMstCongTy } from "../_shared/mst/tra-cuu.ts";
import { congTyLaDemo, locMinhHoa } from "../_shared/minh-hoa.ts";
import { chieuTien, doLonTien } from "../_shared/tien/chieu-tien.ts";
import { LECH_TIEN } from "../_shared/chung-tu/khop-chung-tu.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const loi = (ma: string, cau: string, status: number) => json({ error: cau, ma }, status);

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

const KICH_THUOC_THAN_TOI_DA = 8_000_000;

/**
 * Giới hạn mỗi người dùng, mỗi phút. Đủ rộng cho người thật bấm liên tục, đủ chặt để một
 * phiên bị chiếm không dò hết dữ liệu hay đốt hạn mức mô hình. Lỗi đếm (ví dụ migration chưa
 * chạy) thì cho qua và ghi log — không khoá người dùng thật vì lỗi hạ tầng.
 */
const GIOI_HAN: Record<string, { cuaSoGiay: number; toiDa: number }> = {
  hoi: { cuaSoGiay: 60, toiDa: 30 },
  quet_chung_tu: { cuaSoGiay: 60, toiDa: 10 },
  luu_chung_tu: { cuaSoGiay: 60, toiDa: 30 },
  xoa_chung_tu: { cuaSoGiay: 60, toiDa: 30 },
  boi_canh: { cuaSoGiay: 60, toiDa: 60 },
  bang_chung: { cuaSoGiay: 60, toiDa: 60 },
  xac_nhan: { cuaSoGiay: 60, toiDa: 30 },
  ket_qua_quyet_dinh: { cuaSoGiay: 60, toiDa: 60 },
  trang_thai: { cuaSoGiay: 60, toiDa: 120 },
  bat_thuong: { cuaSoGiay: 60, toiDa: 30 },
  kiem_truoc_khi_chuyen: { cuaSoGiay: 60, toiDa: 20 },
  gan_nhan_chi: { cuaSoGiay: 60, toiDa: 120 },
};

const NGAY_LICH_SU = 180;

/**
 * MIMI-P1-001 — bảng nào giữ bản ghi của loại bằng chứng nào, và cột nào đủ để người đọc nhận ra
 * bản ghi đó. Mọi truy vấn đều lọc `company_id`: id của công ty khác không bao giờ trả về gì.
 */
const BANG_BANG_CHUNG: Record<Exclude<LoaiBangChung, "van_ban_luat">, { bang: string; cot: string }> = {
  giao_dich: { bang: "transactions", cot: "id, transaction_date, amount, type, merchant_name, counter_account_name, payment_reference, category" },
  hoa_don_vao: { bang: "gdt_invoices", cot: "id, invoice_number, issued_at, total_amount, counterparty_name, counterparty_tax_code" },
  hoa_don_ban: { bang: "invoices", cot: "id, invoice_number, client_name, issued_date, due_date, total, status" },
  yeu_cau_chi: { bang: "yeu_cau_chi", cot: "id, created_at, so_tien, ten_nguoi_nhan, muc_dich, trang_thai" },
  chung_tu_quet: { bang: "chung_tu_quet", cot: "id, ngay, tong_tien, ben_ban, so_hoa_don, giao_dich_id" },
  chi_phi_ai: { bang: "chi_phi_ai", cot: "id, ngay, nha_cung_cap, hang_muc, so_tien_usd, nguon" },
  token_ai: { bang: "token_ai", cot: "id, ngay, nha_cung_cap, model, token_vao, token_ra, so_lan_goi" },
};

const SO_BANG_CHUNG_MOI_LAN = 200;

/** Trạng thái hiện tại của yêu cầu chi mà một quyết định nhắm tới; null nếu không đọc được. */
async function trangThaiYeuCau(db: Db, companyId: string, loai: string, thamSo: Row | null): Promise<string | null> {
  if (!coBangChungMayChu(loai)) return null;
  const id = String(thamSo?.yeu_cau_id ?? "");
  if (!id) return null;
  const { data } = await db.from("yeu_cau_chi").select("trang_thai").eq("id", id).eq("company_id", companyId).maybeSingle();
  return data?.trang_thai ?? null;
}

/**
 * MIMI-P1-005: chốt các quyết định treo ở `cho_chay` quá PHUT_TREO phút (trình duyệt tắt giữa
 * chừng). Chạy khi mở màn đầu; mỗi lần tối đa 20 dòng. Hỏng thì bỏ qua — không làm hỏng màn đầu.
 */
async function donQuyetDinhTreo(db: Db, companyId: string): Promise<void> {
  try {
    const han = new Date(Date.now() - PHUT_TREO * 60_000).toISOString();
    const { data } = await db.from("nhat_ky_quyet_dinh").select("id, loai, tham_so")
      .eq("company_id", companyId).eq("ket_qua", "cho_chay").lt("xac_nhan_luc", han).limit(20);
    for (const q of (data ?? []) as Row[]) {
      const kl = doiChieuQuyetDinh({ loai: q.loai, baoOk: null, trangThai: await trangThaiYeuCau(db, companyId, q.loai, q.tham_so) });
      await db.from("nhat_ky_quyet_dinh")
        .update({ ket_qua: kl.ket_qua, ket_qua_cau: kl.cau, ma_loi: kl.ma_loi, xong_luc: new Date().toISOString() })
        .eq("id", q.id).eq("ket_qua", "cho_chay");
    }
  } catch (e) {
    console.error("don quyet dinh treo:", e instanceof Error ? e.message : e);
  }
}

/**
 * MIMI-P1-002 — lưu vết hội thoại.
 *
 * Ghi nội dung câu hỏi, câu trả lời, năng lực đã chạy, nguồn và độ đầy đủ, cùng danh sách đề xuất.
 * Danh sách đề xuất là bản chính thức: khi người dùng xác nhận, máy chủ tra lại đúng dòng này thay
 * vì tin tham số trình duyệt gửi lên.
 *
 * Hỏng thì không làm mất câu trả lời — nhưng hành động cần xác nhận sẽ không có nhật ký, và
 * `xac_nhan` chặn lại ở đó.
 */
async function ghiHoiThoai(db: Db, companyId: string, userId: string, cau: string, tl: TraLoi, moHinh: string | null): Promise<string | null> {
  try {
    const { data, error } = await db.from("hoi_thoai_tro_ly").insert({
      company_id: companyId,
      user_id: userId,
      cau_hoi: cau.slice(0, 1000),
      cau_tra_loi: tl.cau.slice(0, 20_000),
      che_do: tl.che_do,
      mo_hinh: moHinh,
      nang_luc: tl.ket_qua.map((r) => r.nang_luc),
      nguon: {
        nguon: [...new Set(tl.ket_qua.flatMap((r) => r.nguon.map((n) => n.ten)))],
        do_day: tl.ket_qua.flatMap((r) => r.do_day ?? []),
      },
      do_day: tl.do_day,
      de_xuat: tl.ket_qua.flatMap((r) => r.de_xuat),
    }).select("id").single();
    if (error) throw new Error(error.message);
    return String(data.id);
  } catch (e) {
    console.error("ghi hoi thoai:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Đề xuất chính thức theo khoá: lấy từ hội thoại đã lưu, hoặc dựng lại từ dữ liệu cho màn đầu. */
async function deXuatChinhThuc(
  db: Db,
  companyId: string,
  userId: string,
  khoa: string,
  hoiThoaiId: string | null,
  moc: ReturnType<typeof mocThoiGian>,
): Promise<{ dx: DeXuat; cauHoi: string } | null> {
  if (hoiThoaiId) {
    const { data, error } = await db.from("hoi_thoai_tro_ly")
      .select("cau_hoi, de_xuat").eq("id", hoiThoaiId).eq("company_id", companyId).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const dx = (Array.isArray(data.de_xuat) ? data.de_xuat : []).find((x: DeXuat) => x?.khoa === khoa);
    return dx ? { dx, cauHoi: String(data.cau_hoi ?? "") } : null;
  }
  // Màn đầu: không có hội thoại. Dựng lại đề xuất từ dữ liệu thật rồi tìm theo khoá — không nhận
  // tham số do trình duyệt gửi.
  const d = await docDuLieu(db, companyId, new Set<NguonCan>(["yeu_cau"]), moc);
  const dx = phanTichNhanh(d).can_xac_nhan.muc.map((m) => m.duyet).find((x): x is DeXuat => !!x && x.khoa === khoa);
  return dx ? { dx, cauHoi: "(việc trên màn đầu)" } : null;
}

/** Chuỗi chuẩn hoá của một bản ghi: khoá sắp xếp để cùng dữ liệu luôn ra cùng mã băm. */
function chuanHoaBanGhi(r: Row): string {
  return JSON.stringify(Object.keys(r).sort().map((k) => [k, r[k] ?? null]));
}

async function bamChuoi(chu: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(chu));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Gắn mã băm cho từng khối bằng chứng, tính trên chính các dòng đã dùng để ra con số.
 * Đổi dữ liệu sau khi trả lời → mã băm tính lại sẽ khác, nên câu trả lời cũ kiểm được.
 */
async function themMaBam(r: KetQuaNangLuc, d: DuLieu): Promise<KetQuaNangLuc> {
  const nguon: Record<string, readonly Row[]> = {
    giao_dich: d.giaoDich as unknown as Row[],
    hoa_don_vao: d.hoaDonVao as unknown as Row[],
    hoa_don_ban: d.hoaDonBan as unknown as Row[],
    yeu_cau_chi: d.yeuCau as unknown as Row[],
    chung_tu_quet: d.chungTuQuet as unknown as Row[],
    chi_phi_ai: d.chiPhiAi as unknown as Row[],
    token_ai: d.tokenAi as unknown as Row[],
  };
  const bam = async (bc: BangChung): Promise<BangChung> => {
    const ds = nguon[bc.loai];
    if (!ds) return bc;
    const theoId = new Map(ds.map((x) => [String(x.id), x]));
    const chu = bc.id.map((id) => theoId.get(id)).filter(Boolean).map((x) => chuanHoaBanGhi(x as Row)).join("\n");
    return chu ? { ...bc, ma_bam: await bamChuoi(chu) } : bc;
  };
  const the = await Promise.all(r.the.map(async (t) => {
    if (t.loai === "so_lieu") {
      return { ...t, muc: await Promise.all(t.muc.map(async (m) => (m.bang_chung?.length ? { ...m, bang_chung: await Promise.all(m.bang_chung.map(bam)) } : m))) };
    }
    if (t.loai === "bang" && t.bang_chung?.length) return { ...t, bang_chung: await Promise.all(t.bang_chung.map(bam)) };
    return t;
  }));
  return { ...r, the };
}
const TOI_DA_GIAO_DICH = 10_000;
const DO_DAI_CAU_HOI = 1000;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function mocThoiGian() {
  const vn = lucGioVietNam();
  const ky = kyKeKhaiKeTiep(vn);
  const khoang = khoangNgayKyKeKhai(ky);
  return { homNay: iso(vn), ky: { ...khoang, nhan: `quý ${ky.quy}/${ky.nam}` } };
}

/** Mọi lỗi truy vấn đều ném: truy vấn hỏng trông y hệt "không có dữ liệu", và trợ lý sẽ nói sai. */
function kiem<T>(r: { data: T; error: { message: string } | null }, ten: string): T {
  if (r.error) throw new Error(`Không đọc được ${ten}: ${r.error.message}`);
  return r.data;
}

const TRANG = 1000;

/**
 * Đọc hết theo trang tới `gioiHan`, kèm tổng số dòng khớp điều kiện (count exact, chỉ trang đầu).
 * MIMI-P0-002: tổng này là cách duy nhất biết truy vấn có bị cắt hay không — kể cả khi máy chủ
 * API tự giới hạn số dòng mỗi lần trả, thấp hơn con số ta xin.
 */
async function docTrang(
  taoTruyVan: (tu: number, den: number, dem: boolean) => PromiseLike<Row>,
  ten: string,
  gioiHan: number,
): Promise<{ dong: Row[]; tong: number | null }> {
  const dong: Row[] = [];
  let tong: number | null = null;
  for (let tu = 0; tu < gioiHan; tu += TRANG) {
    const den = Math.min(tu + TRANG, gioiHan) - 1;
    const r = await taoTruyVan(tu, den, tu === 0);
    const trang = kiem(r as { data: Row[]; error: { message: string } | null }, ten) as Row[];
    if (tu === 0) tong = typeof r.count === "number" ? r.count : null;
    dong.push(...trang);
    if (trang.length < den - tu + 1) break;
    if (tong !== null && dong.length >= tong) break;
  }
  return { dong, tong };
}

const dem = (co: boolean) => (co ? { count: "exact" as const } : undefined);

async function docGiaoDich(db: Db, companyId: string, tu: string, laDemo: boolean) {
  const { dong, tong } = await docTrang(
    // Không bao giờ để dữ liệu thử vào lời trợ lý — trừ công ty demo, nơi mọi dòng là minh hoạ.
    (a, b, c) => locMinhHoa(db.from("transactions")
      .select("id, amount, type, transaction_date, merchant_name, category, counter_account_name, payment_reference, is_synthetic", dem(c))
      .eq("company_id", companyId), laDemo)
      .gte("transaction_date", tu)
      .order("transaction_date", { ascending: true })
      .order("id", { ascending: true })
      .range(a, b),
    "giao dịch",
    TOI_DA_GIAO_DICH,
  );
  return { dong: dong.map((t): Row => ({ ...t, amount: Number(t.amount) })), tong };
}

/**
 * Tìm đoạn luật cho câu hỏi trong kho Công báo (`tim_phap_luat`). Chuyển từ function `chat`.
 * Lỗi hoặc quá 6 giây → null ("chưa tra được"), không phải [] ("kho không có"): hai điều khác nhau
 * với người hỏi luật.
 */
async function traKhoLuat(db: Db, cauHoi: string, homNay: string): Promise<{
  doan: DoanLuat[] | null;
  daLoai: { van_ban: string; nhan: string }[];
  chuaKiem: boolean;
}> {
  if (!cauHoi.trim()) return { doan: [], daLoai: [], chuaKiem: false };
  try {
    const { data, error } = await db
      .rpc("tim_phap_luat", { cau_hoi: cauHoi.slice(0, 500), so_ket_qua: 12 })
      .abortSignal(AbortSignal.timeout(6000));
    if (error) {
      console.error("tim_phap_luat:", error.message);
      return { doan: null, daLoai: [], chuaKiem: false };
    }
    const tho = (data ?? []) as DoanLuat[];
    // P0-003: bỏ văn bản kho ghi nhận chắc chắn đã hết hiệu lực TRƯỚC khi chọn nguồn, để chỗ
    // trống được nhường cho văn bản đang áp dụng.
    const hl = await docHieuLuc(db, tho.map((d) => d.so_hieu ?? "").filter(Boolean), homNay);
    const daLoai = new Map<string, string>();
    const conDung = tho.filter((d) => {
      const h = d.so_hieu && hl ? hl.get(d.so_hieu) : undefined;
      if (h?.trang_thai === "het_hieu_luc") {
        daLoai.set(d.so_hieu as string, nhanHieuLuc(h));
        return false;
      }
      return true;
    }).map((d) => {
      const h = d.so_hieu && hl ? hl.get(d.so_hieu) : undefined;
      // Ngày giữ chỗ của nguồn (1900-01-01) không bao giờ ra màn hình — xem `_shared/ngay.ts`.
      return { ...d, ngay_ban_hanh: ngayHopLe(d.ngay_ban_hanh), ngay_hieu_luc: ngayHopLe(d.ngay_hieu_luc), hieu_luc: h ? nhanHieuLuc(h) : undefined };
    });
    return {
      doan: chonNguon(conDung),
      daLoai: [...daLoai].map(([van_ban, nhan]) => ({ van_ban, nhan })),
      chuaKiem: hl === null,
    };
  } catch (e) {
    console.error("tra kho luat:", e instanceof Error ? e.message : e);
    return { doan: null, daLoai: [], chuaKiem: false };
  }
}

/** Đọc đúng những nguồn các năng lực cần. Một lần hỏi đọc mỗi nguồn nhiều nhất một lần. */
async function docDuLieu(
  db: Db,
  companyId: string,
  can: Set<NguonCan>,
  moc: ReturnType<typeof mocThoiGian>,
  tuyChon: { soThangAi?: number; cauHoi?: string; hanhTrinh?: DuLieu["hanhTrinh"] } = {},
): Promise<DuLieu> {
  const d = duLieuTrong(moc.homNay, moc.ky);
  d.cauHoi = tuyChon.cauHoi;
  d.hanhTrinh = tuyChon.hanhTrinh ?? null;
  const laDemo = await congTyLaDemo(db, companyId);
  const tuLichSu = [congNgay(moc.homNay, -NGAY_LICH_SU), moc.ky.tu].sort()[0];
  // Mặc định từ đầu tháng trước (so cùng kỳ) hoặc 31 ngày (token); biểu đồ màn đầu cần 5 tháng.
  const tuAi = [
    congNgay(moc.homNay, -31),
    `${thangLui(moc.homNay, Math.max(1, (tuyChon.soThangAi ?? 2) - 1))}-01`,
  ].sort()[0];
  const tu62 = congNgay(moc.homNay, -62);
  const viec: Promise<void>[] = [];

  if (can.has("giao_dich")) {
    viec.push(Promise.all([
      docGiaoDich(db, companyId, tuLichSu, laDemo),
      // Lần đồng bộ gần nhất của các tài khoản đọc sao kê: nguồn độ tươi của giao dịch.
      db.from("bank_connections").select("last_synced_at, scopes")
        .eq("company_id", companyId).eq("status", "connected").is("revoked_at", null),
    ]).then(([gd, kn]) => {
      d.giaoDich = gd.dong as DuLieu["giaoDich"];
      const ketNoi = (kiem(kn, "kết nối ngân hàng") as Row[]).filter((k) => (k.scopes ?? "transaction") === "transaction");
      d.doDay.giao_dich = danhGiaDoDay({
        nguon: "giao_dich", ten: "Giao dịch ngân hàng", daDoc: gd.dong.length, tong: gd.tong, gioiHan: TOI_DA_GIAO_DICH,
        tu: tuLichSu, den: moc.homNay,
        dongBoLuc: ketNoi.map((k) => k.last_synced_at).filter(Boolean).sort().at(-1) ?? null,
        canKetNoi: true, coKetNoi: ketNoi.length > 0,
      });
    }));
  }
  if (can.has("bat_thuong")) {
    // TCCN-01: cùng một hàm với màn Tổng quan (action `bat_thuong`), để hai nơi báo cùng một kết quả.
    viec.push(quetCongTy(db, companyId, moc.homNay, 30, laDemo).then((bt) => {
      d.batThuong = bt;
      d.doDay.bat_thuong = danhGiaDoDay({
        nguon: "bat_thuong", ten: "Lịch sử chi 180 ngày",
        daDoc: bt.lich_su_du ? bt.so_khoan_da_xet : TRAN_DONG_BAT_THUONG,
        tong: bt.lich_su_du ? bt.so_khoan_da_xet : null,
        gioiHan: TRAN_DONG_BAT_THUONG,
      });
    }));
  }
  if (can.has("hoa_don_vao")) {
    viec.push(docTrang(
      (a, b, c) => db.from("gdt_invoices")
        .select("id, total_amount, issued_at, invoice_number, counterparty_name, counterparty_tax_code", dem(c))
        .eq("company_id", companyId).eq("direction", "received").gte("issued_at", tuLichSu)
        .order("issued_at", { ascending: true }).order("id", { ascending: true }).range(a, b),
      "hoá đơn đầu vào", 5000,
    ).then(({ dong, tong }) => {
      d.hoaDonVao = dong.map((h) => ({ ...h, total_amount: Number(h.total_amount) })) as DuLieu["hoaDonVao"];
      d.doDay.hoa_don_vao = danhGiaDoDay({ nguon: "hoa_don_vao", ten: "Hoá đơn đầu vào", daDoc: dong.length, tong, gioiHan: 5000, tu: tuLichSu, den: moc.homNay });
    }));
  }
  if (can.has("hoa_don_ban")) {
    viec.push(docTrang(
      // Trợ lý khuyên việc dựa trên đây, nên hoá đơn demo phải ở ngoài công ty thật:
      // "2 hoá đơn quá hạn 235 triệu" tính từ dòng seed là một lời khuyên sai.
      (a, b, c) => locMinhHoa(db.from("invoices")
        .select("id, invoice_number, client_name, total, issued_date, due_date, status, is_synthetic", dem(c))
        .eq("company_id", companyId), laDemo).order("due_date", { ascending: true }).order("id", { ascending: true }).range(a, b),
      "hoá đơn bán ra", 5000,
    ).then(({ dong, tong }) => {
      d.hoaDonBan = dong.map((h) => ({ ...h, total: Number(h.total) })) as DuLieu["hoaDonBan"];
      d.doDay.hoa_don_ban = danhGiaDoDay({ nguon: "hoa_don_ban", ten: "Hoá đơn bán ra", daDoc: dong.length, tong, gioiHan: 5000 });
    }));
  }
  if (can.has("yeu_cau")) {
    const COT_YC = "id, tac_tu_id, so_tien, ten_nguoi_nhan, muc_dich, trang_thai, created_at, so_tien_thuc_chi, ly_do";
    viec.push(Promise.all([
      docTrang(
        (a, b, c) => db.from("yeu_cau_chi").select(COT_YC, dem(c))
          .eq("company_id", companyId).gte("created_at", `${tu62}T00:00:00Z`)
          .order("created_at", { ascending: true }).order("id", { ascending: true }).range(a, b),
        "yêu cầu chi", 5000,
      ),
      // Khoản chờ duyệt cũ hơn 62 ngày vẫn phải hiện.
      docTrang(
        (a, b, c) => db.from("yeu_cau_chi").select(COT_YC, dem(c))
          .eq("company_id", companyId).eq("trang_thai", "cho_duyet")
          .order("created_at", { ascending: true }).order("id", { ascending: true }).range(a, b),
        "yêu cầu chờ duyệt", 1000,
      ),
      db.from("tac_tu").select("id, ten, trang_thai").eq("company_id", companyId),
      db.from("chinh_sach_chi").select("tac_tu_id, han_muc_thang").eq("company_id", companyId),
    ]).then(([yc, cho, tt, cs]) => {
      const m = new Map<string, Row>();
      for (const y of [...yc.dong, ...cho.dong]) m.set(y.id, y);
      d.yeuCau = [...m.values()].map((y) => ({ ...y, so_tien: Number(y.so_tien), so_tien_thuc_chi: y.so_tien_thuc_chi == null ? null : Number(y.so_tien_thuc_chi) })) as DuLieu["yeuCau"];
      d.tacTu = kiem(tt, "agent") as DuLieu["tacTu"];
      d.chinhSach = (kiem(cs, "chính sách chi") as Row[]).map((c) => ({ ...c, han_muc_thang: Number(c.han_muc_thang) })) as DuLieu["chinhSach"];
      // Hai truy vấn gộp lại: bị cắt khi một trong hai bị cắt.
      const catNgan = (yc.tong ?? 0) > yc.dong.length || (cho.tong ?? 0) > cho.dong.length
        || (yc.tong === null && yc.dong.length >= 5000) || (cho.tong === null && cho.dong.length >= 1000);
      const daDoc = yc.dong.length + cho.dong.length;
      d.doDay.yeu_cau = danhGiaDoDay({
        nguon: "yeu_cau", ten: "Yêu cầu chi", daDoc,
        tong: catNgan ? Math.max(daDoc + 1, (yc.tong ?? 0) + (cho.tong ?? 0)) : daDoc,
        tu: tu62, den: moc.homNay,
      });
    }));
  }
  if (can.has("ket_noi_ngan_hang")) {
    viec.push(db.from("bank_connections")
      .select("id, bank_name, account_number, status, scopes, provider, last_synced_at", { count: "exact" })
      .eq("company_id", companyId).neq("status", "disconnected").is("revoked_at", null)
      .then((r: Row) => {
        d.ketNoiNganHang = kiem(r as { data: DuLieu["ketNoiNganHang"]; error: { message: string } | null }, "kết nối ngân hàng");
        d.doDay.ket_noi_ngan_hang = danhGiaDoDay({
          nguon: "ket_noi_ngan_hang", ten: "Kết nối ngân hàng", daDoc: d.ketNoiNganHang.length,
          tong: typeof r.count === "number" ? r.count : null,
        });
      }));
  }
  if (can.has("chi_phi_ai")) {
    viec.push(Promise.all([
      docTrang(
        (a, b, c) => db.from("chi_phi_ai").select("id, nha_cung_cap, ngay, hang_muc, so_tien_usd, nguon", dem(c))
          .eq("company_id", companyId).gte("ngay", tuAi)
          .order("ngay", { ascending: true }).order("id", { ascending: true }).range(a, b),
        "chi phí AI", 20000,
      ),
      db.from("ngan_sach_chi_phi_ai").select("han_muc_thang_usd, canh_bao_phan_tram").eq("company_id", companyId).maybeSingle(),
      db.from("ket_noi_chi_phi_ai").select("nha_cung_cap, trang_thai, dong_bo_luc, loi_cuoi").eq("company_id", companyId).neq("trang_thai", "da_go"),
      db.from("lo_nhap_chi_phi_ai").select("nha_cung_cap").eq("company_id", companyId).limit(500),
    ]).then(([cp, ns, kn, lo]) => {
      d.chiPhiAi = cp.dong.map((r) => ({ ...r, so_tien_usd: Number(r.so_tien_usd) })) as DuLieu["chiPhiAi"];
      const n = kiem(ns, "ngân sách AI") as Row | null;
      d.nganSachAi = n ? { han_muc_thang_usd: Number(n.han_muc_thang_usd), canh_bao_phan_tram: Number(n.canh_bao_phan_tram) } : null;
      d.ketNoiAi = kiem(kn, "kết nối AI") as DuLieu["ketNoiAi"];
      d.nhapFileAi = [...new Set((kiem(lo, "lần nhập file AI") as Row[]).map((r) => String(r.nha_cung_cap)))];
      // File nhập tay không có lần đồng bộ; độ tươi chỉ lấy từ kết nối API đang chạy.
      const dongBo = d.ketNoiAi.filter((k) => k.trang_thai !== "loi").map((k) => k.dong_bo_luc).filter(Boolean).sort().at(-1) ?? null;
      d.doDay.chi_phi_ai = danhGiaDoDay({
        nguon: "chi_phi_ai", ten: "Chi phí AI", daDoc: cp.dong.length, tong: cp.tong, gioiHan: 20000,
        tu: tuAi, den: moc.homNay, dongBoLuc: dongBo,
        canKetNoi: true, coKetNoi: d.ketNoiAi.length > 0 || d.nhapFileAi.length > 0,
      });
    }));
  }
  if (can.has("token_ai")) {
    const tu31 = congNgay(moc.homNay, -31);
    viec.push(docTrang(
      (a, b, c) => db.from("token_ai").select("id, nha_cung_cap, ngay, model, token_vao, token_vao_cache, token_ra, so_lan_goi", dem(c))
        .eq("company_id", companyId).gte("ngay", tu31)
        .order("ngay", { ascending: true }).order("id", { ascending: true }).range(a, b),
      "token AI", 20000,
    ).then(({ dong, tong }) => {
      d.tokenAi = dong.map((t) => ({
        ...t, token_vao: Number(t.token_vao), token_vao_cache: Number(t.token_vao_cache), token_ra: Number(t.token_ra), so_lan_goi: Number(t.so_lan_goi),
      })) as DuLieu["tokenAi"];
      d.doDay.token_ai = danhGiaDoDay({ nguon: "token_ai", ten: "Token AI", daDoc: dong.length, tong, gioiHan: 20000, tu: tu31, den: moc.homNay });
    }));
  }
  if (can.has("bang_gia")) {
    viec.push(docTrang(
      (a, b, c) => db.from("bang_gia_model").select("model_id, ten, gia_vao_usd_moi_trieu, gia_ra_usd_moi_trieu, lay_luc", dem(c))
        .order("model_id", { ascending: true }).range(a, b),
      "bảng giá model", 5000,
    ).then(({ dong, tong }) => {
      d.bangGia = dong.map((g) => ({ model_id: g.model_id, ten: g.ten, gia_vao_usd_moi_trieu: Number(g.gia_vao_usd_moi_trieu), gia_ra_usd_moi_trieu: Number(g.gia_ra_usd_moi_trieu) }));
      d.bangGiaLuc = dong.map((g) => String(g.lay_luc)).sort().at(-1) ?? null;
      d.doDay.bang_gia = danhGiaDoDay({ nguon: "bang_gia", ten: "Bảng giá model", daDoc: dong.length, tong, gioiHan: 5000 });
    }));
  }
  if (can.has("thue")) {
    viec.push((async () => {
      const [hs, dt] = await Promise.all([
        dongBoMstCongTy(db, companyId, cauHinhXInvoice()).then(() => docHoSo(db, companyId)),
        docDoanhThuQuy(db, companyId, Number(moc.homNay.slice(0, 4)), laDemo),
      ]);
      const dung = dungSuKien({ nam: Number(moc.homNay.slice(0, 4)), homNay: moc.homNay, congTy: hs.cong_ty, hoSo: hs.ho_so, doanhThu: dt });
      // Đối chiếu trước cả bộ căn cứ: năng lực là hàm thuần, không gọi được CSDL.
      const kiem = await kiemCanCu(db, Object.keys(CAN_CU), moc.homNay);
      d.thue = {
        suKien: dung.su_kien,
        canhBao: dung.canh_bao,
        canCuDaKiem: Object.fromEntries(kiem.map((c) => [c.id, c.da_doi_chieu])),
        canCuHetHieuLuc: Object.fromEntries(kiem.filter((c) => c.hieu_luc?.trang_thai === "het_hieu_luc").map((c) => [c.id, c.nhan_hieu_luc])),
        chuaKiemHieuLuc: kiem.some((c) => c.hieu_luc === null),
      };
    })());
  }
  if (can.has("hanh_trinh")) {
    viec.push(dsHanhTrinhDangMo(db, companyId)
      .then((ds) => { d.hanhTrinhMo = ds; })
      .catch((e) => { console.error("hành trình:", e instanceof Error ? e.message : e); d.hanhTrinhMo = []; }));
    // Prompt 4B: cùng một danh sách Việc cần làm với Tổng quan và pet. Đọc hỏng → null (không giả "không có việc").
    viec.push(dsViecCanLam(db, { companyId, homNay: moc.homNay, laDemo, boi: null })
      .then((r) => { d.viecCanLam = r.viec; })
      .catch((e) => { console.error("việc cần làm:", e instanceof Error ? e.message : e); d.viecCanLam = null; }));
  }
  if (can.has("thuc_thi")) {
    viec.push((async () => {
      try {
        const [yc, tl] = await Promise.all([dsYeuCauNop(db, companyId), dsTaiLieu(db, companyId)]);
        const dangTheoDoi = new Set(yc.filter((y) => !["cancelled", "failed"].includes(y.trang_thai)).map((y) => y.tai_lieu_id));
        d.thucThi = {
          yeu_cau: yc,
          tai_lieu_cho_nop: tl.filter((x) => !dangTheoDoi.has(x.id) && kiemTruocKhiNop(x).length === 0).map((x) => ({ id: x.id, tieu_de: x.tieu_de, loai: x.loai })),
        };
      } catch (e) {
        console.error("thực thi:", e instanceof Error ? e.message : e);
        d.thucThi = null;
      }
    })());
  }
  if (can.has("lich_thue")) {
    // Cùng hàm với tax-summary và cron nhắc hạn: trợ lý không thể nói hạn khác màn Nhắc thuế.
    viec.push(docLichCongTy(db, companyId, { nam: Number(moc.homNay.slice(0, 4)), homNay: moc.homNay, laDemo })
      .then((l) => { d.lichThue = l; })
      .catch((e) => { console.error("lịch thuế:", e instanceof Error ? e.message : e); d.lichThue = null; }));
  }
  if (can.has("kho_luat")) {
    viec.push(traKhoLuat(db, tuyChon.cauHoi ?? "", moc.homNay).then((r) => {
      d.khoLuat = r.doan;
      d.khoLuatDaLoai = r.daLoai;
      d.khoLuatChuaKiemHieuLuc = r.chuaKiem;
    }));
  }
  if (can.has("thu_tuc")) {
    // Chọn trên bản nhẹ (mã, tên, mẫu) rồi mới đọc chi tiết đúng những thủ tục được chọn.
    viec.push((async () => {
      try {
        const { data: nhe, error } = await db.from("thu_tuc_thue").select("ma, ten, mau_to_khai").limit(1000);
        if (error) throw error;
        const chon = chonThuTuc(tuyChon.cauHoi ?? "", ((nhe ?? []) as Row[]).map((r) => ({
          ma: r.ma, ten: r.ten, mau_to_khai: r.mau_to_khai ?? [], doi_tuong: null, co_quan: null, cach_thuc: null,
          thanh_phan_ho_so: null, ket_qua: null, can_cu_phap_ly: null, nguon: "", lay_luc: "",
        })));
        if (!chon.length) { d.thuTuc = []; return; }
        const { data: day, error: loiDay } = await db.from("thu_tuc_thue")
          .select("ma, ten, doi_tuong, co_quan, cach_thuc, thanh_phan_ho_so, ket_qua, can_cu_phap_ly, mau_to_khai, nguon, lay_luc")
          .in("ma", chon.map((c) => c.ma));
        if (loiDay) throw loiDay;
        d.thuTuc = chon.map((c) => ((day ?? []) as Row[]).find((x) => x.ma === c.ma)).filter(Boolean) as DuLieu["thuTuc"];
      } catch (e) {
        console.error("thủ tục thuế:", e instanceof Error ? e.message : e);
        d.thuTuc = null;
      }
    })());
  }
  if (can.has("chung_tu_quet")) {
    viec.push(docTrang(
      (a, b, c) => db.from("chung_tu_quet").select("id, tong_tien, ngay, giao_dich_id", dem(c))
        .eq("company_id", companyId).order("id", { ascending: true }).range(a, b),
      "chứng từ quét", 5000,
    ).then(({ dong, tong }) => {
      d.chungTuQuet = dong.map((c) => ({ ...c, tong_tien: Number(c.tong_tien) })) as DuLieu["chungTuQuet"];
      d.doDay.chung_tu_quet = danhGiaDoDay({ nguon: "chung_tu_quet", ten: "Chứng từ đã quét", daDoc: dong.length, tong, gioiHan: 5000 });
    }));
  }
  await Promise.all(viec);
  return d;
}

/**
 * Khối thuế cho màn đầu: hồ sơ khảo sát lúc vào app + nghĩa vụ suy ra từ doanh thu thật.
 *
 * Đây là phần cá nhân hoá: ngành và kênh bán quyết định mẫu tờ khai, nên màn đầu nói đúng việc
 * của người này, không nói chung chung. Không đối chiếu câu trích ở đây (nặng) — trang Tờ khai
 * thuế mới làm việc đó; màn đầu chỉ dẫn sang.
 */
async function docThueManDau(db: Db, companyId: string, homNay: string) {
  const nam = Number(homNay.slice(0, 4));
  const [{ cong_ty, ho_so }, doanhThu] = await Promise.all([
    dongBoMstCongTy(db, companyId, cauHinhXInvoice()).then(() => docHoSo(db, companyId)),
    congTyLaDemo(db, companyId).then((laDemo) => docDoanhThuQuy(db, companyId, nam, laDemo)),
  ]);
  const dung = dungSuKien({ nam, homNay, congTy: cong_ty, hoSo: ho_so, doanhThu });
  const sl = suyLuan(dung.su_kien);
  const chinh = sl.ket_luan.filter((k) => k.loai === "nghia_vu" || k.loai === "mien");
  // Đã trả lời khảo sát chưa: loại người nộp và ngành là hai câu quyết định mẫu tờ khai.
  const coHoSo = !!ho_so.loai_nguoi_nop && (ho_so.nhom_nganh.length > 0 || ho_so.loai_nguoi_nop === "doanh_nghiep");
  return {
    co_ho_so: coHoSo,
    ho_so,
    nam,
    doanh_thu_nam: sl.doanh_thu_nam,
    nguon_doanh_thu: dung.nguon,
    tam_tinh: sl.tam_tinh,
    quy_vuot: sl.quy_vuot,
    nghia_vu: chinh.slice(0, 4).map((k) => ({ id: k.id, cau: k.cau, mau: k.mau ?? null, han: (k.han ?? [])[0] ?? null })),
    thieu: sl.thieu,
  };
}

// `boi_canh` (màn đầu) không cần đọc mọi nguồn của hệ luật thuế: khối thuế đọc riêng.
const TAT_CA_NGUON: NguonCan[] = ["giao_dich", "hoa_don_vao", "hoa_don_ban", "yeu_cau", "ket_noi_ngan_hang", "chi_phi_ai", "token_ai", "bang_gia", "chung_tu_quet"];

function docLichSu(v: unknown): TinNhanCu[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((m): m is Row => !!m && typeof m === "object" && (m.vai === "nguoi_dung" || m.vai === "tro_ly") && typeof m.noi_dung === "string")
    .slice(-6)
    .map((m) => ({ vai: m.vai, noi_dung: String(m.noi_dung).slice(0, DO_DAI_CAU_HOI) }));
}

/** MIMI-P1-003: hành động ghi của trợ lý cần quyền; hỏi và xem thì mọi thành viên đều được. */
async function ghiLanGoi(db: Db, companyId: string, l: LanGoi): Promise<void> {
  const { error } = await db.from("lan_goi_mo_hinh").insert({ company_id: companyId, ...l });
  if (error) console.error("ghi lần gọi mô hình:", error.message);
}

async function congTyChoTaiLieu(db: Db, companyId: string) {
  const { cong_ty } = await docHoSo(db, companyId);
  return { ten: cong_ty.ten, mst: cong_ty.mst, dia_chi: cong_ty.theo_mst?.dia_chi ?? null };
}

const cuoiThangCua = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
};

/**
 * Dựng tài liệu từ dữ liệu MỚI lúc bấm — không bao giờ từ nội dung trình duyệt gửi lên. Loại nào cần
 * dữ kiện của hành trình thì đọc từ hành trình của đúng công ty.
 */
async function dungBan(db: Db, companyId: string, loai: string, moc: ReturnType<typeof mocThoiGian>, ht: HanhTrinhDay | null): Promise<BanDung> {
  const ct = await congTyChoTaiLieu(db, companyId);
  const gt = (k: string) => ht?.du_kien[k]?.gia_tri ?? null;
  switch (loai) {
    case "financial_review_memo": {
      const d = await docDuLieu(db, companyId, new Set<NguonCan>(["giao_dich", "hoa_don_ban"]), moc);
      return memoTaiChinh(phanTichChenhLech({ cauHoi: "Báo cáo phân tích tháng này", homNay: moc.homNay, giaoDich: d.giaoDich, hoaDonBan: d.hoaDonBan }), ct, moc.homNay);
    }
    case "tax_readiness_pack": {
      const laDemo = await congTyLaDemo(db, companyId);
      const l = await docLichCongTy(db, companyId, { nam: Number(moc.homNay.slice(0, 4)), homNay: moc.homNay, laDemo });
      return goiSanSangThue(l.sanSang, l.lich, ct, moc.homNay);
    }
    case "audit_pack": {
      const noiDung = gt("noi_dung_yeu_cau"), tu = gt("ky_hoi_tu"), den = gt("ky_hoi_den");
      if (!noiDung || !tu || !den) throw new LoiTaiLieu("Cần biết nội dung yêu cầu và kỳ được hỏi trước khi gom bằng chứng.");
      const ky = { tu: `${tu}-01`, den: cuoiThangCua(den) };
      const laDemo = await congTyLaDemo(db, companyId);
      const gd = await docHet((a, b) => locMinhHoa(db.from("transactions")
        .select("id, amount, type, transaction_date, merchant_name, counter_account_name, payment_reference, is_synthetic")
        .eq("company_id", companyId), laDemo).gte("transaction_date", ky.tu).lte("transaction_date", ky.den)
        .order("id", { ascending: true }).range(a, b), "giao dịch kỳ được hỏi");
      const vao = (gd as Row[]).filter((x) => chieuTien(x as { type: string; amount: number }) === "vao");
      const ids = vao.map((x) => String(x.id));
      const pl = ids.length ? await docHet((a, b) => db.from("revenue_classifications").select("transaction_id")
        .eq("company_id", companyId).in("transaction_id", ids.slice(0, 1000)).order("transaction_id", { ascending: true }).range(a, b), "phân loại") : [];
      const daPl = new Set((pl as Row[]).map((r) => String(r.transaction_id)));
      const { data: hd } = await locMinhHoa(db.from("invoices").select("id, invoice_number, client_name, total, issued_date, is_synthetic")
        .eq("company_id", companyId), laDemo).gte("issued_date", ky.tu).lte("issued_date", ky.den).limit(1000);
      const ghep = ghepTienVe(
        vao.map((x) => ({ id: String(x.id), so_tien: doLonTien(x as { amount: number }), ngay: String(x.transaction_date), ten_nguoi_chuyen: String(x.counter_account_name ?? x.merchant_name ?? ""), noi_dung: (x.payment_reference as string | null) ?? null })),
        ((hd ?? []) as Row[]).map((h) => ({ id: String(h.id), so_hoa_don: String(h.invoice_number), ten_khach: String(h.client_name), tong: Number(h.total), ngay_lap: String(h.issued_date) })),
      );
      return goiBangChung({
        noi_dung_yeu_cau: noiDung, ky,
        giao_dich_vao: vao.map((x) => ({ id: String(x.id), so_tien: doLonTien(x as { amount: number }) })),
        da_phan_loai: ids.filter((i) => daPl.has(i)).length, chua_phan_loai: ids.filter((i) => !daPl.has(i)).length,
        hoa_don_khop_chac: ghep.chac.map((c) => ({ giao_dich: c.tien.id, hoa_don: c.hoa_don.id, so_hoa_don: c.hoa_don.so_hoa_don ?? "", so_tien: c.tien.so_tien })),
        hoa_don_can_xem: ghep.can_xem.length, co_sao_ke: gd.length > 0,
      }, ct, moc.homNay);
    }
    case "explanation_letter": {
      const noiDung = gt("noi_dung_yeu_cau"), ngay = gt("ngay_nhan_thong_bao");
      if (!noiDung || !ngay) throw new LoiTaiLieu("Cần biết ngày nhận thông báo và nội dung yêu cầu trước khi soạn công văn.");
      const { cong_ty } = await docHoSo(db, companyId);
      return congVanGiaiTrinh({ noi_dung_yeu_cau: noiDung, ngay_nhan_thong_bao: ngay, han_tra_loi: gt("han_tra_loi"), co_quan: cong_ty.theo_mst?.co_quan_thue ?? null }, ct, moc.homNay);
    }
    default:
      throw new LoiTaiLieu("MIMI chưa dựng được loại tài liệu này.");
  }
}

const QUYEN_HANH_DONG: Record<string, HanhDong> = {
  luu_chung_tu: "ghi_chung_tu",
  xoa_chung_tu: "ghi_chung_tu",
  quet_chung_tu: "ghi_chung_tu",
  // TCCN-08: gắn "kinh doanh / cá nhân" cho khoản chi là việc sổ sách — cùng quyền ghi chứng từ.
  gan_nhan_chi: "ghi_chung_tu",
  // Prompt 4: mở và làm hồ sơ việc, dựng tài liệu — cùng quyền ghi sổ sách. Duyệt kiểm vai trò riêng.
  hanh_trinh_mo: "ghi_chung_tu",
  hanh_trinh_tra_loi: "ghi_chung_tu",
  hanh_trinh_danh_dau: "ghi_chung_tu",
  hanh_trinh_soan: "ghi_chung_tu",
  // Prompt 4B: hồ sơ việc — ghi nhận đã nộp, phản hồi của cơ quan, huỷ việc.
  viec_da_nop: "ghi_chung_tu",
  viec_phan_hoi: "ghi_chung_tu",
  viec_huy: "ghi_chung_tu",
  tao_tai_lieu: "ghi_chung_tu",
  tai_lieu_da_nop: "ghi_chung_tu",
  // Prompt 5: chuẩn bị / ghi đã nộp / ghi kết quả — người soạn hồ sơ làm được. XÁC NHẬN thì kiểm riêng.
  nop_chuan_bi: "soan_to_khai",
  nop_da_nop: "soan_to_khai",
  nop_ket_qua: "soan_to_khai",
  nop_huy: "soan_to_khai",
};

async function xuLy(db: Db, userId: string, company: { id: string; name: string | null; la_demo?: boolean | null }, vaiTro: VaiTro, hanhDong: string, body: Row): Promise<Response> {
  // Cổng mô hình: Lovable AI nếu có khoá, không thì OpenRouter (OPENROUTER_API_KEY, mô hình đổi bằng OPENROUTER_MODEL).
  const cong = chonCongMoHinh({
    lovable: Deno.env.get("LOVABLE_API_KEY"),
    trungGianUrl: Deno.env.get("AI_TRUNG_GIAN_URL"), trungGianKhoa: Deno.env.get("AI_TRUNG_GIAN_KEY"),
    openrouter: Deno.env.get("OPENROUTER_API_KEY"), moHinhOpenRouter: Deno.env.get("OPENROUTER_MODEL"),
  });
  const khoaMoHinh = cong?.khoa ?? "";
  const can = QUYEN_HANH_DONG[hanhDong];
  if (can) kiemQuyen(vaiTro, can, cauTuChoi(vaiTro, can));
  const moc = mocThoiGian();

  switch (hanhDong) {
    case "boi_canh": {
      await donQuyetDinhTreo(db, company.id);
      const [d, thue] = await Promise.all([
        docDuLieu(db, company.id, new Set(TAT_CA_NGUON), moc, { soThangAi: SO_THANG_BIEU_DO_AI }),
        // Hỏng hồ sơ thuế không được làm mất cả màn đầu.
        docThueManDau(db, company.id, moc.homNay).catch((e) => {
          console.error("boi_canh thue:", e instanceof Error ? e.message : e);
          return null;
        }),
      ]);
      return json({
        cong_ty: company.name,
        cong_ty_id: company.id,
        // MIMI-P1-003: vai trò quyết định nút nào hiện; giao diện đổi công ty bằng `company_id`.
        vai_tro: vaiTro,
        cong_ty_cua_toi: await danhSachCongTy(db, userId),
        viec: viecHomNay(d),
        ket_noi: danhSachKetNoi(d),
        phan_tich: locPhanTich(phanTichNhanh(d), vaiTro),
        thue,
        co_mo_hinh: !!khoaMoHinh,
        // P0-002: màn đầu cũng nói nguồn nào thiếu hoặc cũ.
        do_day: Object.values(d.doDay),
        do_day_chung: trangThaiChung(Object.values(d.doDay) as DoDayNguon[]),
      });
    }

    case "hoi": {
      const cau = String(body.cau ?? "").trim();
      if (!cau) return loi("CAU_HOI", "Bạn chưa nhập câu hỏi.", 400);
      if (cau.length > DO_DAI_CAU_HOI) return loi("CAU_HOI", `Câu hỏi dài tối đa ${DO_DAI_CAU_HOI} ký tự.`, 400);
      const phamVi = (NHOM_NANG_LUC as readonly string[]).includes(String(body.pham_vi)) ? (body.pham_vi as NhomNangLuc) : null;
      const yDinh = nhanYDinh(cau, phamVi);

      /*
       * Prompt 4: câu nói về một việc nhiều bước mở (hoặc mở tiếp) hành trình NGAY, trước khi trả lời —
       * để câu trả lời hỏi đúng câu còn thiếu và trỏ tới đúng việc. Vai trò không được ghi thì chỉ xem trước.
       */
      let hanhTrinh: DuLieu["hanhTrinh"] = null;
      const loaiHT = yDinh.includes("hanh_trinh") ? nhanHanhTrinh(cau) : null;
      /*
       * Prompt 4B: trợ lý LÀM TIẾP việc — mở / mở tiếp hồ sơ việc, ghi câu trả lời cho câu đang chờ,
       * ghi "đã nộp" / "có phản hồi" — trước mô hình, cùng hàm ghi với trang Việc cần làm và pet.
       */
      {
        const duKienBiet: Record<string, string> = {};
        if (loaiHT) {
          const hs = await docHoSo(db, company.id).catch(() => null);
          const loaiNop = hs?.cong_ty.loai_theo_mst ?? hs?.ho_so.loai_nguoi_nop ?? null;
          if (loaiNop) duKienBiet.loai_chu_the = loaiNop;
          if (hs?.cong_ty.mst) duKienBiet.da_co_mst = "co";
          const nganh = hs?.ho_so.nhom_nganh ?? [];
          if (nganh.length === 1) duKienBiet.hoat_dong_chinh = nganh[0];
        }
        const chatViec = await xuLyChatViec(db, {
          companyId: company.id, userId, cau, homNay: moc.homNay, duocGhi: duocLam(vaiTro, "ghi_chung_tu"), loaiHanhTrinh: loaiHT, duKienBiet,
        });
        if (chatViec.ketQua) {
          const tlViec = dungTraLoi({ ketQua: [chatViec.ketQua], cheDo: "co_dinh", cauHoi: cau });
          const idViec = await ghiHoiThoai(db, company.id, userId, cau, tlViec, null);
          return json({ ...tlViec, hoi_thoai_id: idViec });
        }
        hanhTrinh = chatViec.hanhTrinh;
      }

      // Dữ liệu đọc một lần cho cả câu hỏi, dù mô hình gọi mấy năng lực.
      let dl: Promise<DuLieu> | null = null;
      const nguonDaDoc = new Set<NguonCan>();
      const chay = async (id: string) => {
        const nl = NANG_LUC[id];
        const thieu = nl.can.filter((n) => !nguonDaDoc.has(n));
        if (thieu.length) {
          // Đọc lại đủ các nguồn đã cần từ trước cộng nguồn mới: gọn hơn ghép hai lần đọc.
          thieu.forEach((n) => nguonDaDoc.add(n));
          dl = docDuLieu(db, company.id, new Set(nguonDaDoc), moc, { cauHoi: cau, hanhTrinh });
        }
        const d = await (dl as Promise<DuLieu>);
        // P0-002: mỗi kết quả mang độ đầy đủ của đúng các nguồn nó đã dùng.
        // P1-001: và mã băm của chính các bản ghi đứng sau từng con số.
        return await themMaBam(apDoDay(nl.chay(d), nl.can.map((n) => d.doDay[n]).filter((x): x is DoDayNguon => !!x)), d);
      };

      if (khoaMoHinh) {
        try {
          // Mục 24: ngữ cảnh làm việc có cấu trúc thay cho dồn lịch sử dài. Lỗi đọc không chặn câu trả lời.
          const nguCanh = await dsHanhTrinhDangMo(db, company.id)
            .then((ds) => nguCanhChoMoHinh(dungNguCanh({ hanhTrinh: ds })))
            .catch(() => "");
          // Mục 36: đo từng lần gọi (nhà cung cấp, mô hình, mục đích, độ trễ, token).
          const ncc = coDo(nhaCungCapCua(cong!), "y_dinh", (l) => { void ghiLanGoi(db, company.id, l); });
          const r = await hoiMoHinh({
            khoa: khoaMoHinh,
            ncc,
            moHinh: cong!.mo_hinh,
            nguCanh,
            cau,
            lichSu: docLichSu(body.lich_su),
            congCu: Object.entries(NANG_LUC).map(([id, nl]) => ({ id, mo_ta: nl.mo_ta })),
            chay,
            congTy: company.name,
            homNay: moc.homNay,
            goiY: yDinh,
          });
          const tl = dungTraLoi({ ketQua: locDeXuat(r.ket_qua, vaiTro), cheDo: "mo_hinh", cauMoHinh: r.cau, cauHoi: cau });
          const id = await ghiHoiThoai(db, company.id, userId, cau, tl, cong!.mo_hinh);
          return json({ ...tl, hoi_thoai_id: id });
        } catch (e) {
          // Cổng lỗi không làm người dùng mất câu trả lời: chạy tiếp bằng bộ luật cố định.
          if (!(e instanceof LoiMoHinh)) throw e;
          console.error("tro-ly mo hinh:", e.status, e.message);
        }
      }

      const ketQua = [];
      for (const id of yDinh) ketQua.push(await chay(id));
      const tl = dungTraLoi({ ketQua: locDeXuat(ketQua, vaiTro), cheDo: "co_dinh", cauHoi: cau });
      const idHt = await ghiHoiThoai(db, company.id, userId, cau, tl, null);
      return json({ ...tl, hoi_thoai_id: idHt });
    }

    // ── Prompt 4: hồ sơ việc / hành trình ──────────────────────────────────
    case "hanh_trinh_ds": {
      const [ds, hoSo] = await Promise.all([
        dsHanhTrinhDangMo(db, company.id),
        db.from("ho_so_viec").select("id, loai, tieu_de, trang_thai, muc_do, tao_luc, cap_nhat_luc, giai_quyet_luc, ket_qua")
          .eq("company_id", company.id).order("cap_nhat_luc", { ascending: false }).limit(50),
      ]);
      if (hoSo.error) throw new Error(hoSo.error.message);
      return json({ hanh_trinh: ds, ho_so_viec: hoSo.data ?? [], duoc_sua: duocLam(vaiTro, "ghi_chung_tu") });
    }
    case "hanh_trinh_doc": {
      const ht = await docHanhTrinh(db, company.id, String(body.id ?? ""));
      if (!ht) return loi("KHONG_THAY", "Không tìm thấy việc này.", 404);
      const { data: tl } = await db.from("tai_lieu").select("id, loai, tieu_de, trang_thai, do_day, tao_luc").eq("company_id", company.id).eq("hanh_trinh_id", ht.id).order("tao_luc", { ascending: false });
      return json({ hanh_trinh: ht, tai_lieu: tl ?? [], duoc_sua: duocLam(vaiTro, "ghi_chung_tu") });
    }
    case "hanh_trinh_mo": {
      if (!laLoaiHanhTrinh(body.loai)) return loi("THAM_SO", "Loại việc không hợp lệ.", 400);
      const r = await moViecHanhTrinh(db, { companyId: company.id, userId, loai: body.loai, yDinh: String(body.y_dinh ?? "").slice(0, 1000), homNay: moc.homNay });
      return json({ hanh_trinh: r.ht, moi: r.moi, viec: r.viec });
    }
    case "hanh_trinh_tra_loi": {
      const r = await traLoiViec(db, { companyId: company.id, userId, htId: String(body.id ?? ""), khoa: String(body.khoa ?? ""), giaTri: body.gia_tri, homNay: moc.homNay, nguon: body.nguon === "pet" ? "pet" : "nguoi_dung" });
      return json({ hanh_trinh: r.ht, viec: r.viec });
    }
    case "hanh_trinh_danh_dau": {
      const r = await danhDauBuocViec(db, { companyId: company.id, userId, htId: String(body.id ?? ""), khoa: String(body.khoa ?? ""), trangThai: String(body.trang_thai ?? "") as TrangThaiBuoc, ketQua: typeof body.ket_qua === "string" ? body.ket_qua : undefined, homNay: moc.homNay });
      return json({ hanh_trinh: r.ht, viec: r.viec });
    }

    // ── Prompt 4B: hồ sơ việc chuẩn — một danh sách cho Tổng quan, Trợ lý, Pet, Lịch ────────────
    case "viec_can_lam":
      return json({ ...(await dsViecCanLam(db, { companyId: company.id, homNay: moc.homNay, laDemo: company.la_demo === true, boi: userId })), duoc_sua: duocLam(vaiTro, "ghi_chung_tu") });
    case "viec_doc": {
      const ct = await docChiTietViec(db, company.id, String(body.id ?? ""), moc.homNay);
      if (!ct) return loi("KHONG_THAY", "Không tìm thấy việc này.", 404);
      return json({ ...ct, duoc_sua: duocLam(vaiTro, "ghi_chung_tu") });
    }
    case "viec_da_nop": {
      const ma = typeof body.ma_ho_so === "string" ? body.ma_ho_so.trim().slice(0, 60) : "";
      const r = await ghiNhanDaNopViec(db, { companyId: company.id, userId, caseId: String(body.id ?? ""), maHoSo: ma || null, taiLieuId: typeof body.tai_lieu_id === "string" ? body.tai_lieu_id : null, homNay: moc.homNay });
      return json({ hanh_trinh: r.ht, viec: r.viec });
    }
    case "viec_phan_hoi": {
      const r = await ghiNhanPhanHoi(db, { companyId: company.id, userId, caseId: String(body.id ?? ""), noiDung: String(body.noi_dung ?? "").slice(0, 500), taiLieuId: typeof body.tai_lieu_id === "string" ? body.tai_lieu_id : null, homNay: moc.homNay });
      return json({ hanh_trinh: r.ht, viec: r.viec });
    }
    case "viec_huy":
      return json({ viec: await huyViec(db, { companyId: company.id, userId, caseId: String(body.id ?? "") }) });
    case "hanh_trinh_soan": {
      // Bước "soạn tài liệu": máy chủ dựng từ dữ liệu mới + dữ kiện của hành trình, lưu vào thư viện.
      const ht = await docHanhTrinh(db, company.id, String(body.id ?? ""));
      if (!ht) return loi("KHONG_THAY", "Không tìm thấy việc này.", 404);
      const b = ht.buoc.find((x) => x.khoa === String(body.khoa ?? ""));
      if (!b || b.loai_hanh_dong !== "soan_tai_lieu" || !b.dich_hanh_dong) return loi("THAM_SO", "Bước này không soạn tài liệu.", 400);
      if (b.trang_thai === "blocked") return loi("CHUA_DU", b.ly_do_chan ?? "Bước này chưa mở.", 400);
      const ban = await dungBan(db, company.id, b.dich_hanh_dong, moc, ht);
      const tl = await taoTaiLieu(db, { companyId: company.id, userId, ban, hanhTrinhId: ht.id, hoSoViecId: ht.ho_so_viec_id });
      const moi = await danhDauBuocViec(db, { companyId: company.id, userId, htId: ht.id, khoa: b.khoa, trangThai: "completed", homNay: moc.homNay });
      return json({ tai_lieu: tl, hanh_trinh: moi.ht, viec: moi.viec });
    }

    // ── Prompt 4: thư viện tài liệu ─────────────────────────────────────────
    case "tao_tai_lieu": {
      // Đi qua hộp xác nhận ở giao diện (đề xuất `tao_tai_lieu`). Chỉ nhận LOẠI; nội dung dựng ở đây.
      const loaiTl = String(body.loai ?? "");
      if (!["financial_review_memo", "tax_readiness_pack"].includes(loaiTl)) return loi("THAM_SO", "Loại tài liệu không hợp lệ.", 400);
      const ban = await dungBan(db, company.id, loaiTl, moc, null);
      return json({ tai_lieu: await taoTaiLieu(db, { companyId: company.id, userId, ban }) });
    }
    case "tai_lieu_ds":
      return json({ tai_lieu: await dsTaiLieu(db, company.id), vai_tro: vaiTro });
    case "tai_lieu_mo": {
      const so = body.so === undefined ? undefined : Number(body.so);
      if (so !== undefined && (!Number.isInteger(so) || so < 1)) return loi("THAM_SO", "Phiên bản không hợp lệ.", 400);
      return json(await moTaiLieu(db, company.id, String(body.id ?? ""), so));
    }
    case "tai_lieu_duyet": {
      const tl = await duyetTaiLieu(db, { companyId: company.id, userId, vaiTro, id: String(body.id ?? ""), ketQua: String(body.ket_qua ?? "") as KetQuaDuyet, nhanXet: typeof body.nhan_xet === "string" ? body.nhan_xet : undefined, xacNhan: body.xac_nhan === true });
      return json({ tai_lieu: tl });
    }
    case "tai_lieu_da_nop": {
      const tl = await ghiNhanDaNop(db, { companyId: company.id, userId, id: String(body.id ?? ""), xacNhan: body.xac_nhan === true, ghiChu: typeof body.ghi_chu === "string" ? body.ghi_chu : undefined });
      return json({ tai_lieu: tl });
    }

    // ── Prompt 5: nộp có kiểm soát (kênh: người dùng tự nộp, MIMI theo dõi) ──────────────────
    case "nop_ds":
      return json({ yeu_cau: await dsYeuCauNop(db, company.id), vai_tro: vaiTro });
    case "nop_chuan_bi": {
      const han = typeof body.han === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.han) ? body.han : null;
      return json({ yeu_cau: await chuanBiNop(db, { companyId: company.id, userId, taiLieuId: String(body.tai_lieu_id ?? ""), han }) });
    }
    case "nop_xac_nhan": {
      // Việc hệ trọng: chỉ chủ doanh nghiệp / quản trị xác nhận nộp.
      if (vaiTro !== "chu_so_huu" && vaiTro !== "quan_tri") return loi("KHONG_DU_QUYEN", "Chỉ chủ doanh nghiệp hoặc quản trị xác nhận nộp hồ sơ.", 403);
      return json({ yeu_cau: await xacNhanNop(db, { companyId: company.id, userId, id: String(body.id ?? ""), xacNhan: body.xac_nhan === true }) });
    }
    case "nop_da_nop":
      return json({ yeu_cau: await ghiDaNop(db, { companyId: company.id, userId, id: String(body.id ?? ""), bienNhan: String(body.bien_nhan ?? ""), ngayNop: String(body.ngay_nop ?? "") }) });
    case "nop_ket_qua": {
      const kqNop = body.ket_qua === "accepted" || body.ket_qua === "rejected" ? body.ket_qua : null;
      if (!kqNop) return loi("THAM_SO", "Kết quả không hợp lệ.", 400);
      return json({ yeu_cau: await ghiKetQua(db, { companyId: company.id, userId, id: String(body.id ?? ""), ketQua: kqNop, thongBao: String(body.thong_bao ?? "") }) });
    }
    case "nop_huy":
      return json({ yeu_cau: await huyNop(db, { companyId: company.id, userId, id: String(body.id ?? "") }) });

    case "quet_chung_tu": {
      if (!khoaMoHinh) {
        return loi("CHUA_CO_MO_HINH", "MIMI chưa bật đọc ảnh chứng từ. Bạn vẫn nhập tay được ở trang Chứng từ chi phí.", 503);
      }
      const k = kiemAnh(body.anh);
      if (!k.ok) return loi("ANH", k.cau, 400);
      let ketQua;
      try {
        ketQua = await docAnhChungTu({ khoa: khoaMoHinh, anh: body.anh as string, homNay: moc.homNay, cong: cong ?? undefined });
      } catch (e) {
        if (e instanceof LoiMoHinh) return loi("DOC_ANH", "Chưa đọc được ảnh này. Chụp lại rõ hơn, đủ sáng, thấy cả tổng tiền.", 502);
        throw e;
      }

      // Gợi ý khoản chi đi kèm: đúng một khoản khớp số tiền trong ±7 ngày thì mới gợi ý.
      let goiY: Row | null = null;
      if (ketQua.tong_tien) {
        const moc90 = congNgay(moc.homNay, -90);
        const { dong: gd } = await docGiaoDich(db, company.id, ketQua.ngay ? [congNgay(ketQua.ngay, -7), moc90].sort()[1] : moc90, company.la_demo === true);
        const khop = gd.filter((t) =>
          chieuTien(t) === "ra" &&
          Math.abs(doLonTien(t) - (ketQua.tong_tien as number)) <= LECH_TIEN &&
          (!ketQua.ngay || Math.abs((Date.parse(t.transaction_date) - Date.parse(ketQua.ngay)) / 86_400_000) <= 7));
        if (khop.length === 1) {
          const t = khop[0];
          goiY = { id: t.id, ngay: t.transaction_date, nguoi_nhan: t.counter_account_name || t.merchant_name || null, so_tien: doLonTien(t) };
        }
      }
      return json({ ket_qua: ketQua, giao_dich_goi_y: goiY });
    }

    case "luu_chung_tu": {
      // Kiểm lại bằng đúng bộ kiểm dùng cho kết quả mô hình: người dùng có thể đã sửa tay.
      const r = docKetQuaQuet(body, moc.homNay);
      if (!r.tong_tien) return loi("TONG_TIEN", "Cần tổng tiền lớn hơn 0.", 400);
      if (body.ngay && !r.ngay) return loi("NGAY", "Ngày chứng từ không hợp lệ hoặc nằm ở tương lai.", 400);
      if (body.ma_so_thue_ben_ban && !r.ma_so_thue_ben_ban) return loi("MST", "Mã số thuế gồm 10 chữ số, hoặc 10 chữ số kèm -XXX.", 400);

      let giaoDichId: string | null = null;
      if (typeof body.giao_dich_id === "string" && body.giao_dich_id) {
        const t = kiem(
          // Chỉ gắn chứng từ vào giao dịch thật: dòng thử của sandbox không cần giấy tờ (trừ demo).
          await locMinhHoa(db.from("transactions").select("id, is_synthetic").eq("id", body.giao_dich_id).eq("company_id", company.id), company.la_demo === true).maybeSingle(),
          "giao dịch",
        );
        if (!t) return loi("GIAO_DICH", "Không có khoản chi này trong công ty.", 404);
        giaoDichId = body.giao_dich_id;
      }
      const { data, error } = await db.from("chung_tu_quet").insert({
        company_id: company.id,
        loai: r.loai,
        so_hoa_don: r.so_hoa_don,
        ky_hieu: r.ky_hieu,
        ngay: r.ngay,
        ben_ban: r.ben_ban,
        ma_so_thue_ben_ban: r.ma_so_thue_ben_ban,
        tien_truoc_thue: r.tien_truoc_thue,
        tien_thue: r.tien_thue,
        tong_tien: r.tong_tien,
        giao_dich_id: giaoDichId,
        user_id: userId,
      }).select("id").single();
      if (error) throw error;

      // Ảnh gốc là tuỳ chọn. Hỏng ảnh không làm mất các trường người dùng vừa kiểm.
      let anhPath: string | null = null;
      let canhBao: string | null = null;
      if (typeof body.anh === "string" && body.anh) {
        const k = kiemAnh(body.anh);
        // Chữ ký nhị phân đã kiểm trong `kiemAnh`; đường dẫn chỉ ghép từ id công ty và id dòng (uuid).
        const anh = k.ok ? giaiMaAnh(body.anh as string) : null;
        if (!k.ok || !anh) {
          canhBao = `Đã lưu chứng từ nhưng không lưu ảnh: ${k.ok ? "ảnh không đọc được." : k.cau}`;
        } else {
          const duongDan = `${company.id}/${data.id}.${anh.duoi}`;
          const { error: loiAnh } = await db.storage.from("chung-tu").upload(duongDan, anh.bytes, { contentType: anh.mime, upsert: true });
          if (loiAnh) {
            console.error("tro-ly luu anh:", loiAnh.message);
            canhBao = "Đã lưu chứng từ nhưng chưa lưu được ảnh. Chụp lại sau nếu cần ảnh.";
          } else {
            // Mã băm ảnh vào nội dung chuẩn hoá → sổ cái ghi cả ảnh: đổi ảnh gốc là lộ.
            const bamAnh = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(anh.bytes))), (x) => x.toString(16).padStart(2, "0")).join("");
            const { error: loiCapNhat } = await db.from("chung_tu_quet").update({ anh_path: duongDan, anh_sha256: bamAnh }).eq("id", data.id);
            if (loiCapNhat) throw loiCapNhat;
            anhPath = duongDan;
          }
        }
      }
      return json({ id: data.id, anh_path: anhPath, canh_bao: canhBao });
    }

    case "xac_nhan": {
      // MIMI-P1-002: ghi quyết định TRƯỚC khi chạy, với đề xuất chính thức của máy chủ.
      const khoa = String(body.de_xuat_khoa ?? "");
      if (!khoa) return loi("THAM_SO", "Thiếu khoá đề xuất.", 400);
      const hoiThoaiId = typeof body.hoi_thoai_id === "string" ? body.hoi_thoai_id : null;
      const ct = await deXuatChinhThuc(db, company.id, userId, khoa, hoiThoaiId, moc);
      if (!ct) return loi("KHONG_THAY", "Việc này không còn trong câu trả lời của MIMI. Hỏi lại rồi xác nhận.", 404);
      if (!deXuatDuocPhep(ct.dx, vaiTro)) return loi("KHONG_DU_QUYEN", cauTuChoi(vaiTro, "duyet_chi"), 403);

      const { data, error } = await db.from("nhat_ky_quyet_dinh").insert({
        company_id: company.id,
        user_id: userId,
        vai_tro: vaiTro,
        hoi_thoai_id: hoiThoaiId,
        cau_hoi_luc_do: ct.cauHoi.slice(0, 1000),
        de_xuat_khoa: ct.dx.khoa,
        loai: ct.dx.loai,
        tham_so: ct.dx.tham_so,
        mo_ta_da_xac_nhan: ct.dx.mo_ta.slice(0, 2000),
        ket_qua: "cho_chay",
      }).select("id").single();
      if (error) throw error;
      // Trả đúng đề xuất máy chủ đã ghi: giao diện chạy theo bản này, không theo bản nó đang giữ.
      return json({ quyet_dinh_id: Number(data.id), de_xuat: ct.dx });
    }

    case "ket_qua_quyet_dinh": {
      const id = Number(body.quyet_dinh_id);
      if (!Number.isInteger(id) || id <= 0) return loi("THAM_SO", "Thiếu mã quyết định.", 400);
      const ok = body.ok === true;
      const { data: qd, error: loiDoc } = await db.from("nhat_ky_quyet_dinh").select("id, loai, tham_so")
        .eq("id", id).eq("company_id", company.id).eq("user_id", userId).eq("ket_qua", "cho_chay").maybeSingle();
      if (loiDoc) throw loiDoc;
      if (!qd) return loi("KHONG_THAY", "Không có quyết định đang chờ kết quả với mã này.", 404);
      // MIMI-P1-005: việc chạm tiền thì máy chủ đối chiếu trạng thái thật, không chỉ tin lời giao diện.
      const kl = doiChieuQuyetDinh({
        loai: qd.loai, baoOk: ok, baoCau: String(body.cau ?? "").slice(0, 1500),
        trangThai: await trangThaiYeuCau(db, company.id, qd.loai, qd.tham_so),
      });
      const { data, error } = await db.from("nhat_ky_quyet_dinh")
        .update({
          ket_qua: kl.ket_qua,
          ket_qua_cau: kl.cau.slice(0, 2000),
          ma_loi: kl.ma_loi ?? (ok ? null : String(body.ma_loi ?? "").slice(0, 100) || null),
          xong_luc: new Date().toISOString(),
        })
        .eq("id", id).eq("ket_qua", "cho_chay")
        .select("id").maybeSingle();
      if (error) throw error;
      if (!data) return loi("KHONG_THAY", "Không có quyết định đang chờ kết quả với mã này.", 404);
      return json({ ok: true, ket_qua: kl.ket_qua });
    }

    case "bat_thuong": {
      // TCCN-01 — thẻ cảnh báo trên màn Tổng quan. Chỉ đọc; mọi thành viên công ty đều xem được.
      const bt = await quetCongTy(db, company.id, moc.homNay, 30, company.la_demo === true);
      return json({
        tong: bt.canh_bao.length,
        so_cao: bt.canh_bao.filter((c) => c.muc_do === "cao").length,
        canh_bao: bt.canh_bao.slice(0, 10),
        lich_su_du: bt.lich_su_du,
        so_khoan_da_xet: bt.so_khoan_da_xet,
        tinh_den: moc.homNay,
      });
    }

    case "gan_nhan_chi": {
      /*
       * TCCN-08 — người dùng chọn một khoản chi là của hộ kinh doanh hay chi tiêu cá nhân.
       * Nhãn người chọn (`source = 'human'`) thì máy không bao giờ ghi đè (xem migration tạo
       * `transaction_labels`). Chỉ gắn cho giao dịch thật, tiền ra, của đúng công ty này.
       */
      const gdId = String(body.giao_dich_id ?? "");
      if (typeof body.ca_nhan !== "boolean" || !gdId) return loi("THAM_SO", "Thiếu giao dịch hoặc lựa chọn.", 400);
      const { data: gd, error: loiGd } = await locMinhHoa(db.from("transactions")
        .select("id, amount, type, is_synthetic").eq("id", gdId).eq("company_id", company.id), company.la_demo === true).maybeSingle();
      if (loiGd) throw loiGd;
      if (!gd) return loi("KHONG_THAY", "Không có giao dịch này.", 404);
      if (chieuTien(gd) !== "ra") return loi("THAM_SO", "Chỉ phân loại được khoản tiền ra.", 400);
      const { error } = await db.from("transaction_labels").upsert({
        company_id: company.id,
        transaction_id: gdId,
        is_personal: body.ca_nhan,
        source: "human",
        needs_review: false,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      }, { onConflict: "transaction_id" });
      if (error) throw error;
      return json({ ok: true, giao_dich_id: gdId, ca_nhan: body.ca_nhan });
    }

    case "kiem_truoc_khi_chuyen": {
      /*
       * TCCN-02 — kiểm một khoản SẮP chuyển, kể cả khoản không đi qua MIMI (ai đó gọi điện giục
       * chuyển tiền). Chỉ đọc: không ghi gì, không lưu số tài khoản người dùng nhập vào đâu.
       * Cùng bộ luật với nút Duyệt, cộng thêm hoàn cảnh do người dùng tự khai.
       */
      const stk = chuanSoTaiKhoan(String(body.so_tai_khoan ?? "").slice(0, 40));
      const ten = String(body.ten_nguoi_nhan ?? "").trim().slice(0, 120) || null;
      const soTien = Number(body.so_tien);
      const noiDung = String(body.noi_dung ?? "").trim().slice(0, 210) || null;
      const hoanCanh = Array.isArray(body.hoan_canh) ? body.hoan_canh.map((x: unknown) => String(x)).slice(0, 10) : [];
      if (!stk || stk.length < 6) return loi("THAM_SO", "Số tài khoản cần ít nhất 6 chữ số.", 400);
      if (!Number.isFinite(soTien) || soTien <= 0 || soTien > 100_000_000_000) return loi("THAM_SO", "Số tiền chưa đúng.", 400);

      const ls = await docLichSuChi(db, company.id, moc.homNay, undefined, company.la_demo === true);
      const dauHieu = [
        ...dauHieuHoanCanh(hoanCanh),
        ...kiemKhoan({ id: "kiem", so_tien: soTien, ngay: moc.homNay, ten_nguoi_nhan: ten, so_tai_khoan: stk, noi_dung: noiDung }, ls.khoan, { daTinCay: ls.tinCay }),
      ];
      const cungTk = ls.khoan.filter((k) => chuanSoTaiKhoan(k.so_tai_khoan) === stk);
      return json({
        muc_do: mucDoChung(dauHieu),
        dau_hieu: dauHieu,
        lich_su_du: ls.du,
        trong_danh_sach_tin_cay: ls.tinCay.has(stk),
        lan_tra_truoc: cungTk.length,
        lan_cuoi: cungTk.map((k) => k.ngay).sort().at(-1) ?? null,
        lon_nhat_da_tra: cungTk.length ? Math.max(...cungTk.map((k) => k.so_tien)) : null,
      });
    }

    case "bang_chung": {
      // P1-001: mở đúng những bản ghi đứng sau một con số, trong phạm vi công ty đang dùng.
      const loai = String(body.loai ?? "") as LoaiBangChung;
      const ids = Array.isArray(body.id) ? body.id.map((x: unknown) => String(x)).slice(0, SO_BANG_CHUNG_MOI_LAN) : [];
      if (!ids.length) return loi("THAM_SO", "Thiếu danh sách bản ghi cần xem.", 400);

      if (loai === "van_ban_luat") {
        const ds = ids.filter((id) => CAN_CU[id]).map((id) => ({ id, ...CAN_CU[id] }));
        if (!ds.length) return loi("KHONG_THAY", "Không có căn cứ này.", 404);
        return json({ loai, ban_ghi: ds });
      }

      const bang = BANG_BANG_CHUNG[loai as Exclude<LoaiBangChung, "van_ban_luat">];
      if (!bang) return loi("THAM_SO", "Loại bằng chứng không hợp lệ.", 400);
      let q = db.from(bang.bang).select(bang.cot).eq("company_id", company.id).in("id", ids);
      // Giao dịch: chỉ mở dòng thật, đúng như các năng lực đã cộng (bỏ is_synthetic).
      if (loai === "giao_dich") q = locMinhHoa(q, company.la_demo === true);
      const { data, error } = await q.limit(SO_BANG_CHUNG_MOI_LAN);
      if (error) throw error;
      const ds = (data ?? []) as Row[];
      // Id của công ty khác: không có dòng nào → 404, và KHÔNG nói id nào tồn tại ở đâu.
      if (!ds.length) return loi("KHONG_THAY", "Không có bản ghi này trong công ty của bạn.", 404);
      return json({ loai, ban_ghi: ds, thieu: ids.length - ds.length });
    }

    case "trang_thai": {
      // Nhẹ: cho các trang chỉ cần biết có đọc được ảnh chứng từ không.
      return json({ cong_ty: company.name, co_mo_hinh: !!khoaMoHinh });
    }

    case "xoa_chung_tu": {
      const { data: ct, error } = await db.from("chung_tu_quet").select("id, anh_path")
        .eq("id", String(body.id ?? "")).eq("company_id", company.id).maybeSingle();
      if (error) throw error;
      if (!ct) return loi("KHONG_THAY", "Không có chứng từ này.", 404);
      if (ct.anh_path) {
        const { error: loiAnh } = await db.storage.from("chung-tu").remove([ct.anh_path]);
        if (loiAnh) console.error("tro-ly xoa anh:", loiAnh.message);
      }
      const { error: loiXoa } = await db.from("chung_tu_quet").delete().eq("id", ct.id).eq("company_id", company.id);
      if (loiXoa) throw loiXoa;
      return json({ ok: true });
    }

    default:
      return loi("HANH_DONG", "Hành động không hợp lệ.", 400);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);
  // Ảnh tối đa 5 MB (~6,7 MB base64) cộng vài trường: thân lớn hơn là bất thường.
  if (Number(req.headers.get("content-length") ?? 0) > KICH_THUOC_THAN_TOI_DA) return loi("QUA_LON", "Dữ liệu gửi lên quá lớn.", 413);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let body: Row;
    try {
      body = await req.json();
    } catch {
      return loi("JSON", "Thân yêu cầu không phải JSON.", 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return loi("CHUA_DANG_NHAP", "Cần đăng nhập.", 401);
    const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập không hợp lệ.", 401);

    const chon = typeof body.company_id === "string" ? body.company_id : null;
    const ct = await resolveCompanyVaiTro<{ id: string; name: string | null; la_demo: boolean | null }>(db, user.id, "id, name, la_demo", chon);
    if (!ct) return loi("KHONG_CO_CONG_TY", chon ? "Bạn không thuộc công ty này." : "Chưa có công ty.", chon ? 403 : 404);
    const company = ct.cong_ty;

    const hanhDong = String(body.hanh_dong ?? "");
    const gioiHan = GIOI_HAN[hanhDong];
    if (gioiHan) {
      // Chặn gọi dồn (dò dữ liệu, đốt tiền mô hình). Đếm ở CSDL vì edge function không giữ trạng thái.
      const { data: duoc, error: loiDem } = await db.rpc("tang_luot_goi", {
        p_user: user.id, p_hanh_dong: hanhDong, p_cua_so_giay: gioiHan.cuaSoGiay, p_toi_da: gioiHan.toiDa,
      });
      if (loiDem) console.error("tro-ly gioi han:", loiDem.message);
      else if (duoc === false) return loi("QUA_NHIEU", "Bạn thao tác hơi nhanh. Đợi khoảng một phút rồi thử lại.", 429);
    }

    return await xuLy(db, user.id, company, ct.vai_tro, hanhDong, body);
  } catch (e) {
    if (e instanceof LoiQuyen) return loi("KHONG_DU_QUYEN", e.message, 403);
    if (e instanceof LoiHanhTrinh || e instanceof LoiTaiLieu || e instanceof LoiNop || e instanceof LoiViec) return loi("KHONG_HOP_LE", e.message, 400);
    // Không in thân yêu cầu: có thể chứa ảnh chứng từ hoặc câu hỏi về tiền của khách.
    console.error("tro-ly:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "MIMI gặp lỗi khi đọc dữ liệu. Thử lại sau ít phút.", 500);
  }
});
