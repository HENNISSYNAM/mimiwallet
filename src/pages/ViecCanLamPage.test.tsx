import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { tinhBuoc, cauHoiTiepTheo, type DuKien } from '../../supabase/functions/_shared/hanh-trinh/dong-co';
import {
  dieuKienGiaiQuyet, hanhDongTiepHanhTrinh, khiNaoViec, lichTuViec, mucUuTienViec, ngayTuHanhTrinh, suyTrangThai, TEN_MUC,
} from '../../supabase/functions/_shared/viec/dong-co-viec';
import { TEN_TRANG_THAI_VIEC, type BangChung } from '../../supabase/functions/_shared/viec/trang-thai';

/*
 * Prompt 4B: trang đọc MỘT danh sách việc (`viec_can_lam`) và chi tiết (`viec_doc`). Máy chủ giả dựng bằng
 * CHÍNH bộ máy thật (`dong-co.ts`, `dong-co-viec.ts`) — giao diện không có luật riêng.
 */
const goi = vi.hoisted(() => ({ cuoc: [] as [string, Record<string, unknown>][], loiLich: false }));
const HT_ID = '22222222-2222-2222-2222-222222222222';
const CASE_ID = '33333333-3333-3333-3333-333333333333';
const HOM_NAY = '2026-09-26';
let duKien: DuKien = {};
let daCo: Record<string, string> = {};
let bc: BangChung[] = [];

const ht = () => {
  const buoc = tinhBuoc('suspension', duKien, daCo as never);
  return { id: HT_ID, loai: 'suspension' as const, tieu_de: 'Tạm ngừng kinh doanh', trang_thai: 'dang_mo', ho_so_viec_id: CASE_ID, du_kien: duKien, buoc, cau_hoi: cauHoiTiepTheo(buoc, duKien), tao_luc: '', cap_nhat_luc: '' };
};
const viec = () => {
  const h = ht();
  const tt = suyTrangThai(h, bc);
  const ngay = ngayTuHanhTrinh('suspension', duKien);
  const hen = tt === 'waiting_external' ? '2026-09-29' : null;
  return { id: CASE_ID, tieu_de: 'Tạm ngừng kinh doanh', loai: 'tam_ngung', trang_thai: tt, ...ngay, hen_kiem_lai: hen };
};
const bcMoi = (o: Partial<BangChung>): BangChung => ({ loai: 'user_confirmation', nguon: 'nguoi_dung', gia_tri: null, trang_thai_xac_minh: 'user_confirmed', khoa_trung: 'x', tao_luc: '2026-09-26T07:40:00Z', ...o });

vi.mock('@/lib/goiTroLy', () => ({
  goiTroLy: async (hd: string, du: Record<string, unknown> = {}) => {
    goi.cuoc.push([hd, du]);
    const v = viec();
    const h = ht();
    const a = hanhDongTiepHanhTrinh(h, v.trang_thai, bc, HOM_NAY);
    if (hd === 'viec_can_lam') {
      const dangMo = !['resolved_user_confirmed', 'resolved_system_verified', 'cancelled'].includes(v.trang_thai);
      const muc = mucUuTienViec(v, HOM_NAY);
      return {
        viec: dangMo ? [{ id: CASE_ID, nguon: 'ho_so_viec', loai: 'tam_ngung', tieu_de: v.tieu_de, trang_thai: v.trang_thai, muc, vi_sao: a?.vi_sao ?? TEN_MUC[muc], khi: khiNaoViec(v), hanh_dong: a, can_ban: true, duong_dan: `/dashboard/viec-can-lam?viec=${CASE_ID}` }] : [],
        lich: lichTuViec(v), da_xong: dangMo ? [] : [{ id: CASE_ID, tieu_de: v.tieu_de, trang_thai: v.trang_thai, giai_quyet_luc: '2026-09-26', ket_qua: 'x' }],
        loi: goi.loiLich ? [{ nguon: 'lich_thue', cau: 'Chưa đọc được lịch thuế và doanh thu — danh sách có thể thiếu hạn thuế.' }] : [], duoc_sua: true,
      };
    }
    if (hd === 'viec_doc') {
      return {
        viec: { ...v, company_id: 'c', muc_do: 'binh_thuong', dau_van_tay: 'tam_ngung:chung', nguon: {}, ky: null, doi_tuong: null, so_lan_nhac: 0, phien_ban: 1, tao_luc: '', cap_nhat_luc: '', giai_quyet_luc: null, ket_qua: null, ten_trang_thai: TEN_TRANG_THAI_VIEC[v.trang_thai] },
        hanh_trinh: h, bang_chung: bc, hanh_dong: a, dieu_kien: dieuKienGiaiQuyet(h, bc), lich: lichTuViec(v),
        dong_thoi_gian: [{ luc: '2026-09-26T02:20:00Z', cau: 'MIMI mở việc "Tạm ngừng kinh doanh".', do_chac: 'mimi' }], duoc_sua: true,
      };
    }
    if (hd === 'hanh_trinh_tra_loi') {
      duKien = { ...duKien, [String(du.khoa)]: { gia_tri: String(du.gia_tri), nguon: 'nguoi_dung', luc: '', boi: 'u' } };
      return { hanh_trinh: ht(), viec: null };
    }
    if (hd === 'hanh_trinh_danh_dau') {
      daCo = { ...daCo, [String(du.khoa)]: String(du.trang_thai) };
      if (du.trang_thai === 'completed') bc = [...bc, bcMoi({ khoa_trung: `buoc:${du.khoa}` })];
      return { hanh_trinh: ht(), viec: null };
    }
    if (hd === 'viec_da_nop') {
      daCo = { ...daCo, nguoi_dung_nop: 'waiting_external' };
      bc = [...bc, bcMoi({ khoa_trung: 'da_nop', gia_tri: 'Bạn ghi nhận đã nộp hồ sơ' }), ...(du.ma_ho_so ? [bcMoi({ loai: 'reference_number', khoa_trung: `ma:${du.ma_ho_so}`, gia_tri: String(du.ma_ho_so) })] : [])];
      return { hanh_trinh: ht(), viec: null };
    }
    if (hd === 'viec_phan_hoi') {
      daCo = { ...daCo, nguoi_dung_nop: 'completed', kiem_ket_qua: 'completed' };
      bc = [...bc, bcMoi({ loai: 'official_response', khoa_trung: 'phan_hoi', gia_tri: String(du.noi_dung) })];
      return { hanh_trinh: ht(), viec: null };
    }
    if (hd === 'hanh_trinh_doc') return { hanh_trinh: ht(), tai_lieu: [], duoc_sua: true };
    throw new Error(`không giả lập ${hd}`);
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import ViecCanLamPage from './ViecCanLamPage';

configure({ asyncUtilTimeout: 20000 });
vi.setConfig({ testTimeout: 40_000 });

const mo = (url = `/dashboard/viec-can-lam?viec=${CASE_ID}`) => render(<MemoryRouter initialEntries={[url]}><ViecCanLamPage /></MemoryRouter>);

beforeEach(() => { duKien = {}; daCo = {}; bc = []; goi.cuoc.length = 0; goi.loiLich = false; });

describe('Việc cần làm (hồ sơ việc chuẩn)', () => {
  it('danh sách nói CÁI GÌ / VÌ SAO / VIỆC TIẾP THEO; chi tiết hỏi đúng một câu rồi sang câu kế', async () => {
    mo();
    const ds = await screen.findByRole('list', { name: 'Danh sách việc cần làm' });
    expect(within(ds).getByText('Tạm ngừng kinh doanh')).toBeTruthy();
    expect(within(ds).getByText('Việc tiếp theo: Xác nhận ngày bắt đầu tạm ngừng')).toBeTruthy();
    expect(within(ds).getByText(/Đang chặn thủ tục/)).toBeTruthy();
    await screen.findByRole('heading', { name: 'Xác nhận ngày bắt đầu tạm ngừng' });
    fireEvent.change(screen.getByLabelText('Bạn muốn bắt đầu tạm ngừng từ ngày nào?'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Trả lời' }));
    await screen.findByRole('heading', { name: 'Xác nhận ngày kết thúc tạm ngừng' });
    expect(goi.cuoc).toContainEqual(['hanh_trinh_tra_loi', { id: HT_ID, khoa: 'tam_ngung_tu', gia_tri: '2026-10-01' }]);
  });

  it('ngày tạm ngừng hiện là "MIMI khuyên làm trước" — không bao giờ là "Hạn pháp lý"', async () => {
    duKien = { tam_ngung_tu: { gia_tri: '2026-10-01', nguon: 'nguoi_dung', luc: '', boi: 'u' }, tam_ngung_den: { gia_tri: '2026-12-31', nguon: 'nguoi_dung', luc: '', boi: 'u' } };
    mo();
    const ngay = await screen.findByRole('heading', { name: 'Ngày của việc này' });
    const khu = ngay.closest('section') as HTMLElement;
    expect(within(khu).getByText('MIMI khuyên làm trước')).toBeTruthy();
    expect(within(khu).queryByText('Hạn pháp lý')).toBeNull();
  });

  it('bước chưa đủ dữ kiện hiện lý do chặn, không có nút làm', async () => {
    mo();
    const buoc = await screen.findByRole('list', { name: 'Các bước' });
    expect(buoc.textContent).toContain('Hoàn thành nghĩa vụ trước ngày tạm ngừng');
    expect(within(buoc).getAllByText(/Cần biết trước/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Đánh dấu xong' })).toBeNull();
  });

  it('"Tôi đã nộp" nói rõ là BẠN xác nhận, gửi kèm mã hồ sơ; sau đó chờ phản hồi, có hẹn kiểm lại, bằng chứng mang nhãn "MIMI chưa kiểm được"', async () => {
    duKien = { tam_ngung_tu: { gia_tri: '2026-10-01', nguon: 'nguoi_dung', luc: '', boi: 'u' }, tam_ngung_den: { gia_tri: '2026-12-31', nguon: 'nguoi_dung', luc: '', boi: 'u' } };
    daCo = { nghia_vu_con_treo: 'completed', tra_thu_tuc: 'completed' };
    bc = [bcMoi({ khoa_trung: 'buoc:nghia_vu_con_treo' })];
    mo();
    await screen.findByRole('heading', { name: 'Nộp hồ sơ, rồi ghi nhận đã nộp (kèm mã hồ sơ nếu có)' });
    fireEvent.change(screen.getByLabelText('Mã hồ sơ / số biên nhận (nếu có)'), { target: { value: '11220260001234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã nộp' }));
    const hop = await screen.findByRole('alertdialog', { name: 'Xác nhận đã nộp' });
    expect(hop.textContent).toContain('chưa phải xác nhận của cơ quan');
    expect(goi.cuoc.some(([hd]) => hd === 'viec_da_nop')).toBe(false); // chưa bấm Đúng thì chưa gửi
    fireEvent.click(within(hop).getByRole('button', { name: 'Đúng, tôi đã nộp' }));
    await screen.findByRole('heading', { name: 'Kiểm tra xem bạn đã nhận phản hồi chưa' });
    expect(goi.cuoc).toContainEqual(['viec_da_nop', { id: CASE_ID, ma_ho_so: '11220260001234' }]);
    expect(screen.getAllByText('Đang chờ phản hồi bên ngoài').length).toBeGreaterThan(0);
    expect(screen.getByText('Hẹn kiểm lại')).toBeTruthy();
    expect(screen.getAllByText('Theo xác nhận của bạn — MIMI chưa kiểm được').length).toBeGreaterThan(0);
    expect(screen.queryByText('MIMI đã kiểm trên dữ liệu')).toBeNull();
  });

  it('ghi phản hồi → xong ở mức "theo xác nhận của bạn", KHÔNG "MIMI đã kiểm"', async () => {
    duKien = { tam_ngung_tu: { gia_tri: '2026-10-01', nguon: 'nguoi_dung', luc: '', boi: 'u' }, tam_ngung_den: { gia_tri: '2026-12-31', nguon: 'nguoi_dung', luc: '', boi: 'u' } };
    daCo = { nghia_vu_con_treo: 'completed', tra_thu_tuc: 'completed', nguoi_dung_nop: 'waiting_external' };
    bc = [bcMoi({ khoa_trung: 'da_nop' })];
    mo();
    fireEvent.change(await screen.findByLabelText('Phản hồi của cơ quan'), { target: { value: 'Thông báo chấp nhận số 123/TB-CCT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi phản hồi' }));
    await waitFor(() => expect(screen.getAllByText('Đã xong — theo xác nhận của bạn').length).toBeGreaterThan(0));
    expect(screen.queryByText('Đã xong — MIMI đã kiểm trên dữ liệu')).toBeNull();
  });

  it('máy chủ không đọc được lịch thuế → nói rõ, không hiện như "không có việc"', async () => {
    goi.loiLich = true;
    mo('/dashboard/viec-can-lam');
    expect(await screen.findByText(/Chưa đọc được lịch thuế/)).toBeTruthy();
  });

  it('đường dẫn cũ ?ht=… chuyển sang đúng hồ sơ việc', async () => {
    mo(`/dashboard/viec-can-lam?ht=${HT_ID}`);
    await screen.findByRole('heading', { name: 'Xác nhận ngày bắt đầu tạm ngừng' });
    expect(goi.cuoc.some(([hd, du]) => hd === 'viec_doc' && du.id === CASE_ID)).toBe(true);
  });
});

