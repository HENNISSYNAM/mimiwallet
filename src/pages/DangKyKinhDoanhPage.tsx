import { useEffect, useMemo, useState } from 'react';
import { FileDown, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ChonLoaiHinh from '@/components/dang-ky/ChonLoaiHinh';
import BangHoi from '@/components/dang-ky/BangHoi';
import GiayIn, { KieuInDangKy } from '@/components/dang-ky/GiayIn';
import NhanNguon from '@/components/dang-ky/NhanNguon';
import { inTaiLieu, LOP_VUNG_IN, ngayTep, tenTepAnToan } from '@/lib/inTaiLieu';
import {
  docHoSoDaLuu, goiYChuSoHuuHuongLoi, hoSoRong, kiemTraHoSo, luuHoSo, nguoiGopVonRong, xoaHoSoDaLuu,
  type HoSoDangKy,
} from '@/lib/dangKy/hoSo';
import { cacBuoc, hoSoCan, MO_TA, type LoaiHinh, type MaMau } from '@/lib/dangKy/loaiHinh';
import { boMau } from '@/lib/dangKy/mau';
import { CC } from '@/lib/dangKy/nguon';

/**
 * Đăng ký kinh doanh — hướng dẫn từng bước: chọn loại hình → hồ sơ và các bước nộp (kèm căn cứ)
 * → bộ soạn hồ sơ điền sẵn mẫu Nhà nước, xem trước, in/Tải PDF.
 *
 * Không gọi máy chủ. Bảng hỏi có số định danh cá nhân của nhiều người nên chỉ nằm trong
 * localStorage của trình duyệt này (nút "Xoá dữ liệu đã nhập"); MIMI không nộp thay.
 */

const MIN_THANH_VIEN: Partial<Record<LoaiHinh, number>> = { tnhh2: 2, ctcp: 3 };

export default function DangKyKinhDoanhPage() {
  const [hs, setHs] = useState<HoSoDangKy>(() => docHoSoDaLuu() ?? hoSoRong('ctcp'));
  const [dangXem, setDangXem] = useState<MaMau | 'ca_bo'>('ca_bo');

  // Ghi mỗi lần sửa: đóng tab giữa chừng không mất bảng hỏi. Lỗi bộ nhớ (riêng tư, đầy) thì bỏ qua.
  useEffect(() => { luuHoSo(hs); }, [hs]);

  const doi = (f: (h: HoSoDangKy) => HoSoDangKy) => setHs(f);
  const chonLoai = (loai: LoaiHinh) => {
    setHs((h) => {
      const can = MIN_THANH_VIEN[loai] ?? 0;
      const tv = [...h.thanh_vien];
      while (tv.length < can) tv.push(nguoiGopVonRong());
      return { ...h, loai, thanh_vien: tv, chu_so_huu_huong_loi: [] };
    });
    setDangXem('ca_bo');
  };

  // Danh sách chủ sở hữu hưởng lợi chưa tự sửa → in theo gợi ý ≥25% (xem goiYChuSoHuuHuongLoi).
  const hsIn = useMemo<HoSoDangKy>(
    () => (hs.chu_so_huu_huong_loi.length ? hs : { ...hs, chu_so_huu_huong_loi: goiYChuSoHuuHuongLoi(hs) }),
    [hs],
  );
  const bo = useMemo(() => boMau(hsIn), [hsIn]);
  const loi = useMemo(() => kiemTraHoSo(hs), [hs]);
  const hoSo = hoSoCan(hs.loai);
  const buoc = cacBuoc(hs.loai);
  const xem = dangXem === 'ca_bo' ? bo : bo.filter((v) => v.ma === dangXem);
  const cacXem = xem.length ? xem : bo;

  const tenTep = `${tenTepAnToan(`ho-so-dang-ky ${MO_TA[hs.loai].ten_ngan} ${hs.ten_vi}`)}-${ngayTep()}`;
  const inRa = (pdf: boolean) => {
    if (loi.length) toast.info(`Còn ${loi.length} chỗ chưa đủ — giấy in ra sẽ có dòng trống ở các chỗ đó.`);
    if (pdf) toast.info('Ở hộp in, chọn máy in "Lưu dưới dạng PDF" (Save as PDF) rồi bấm Lưu.');
    inTaiLieu(tenTep);
  };
  const xoa = () => {
    xoaHoSoDaLuu();
    setHs(hoSoRong(hs.loai));
    toast.success('Đã xoá dữ liệu đã nhập khỏi trình duyệt này.');
  };

  return (
    <div className="space-y-6 pb-10">
      <KieuInDangKy />
      <header className="no-print space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Đăng ký kinh doanh</h1>
        <p className="text-sm text-muted-foreground">
          Chọn loại hình, xem hồ sơ và các bước nộp, rồi để MIMI điền sẵn các mẫu theo đúng văn bản gốc. Bạn tự ký và tự nộp — MIMI không nộp thay.
        </p>
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-foreground">
          <p>
            Mẫu Giấy đề nghị (Mẫu số 2, 3, 4) và Danh sách chủ sở hữu hưởng lợi (Mẫu số 10) dùng bản thay thế của Thông tư 121/2026/TT-BTC, hiệu lực từ 21/8/2026. Bản cũ theo Thông tư 68/2025/TT-BTC không còn dùng cho hồ sơ nộp từ ngày đó.
          </p>
          <NhanNguon cc={CC.hieuLucMau} />
          <p className="mt-2">Dữ liệu bạn nhập (kể cả số định danh) chỉ lưu trong trình duyệt này, không gửi lên máy chủ MIMI.</p>
        </div>
      </header>

      <div className="no-print">
        <ChonLoaiHinh loai={hs.loai} chon={chonLoai} />
      </div>

      <section aria-labelledby="dkkd-buoc-2" className="no-print space-y-4 rounded-xl border border-border p-4">
        <h2 id="dkkd-buoc-2" className="text-lg font-semibold text-foreground">2. Hồ sơ và các bước — {MO_TA[hs.loai].ten}</h2>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Hồ sơ cần có</h3>
          <ul className="mt-2 space-y-2" aria-label="Hồ sơ cần có">
            {hoSo.map((m) => (
              <li key={m.ten} className="text-sm">
                <span className="text-foreground">{m.ten}</span>
                {m.mau ? <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">MIMI soạn được</span> : null}
                {m.khi_nao ? <span className="block text-xs text-muted-foreground">{m.khi_nao}</span> : null}
                <NhanNguon cc={m.can_cu} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Các bước nộp</h3>
          <ol className="mt-2 space-y-3" aria-label="Các bước nộp">
            {buoc.map((b, i) => (
              <li key={b.tieu_de} className="text-sm">
                <p className="font-medium text-foreground">Bước {i + 1}. {b.tieu_de}</p>
                <p className="text-muted-foreground">{b.chi_tiet}</p>
                {b.can_cu.map((c) => <NhanNguon key={`${c.dieu}${c.van_ban}`} cc={c} />)}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="dkkd-buoc-3" className="space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <h2 id="dkkd-buoc-3" className="text-lg font-semibold text-foreground">3. Bộ soạn hồ sơ</h2>
          <button type="button" onClick={xoa} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive">
            <Trash2 className="h-4 w-4" aria-hidden /> Xoá dữ liệu đã nhập
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="no-print">
            <BangHoi hs={hs} doi={doi} />
          </div>

          <div className="space-y-3">
            <div className="no-print space-y-3">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Văn bản xem trước">
                {([['ca_bo', 'Cả bộ hồ sơ'] as const, ...bo.map((v) => [v.ma, v.ten] as const)]).map(([ma, ten]) => (
                  <button
                    key={ma} type="button" role="tab" aria-selected={dangXem === ma}
                    onClick={() => setDangXem(ma)}
                    className={`rounded-full border px-3 py-1 text-xs ${dangXem === ma ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}
                  >
                    {ten}
                  </button>
                ))}
              </div>
              {loi.length > 0 ? (
                <div role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                  <p className="font-medium text-foreground">Còn {loi.length} chỗ cần sửa trước khi nộp:</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">{loi.slice(0, 8).map((l, i) => <li key={i}>{l.thong_bao}</li>)}</ul>
                </div>
              ) : (
                <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">Đủ các ô bắt buộc MIMI kiểm được. Vẫn đọc lại từng trang trước khi ký.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => inRa(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                  <Printer className="h-4 w-4" aria-hidden /> In
                </button>
                <button type="button" onClick={() => inRa(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                  <FileDown className="h-4 w-4" aria-hidden /> Tải PDF
                </button>
              </div>
              {cacXem.some((v) => v.tham_khao) && (
                <p className="rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
                  Điều lệ là khung tham khảo theo danh mục nội dung bắt buộc của Điều lệ — cần người sáng lập/luật sư hoàn thiện. Danh mục chưa đối chiếu bản gốc của Luật.
                </p>
              )}
            </div>

            <div className={`${LOP_VUNG_IN} overflow-x-auto rounded-xl border border-border`}>
              {cacXem.map((v, i) => <GiayIn key={v.ma} vanBan={v} ngatTruoc={i > 0} />)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
