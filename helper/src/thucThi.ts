/**
 * Executor + verifier. Nhận NHIỆM VỤ máy chủ đã kiểm, chạy trên ĐÚNG MỘT tab người dùng chọn.
 *
 * Luật chạy ở đây (không ở lời nhắc):
 *   - mọi hành động qua `kiemHanhDong`; ký, nộp, OTP, thanh toán không có trong danh sách hành động và còn bị chặn theo tên;
 *   - trước khi điền: trang đúng origin, đúng nhãn môi trường (bộ chuyển thử), đúng mã số thuế đang đăng nhập;
 *   - trước MỖI lượt ghi: hỏi lại máy chủ nhiệm vụ còn hiệu lực (quyền, bản nháp, hạn);
 *   - ghi xong đọc lại ngay; lệch là dừng và bàn giao; lỗi giữa lúc ghi là "chưa rõ kết quả" — dừng, KHÔNG thử lại;
 *   - tab đóng, điều hướng ra ngoài phạm vi, popup/tab mới, mất kết nối trình duyệt → dừng.
 * Chữ trên trang (kể cả dòng "hãy bấm nộp") không bao giờ được đọc để quyết định hành động.
 */
import type { BrowserContext, Page } from 'playwright-core';
import { createHash } from 'node:crypto';
import { kiemHanhDong, khopGiaTri, type HanhDong, type NhiemVu } from '../../src/lib/dienCong/hopDong';
import { originHopLe, timBoChuyen } from '../../supabase/functions/_shared/dien-cong/bo-chuyen.ts';
import { BO_CHUYEN_CHAY, type BoChuyenChay } from './boChuyen';

export type TrangThaiChay = 'cho' | 'dang_dien' | 'tam_dung' | 'da_doi_chieu' | 'lech' | 'ban_giao' | 'dung' | 'loi';

export interface BuocNhatKy {
  luc: string;
  tac_nhan: 'bo_chay';
  hanh_dong: string;
  khoa_truong: string | null;
  ket_qua: 'ok' | 'chan' | 'lech' | 'loi' | 'khong_ro';
  ma_bam_gia_tri: string | null;
  ghi_chu: string;
}

export interface KetQuaO { khoa: string; mong_doi: string; doc_lai: string | null; khop: boolean }

/** Cổng nói chuyện với máy chủ MIMI — tách ra để kiểm thử không cần mạng. */
export interface MayChuMimi {
  kiemNhiemVu(): Promise<{ ok: true; nhiem_vu: NhiemVu } | { ok: false; loi: string[] }>;
  ghi(dong: BuocNhatKy[], trangThai?: string, ketQua?: unknown): Promise<void>;
}

const bam = (s: string) => createHash('sha256').update(s).digest('hex');

export class PhienDien {
  trangThai: TrangThaiChay = 'cho';
  nhatKy: BuocNhatKy[] = [];
  ketQua: KetQuaO[] = [];
  thongDiep = '';
  private dungYeuCau = false;
  /** Máy chủ đã nhận trạng thái 'dang_dien' chưa — chưa thì kết thúc bằng 'huy' (luật chuyển trạng thái của máy chủ). */
  private daBaoDangDien = false;
  private coGhiChuaRo = false;
  private dangChay: Promise<void> | null = null;
  private boChuyen: BoChuyenChay;
  private goTheoDoi: Array<() => void> = [];

  constructor(private nv: NhiemVu, private ctx: BrowserContext, private page: Page, private mayChu: MayChuMimi) {
    const bc = BO_CHUYEN_CHAY[nv.bo_chuyen];
    if (!bc || bc.phien_ban !== nv.phien_ban_bo_chuyen) throw new Error('Bộ chạy không có bộ chuyển đúng phiên bản nhiệm vụ yêu cầu.');
    this.boChuyen = bc;
  }

  private ghiBuoc(hanh_dong: string, ket_qua: BuocNhatKy['ket_qua'], ghi_chu: string, khoa: string | null = null, giaTri: string | null = null) {
    this.nhatKy.push({ luc: new Date().toISOString(), tac_nhan: 'bo_chay', hanh_dong, khoa_truong: khoa, ket_qua, ma_bam_gia_tri: giaTri === null ? null : bam(giaTri), ghi_chu: ghi_chu.slice(0, 300) });
  }

  private originHopLe = (url: string) => {
    const bc = timBoChuyen(this.nv.bo_chuyen);
    return !!bc && originHopLe(bc, url);
  };

  private luat(hd: HanhDong): string | null {
    return kiemHanhDong(hd, {
      nhiemVu: this.nv,
      urlTab: this.page.isClosed() ? 'about:blank' : this.page.url(),
      khoaBoChuyen: new Set(Object.keys(this.boChuyen.o)),
      khoaDuocBam: this.boChuyen.duoc_bam,
      coGhiChuaRo: this.coGhiChuaRo,
      bayGio: new Date(),
      originHopLe: this.originHopLe,
    });
  }

  /** Theo dõi tab: đóng, điều hướng ra ngoài, popup, tab mới, mất trình duyệt → yêu cầu dừng. */
  private theoDoi() {
    const dungVi = (ly: string) => { if (!['ban_giao', 'dung', 'loi', 'lech', 'da_doi_chieu'].includes(this.trangThai)) { this.dungYeuCau = true; this.thongDiep = ly; } };
    const dong = () => dungVi('Tab đã đóng — dừng.');
    const dieuHuong = (f: { parentFrame(): unknown; url(): string }) => {
      if (f.parentFrame() === null && !this.originHopLe(f.url())) dungVi('Tab đã chuyển sang trang ngoài phạm vi — dừng.');
    };
    const popup = () => dungVi('Trang mở cửa sổ/tab mới — dừng để bạn xem.');
    const tabMoi = (p: Page) => { if (p !== this.page) popup(); };
    const matKetNoi = () => dungVi('Mất kết nối với trình duyệt — dừng.');
    this.page.on('close', dong);
    this.page.on('framenavigated', dieuHuong);
    this.page.on('popup', popup);
    this.ctx.on('page', tabMoi);
    this.ctx.on('close', matKetNoi);
    this.goTheoDoi.push(() => {
      this.page.off('close', dong); this.page.off('framenavigated', dieuHuong); this.page.off('popup', popup);
      this.ctx.off('page', tabMoi); this.ctx.off('close', matKetNoi);
    });
  }

  /** Một locator phải khớp đúng một phần tử. */
  private async motPhanTu(css: string) {
    const l = this.page.locator(css);
    const n = await l.count();
    if (n !== 1) throw new LoiChan(`Trang có ${n} chỗ khớp "${css}" (cần đúng 1) — trang đã đổi, dừng.`);
    return l;
  }

  private async docO(khoa: string): Promise<string | null> {
    const o = this.boChuyen.o[khoa];
    const l = await this.motPhanTu(o.css);
    if (o.kieu === 'danh_dau') return (await l.isChecked()) ? 'co' : 'khong';
    return await l.inputValue();
  }

  /** Xác nhận đúng trang, đúng môi trường, đúng người nộp trước khi chạm bất cứ ô nào. */
  private async kiemTrang() {
    const r = this.luat({ loai: 'doc_trang' });
    if (r) throw new LoiChan(r);
    const nm = this.boChuyen.nhan_moi_truong;
    if (nm) {
      const l = await this.motPhanTu(nm.css);
      if ((await l.getAttribute(nm.thuoc_tinh)) !== nm.gia_tri) throw new LoiChan('Trang không mang nhãn môi trường thử — bộ chuyển thử không chạy trên trang này.');
    }
    const mst = ((await (await this.motPhanTu(this.boChuyen.css_mst)).textContent()) ?? '').replace(/\s/g, '');
    if (mst !== this.nv.chu_the.mst) throw new LoiChan(`Mã số thuế đang đăng nhập trên trang (${mst || 'không thấy'}) khác hồ sơ trong MIMI — dừng, không điền cho người khác.`);
    this.ghiBuoc('kiem_trang', 'ok', `Đúng origin, đúng nhãn môi trường, đúng MST ${mst.slice(0, 3)}***.`);
  }

  private async dienO(khoa: string, giaTri: string) {
    const o = this.boChuyen.o[khoa];
    const hd: HanhDong = o.kieu === 'chon' ? { loai: 'chon', khoa } : { loai: 'dien', khoa };
    const chan = this.luat(hd);
    if (chan) throw new LoiChan(chan);
    // Hỏi lại máy chủ ngay trước khi ghi: quyền, bản nháp, hạn.
    const kt = await this.mayChu.kiemNhiemVu();
    if (!kt.ok) throw new LoiChan(`Máy chủ không cho đi tiếp: ${kt.loi.join(' ')}`);
    if (kt.nhiem_vu.ma_bam_ke_hoach !== this.nv.ma_bam_ke_hoach) throw new LoiChan('Kế hoạch trên máy chủ đã đổi — dừng.');
    // Trong lúc chờ máy chủ, tab có thể đã đổi trang: kiểm lại luật ngay trước khi chạm.
    const sau = this.luat(hd);
    if (sau) throw new LoiChan(sau);
    const l = await this.motPhanTu(o.css);
    try {
      if (o.kieu === 'chon') await l.selectOption(giaTri, { timeout: 5000 });
      else if (o.kieu === 'danh_dau') await l.setChecked(giaTri === 'co', { timeout: 5000 });
      else { await l.fill(giaTri, { timeout: 5000 }); await l.blur({ timeout: 5000 }); }
    } catch (e) {
      // Không biết lần ghi này đã vào trang hay chưa: đánh dấu và dừng, tuyệt đối không tự thử lại.
      this.coGhiChuaRo = true;
      this.ghiBuoc(hd.loai, 'khong_ro', 'Ghi giữa chừng thì lỗi — chưa rõ trang đã nhận chưa. Dừng, không thử lại.', khoa);
      throw new LoiChan(`Ô "${o.khoa}": ghi không rõ kết quả (${e instanceof Error ? e.message.split('\n')[0] : 'lỗi'}).`);
    }
    this.ghiBuoc(hd.loai, 'ok', 'Đã ghi; chờ đọc lại.', khoa);
  }

  /** Chạy đến hết hoặc tới khi dừng. Gọi lại sau khi tạm dừng = tiếp tục (đọc lại trang trước). */
  async chay(): Promise<void> {
    if (this.dangChay) return this.dangChay;
    this.dangChay = this.chayThat().finally(() => { this.dangChay = null; });
    return this.dangChay;
  }

  private async chayThat() {
    if (['ban_giao', 'dung', 'loi', 'lech', 'da_doi_chieu'].includes(this.trangThai)) return;
    const tiepTuc = this.trangThai === 'tam_dung';
    this.dungYeuCau = false;
    if (!this.goTheoDoi.length) this.theoDoi();
    try {
      const kt = await this.mayChu.kiemNhiemVu();
      if (!kt.ok) throw new LoiChan(`Máy chủ không cho bắt đầu: ${kt.loi.join(' ')}`);
      if (kt.nhiem_vu.ma_bam_ke_hoach !== this.nv.ma_bam_ke_hoach) throw new LoiChan('Kế hoạch trên máy chủ đã đổi — dừng.');
      this.trangThai = 'dang_dien';
      await this.mayChu.ghi([], 'dang_dien');
      this.daBaoDangDien = true;
      await this.kiemTrang();
      if (tiepTuc) this.ghiBuoc('tiep_tuc', 'ok', 'Tiếp tục: đã đọc lại trang và kiểm lại nhiệm vụ.');

      for (const t of this.nv.truong) {
        if (this.dungYeuCau) break;
        const pv = this.luat({ loai: 'doc_trang' });
        if (pv) throw new LoiChan(pv);
        // Tiếp tục: ô đã đúng thì không ghi lại.
        const hienTai = await this.docO(t.khoa);
        if (khopGiaTri(t.kieu, t.gia_tri, hienTai)) continue;
        await this.dienO(t.khoa, t.gia_tri);
      }

      if (this.dungYeuCau) {
        this.trangThai = 'tam_dung';
        this.ghiBuoc('dung', 'chan', this.thongDiep || 'Người dùng yêu cầu dừng.');
        await this.mayChu.ghi(this.layNhatKyMoi(), 'tam_dung');
        return;
      }
      await this.doiChieu();
    } catch (e) {
      const ly = e instanceof LoiChan ? e.message : `Lỗi bộ chạy: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`;
      this.thongDiep = ly;
      this.trangThai = e instanceof LoiChan ? 'dung' : 'loi';
      this.ghiBuoc('dung', e instanceof LoiChan ? 'chan' : 'loi', ly);
      await this.mayChu.ghi(this.layNhatKyMoi(), this.daBaoDangDien ? this.trangThai : 'huy').catch(() => {});
    }
  }

  /** Verifier: đọc lại TẤT CẢ ô, đối chiếu với ảnh chụp giá trị từ máy chủ. */
  private async doiChieu() {
    const r = this.luat({ loai: 'doi_chieu' });
    if (r) throw new LoiChan(r);
    this.ketQua = [];
    for (const t of this.nv.truong) {
      const doc = await this.docO(t.khoa);
      const khop = khopGiaTri(t.kieu, t.gia_tri, doc);
      this.ketQua.push({ khoa: t.khoa, mong_doi: t.gia_tri, doc_lai: doc, khop });
      this.ghiBuoc('doi_chieu', khop ? 'ok' : 'lech', khop ? 'Khớp bản nháp.' : 'Giá trị trên trang khác bản nháp.', t.khoa, doc);
    }
    const lech = this.ketQua.filter((k) => !k.khop);
    this.trangThai = lech.length ? 'lech' : 'da_doi_chieu';
    this.thongDiep = lech.length
      ? `${lech.length} ô trên trang khác bản nháp — bạn xem và sửa tay trước khi ký, nộp.`
      : 'Đã điền và đối chiếu: mọi ô khớp bản nháp. Chưa nộp — bạn kiểm, ký và nộp trên cổng.';
    await this.mayChu.ghi(this.layNhatKyMoi(), this.trangThai, {
      phuong_phap: 'doc_lai_tung_o_so_voi_anh_chup_may_chu',
      so_o: this.ketQua.length,
      so_lech: lech.length,
      o_lech: lech.map((k) => k.khoa),
    });
  }

  /** Bàn giao cho người dùng: bộ chạy buông tab, không chạm gì nữa. */
  async banGiao(): Promise<void> {
    if (this.trangThai !== 'da_doi_chieu' && this.trangThai !== 'lech') throw new LoiChan('Chỉ bàn giao sau khi đã đối chiếu.');
    this.ghiBuoc('ban_giao', 'ok', 'Bàn giao cho người dùng: kiểm, ký và nộp là việc của người dùng.');
    this.trangThai = 'ban_giao';
    await this.mayChu.ghi(this.layNhatKyMoi(), 'ban_giao');
    this.dong();
  }

  dung(ly = 'Người dùng bấm dừng.') {
    this.dungYeuCau = true;
    this.thongDiep = ly;
  }

  dong() {
    for (const g of this.goTheoDoi.splice(0)) g();
  }

  private daGui = 0;
  private layNhatKyMoi(): BuocNhatKy[] {
    const moi = this.nhatKy.slice(this.daGui);
    this.daGui = this.nhatKy.length;
    return moi;
  }
}

export class LoiChan extends Error {}
