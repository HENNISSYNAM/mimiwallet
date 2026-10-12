import { useId, type ReactNode } from 'react';
import {
  goiYChuSoHuuHuongLoi, nguoiGopVonRong, soBangChu, soCoDau,
  type CaNhan, type ChuSoHuuHuongLoi, type DiaChi, type HoSoDangKy, type NguoiGopVon,
} from '@/lib/dangKy/hoSo';

/**
 * Bảng hỏi của bộ soạn hồ sơ. Chỉ hỏi những ô mẫu cần; mỗi nhóm ứng với một mục của Giấy đề nghị.
 * Nhãn dùng đúng tên chỉ tiêu trong mẫu để người dùng đối chiếu với giấy in ra.
 */

const O = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10';

export function Truong({ nhan, gia, doi, goiY, kieu, ghi }: { nhan: string; gia: string; doi: (v: string) => void; goiY?: string; kieu?: string; ghi?: string }) {
  // Ghi chú nối bằng aria-describedby, không nằm trong <label>: tên ô cho trình đọc màn hình chỉ là nhãn.
  const id = useId();
  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1 block font-medium text-foreground">{nhan}</label>
      <input id={id} type={kieu ?? 'text'} value={gia} onChange={(e) => doi(e.target.value)} placeholder={goiY} className={O} aria-describedby={ghi ? `${id}-ghi` : undefined} />
      {ghi ? <span id={`${id}-ghi`} className="mt-0.5 block text-xs text-muted-foreground">{ghi}</span> : null}
    </div>
  );
}

function Nhom({ tieuDe, children }: { tieuDe: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-semibold text-foreground">{tieuDe}</legend>
      {children}
    </fieldset>
  );
}

const soTien = (v: string) => Number(v.replace(/\D/g, '')) || 0;

function NhapDiaChi({ d, doi, tien }: { d: DiaChi; doi: (d: DiaChi) => void; tien: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Truong nhan={`${tien}: số nhà, đường, tổ/thôn`} gia={d.so_nha} doi={(v) => doi({ ...d, so_nha: v })} />
      <Truong nhan="Xã/Phường/Đặc khu" gia={d.xa} doi={(v) => doi({ ...d, xa: v })} />
      <Truong nhan="Tỉnh/Thành phố" gia={d.tinh} doi={(v) => doi({ ...d, tinh: v })} />
    </div>
  );
}

function NhapCaNhan<T extends CaNhan>({ c, doi, ten }: { c: T; doi: (c: T) => void; ten: string }) {
  const s = (k: keyof CaNhan) => (v: string) => doi({ ...c, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Truong nhan={`Họ, chữ đệm và tên ${ten}`} gia={c.ho_ten} doi={s('ho_ten')} />
        <Truong nhan="Ngày, tháng, năm sinh" kieu="date" gia={c.ngay_sinh} doi={s('ngay_sinh')} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">Giới tính</span>
          <select value={c.gioi_tinh} onChange={(e) => s('gioi_tinh')(e.target.value)} className={O}>
            <option value="">—</option><option>Nam</option><option>Nữ</option>
          </select>
        </label>
        <Truong nhan="Số định danh cá nhân" gia={c.so_dinh_danh} doi={(v) => s('so_dinh_danh')(v.replace(/\D/g, '').slice(0, 12))} ghi="12 số trên căn cước. Chỉ giữ trong trình duyệt này, không gửi lên MIMI." />
        <Truong nhan="Quốc tịch" gia={c.quoc_tich} doi={s('quoc_tich')} />
        <Truong nhan="Dân tộc" gia={c.dan_toc} doi={s('dan_toc')} />
        <Truong nhan="Điện thoại" gia={c.dien_thoai} doi={s('dien_thoai')} />
        <Truong nhan="Thư điện tử" gia={c.email} doi={s('email')} />
      </div>
      <NhapDiaChi d={c.dia_chi} doi={(d) => doi({ ...c, dia_chi: d })} tien="Địa chỉ liên lạc" />
    </div>
  );
}

export default function BangHoi({ hs, doi }: { hs: HoSoDangKy; doi: (f: (h: HoSoDangKy) => HoSoDangKy) => void }) {
  const dat = <K extends keyof HoSoDangKy>(k: K) => (v: HoSoDangKy[K]) => doi((h) => ({ ...h, [k]: v }));
  const laDn = hs.loai !== 'hkd';
  const coThanhVien = hs.loai === 'tnhh2' || hs.loai === 'ctcp';
  const tenTv = hs.loai === 'ctcp' ? 'cổ đông sáng lập' : hs.loai === 'tnhh2' ? 'thành viên' : 'thành viên hộ gia đình';
  const doiTv = (i: number, t: NguoiGopVon) => doi((h) => ({ ...h, thanh_vien: h.thanh_vien.map((x, j) => (j === i ? t : x)) }));
  const tongVon = hs.thanh_vien.reduce((s, t) => s + (t.von || 0), 0);
  const cshhlTuDong = hs.chu_so_huu_huong_loi.length === 0;
  const dsCshhl = cshhlTuDong ? goiYChuSoHuuHuongLoi(hs) : hs.chu_so_huu_huong_loi;
  const doiCshhl = (i: number, k: keyof ChuSoHuuHuongLoi, v: string) =>
    doi((h) => ({ ...h, chu_so_huu_huong_loi: (h.chu_so_huu_huong_loi.length ? h.chu_so_huu_huong_loi : goiYChuSoHuuHuongLoi(h)).map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Bảng hỏi đăng ký">
      <Nhom tieuDe="Nơi nộp và ngày ký">
        <div className="grid gap-3 sm:grid-cols-3">
          <Truong nhan="Kính gửi" gia={hs.co_quan} doi={dat('co_quan')} goiY={laDn ? 'Phòng Đăng ký kinh doanh …' : 'Cơ quan đăng ký kinh doanh cấp xã …'} />
          <Truong nhan="Địa danh" gia={hs.dia_danh} doi={dat('dia_danh')} goiY="TP. Hồ Chí Minh" />
          <Truong nhan="Ngày ký" kieu="date" gia={hs.ngay_ky} doi={dat('ngay_ky')} />
        </div>
      </Nhom>

      <Nhom tieuDe={laDn ? '2. Tên công ty' : '1. Tên hộ kinh doanh'}>
        <Truong nhan="Tên viết bằng tiếng Việt" gia={hs.ten_vi} doi={dat('ten_vi')} ghi="MIMI tự in hoa khi điền mẫu." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Truong nhan="Tên viết bằng tiếng nước ngoài (nếu có)" gia={hs.ten_nuoc_ngoai} doi={dat('ten_nuoc_ngoai')} />
          <Truong nhan="Tên viết tắt (nếu có)" gia={hs.ten_viet_tat} doi={dat('ten_viet_tat')} />
        </div>
      </Nhom>

      <Nhom tieuDe={laDn ? '3. Địa chỉ trụ sở chính' : '2. Trụ sở của hộ kinh doanh'}>
        <NhapDiaChi d={hs.tru_so} doi={(d) => doi((h) => ({ ...h, tru_so: { ...h.tru_so, ...d } }))} tien="Trụ sở" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Truong nhan="Điện thoại" gia={hs.tru_so.dien_thoai} doi={(v) => doi((h) => ({ ...h, tru_so: { ...h.tru_so, dien_thoai: v } }))} />
          <Truong nhan="Thư điện tử (nếu có)" gia={hs.tru_so.email} doi={(v) => doi((h) => ({ ...h, tru_so: { ...h.tru_so, email: v } }))} />
        </div>
        {!laDn && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hs.hkd_khong_tai_tru_so} onChange={(e) => dat('hkd_khong_tai_tru_so')(e.target.checked)} />
            Không kinh doanh tại trụ sở (không có địa điểm kinh doanh cố định)
          </label>
        )}
      </Nhom>

      <Nhom tieuDe={`${laDn ? '4' : '3'}. Ngành, nghề kinh doanh (mã cấp 4 VSIC)`}>
        <p className="text-xs text-muted-foreground">
          Tự nhập mã 4 số và tên ngành theo Hệ thống ngành kinh tế Việt Nam — MIMI chưa có bảng tra VSIC nên không đoán mã thay bạn.
          {!laDn && ' Hộ kinh doanh: chỉ ngành chính bắt buộc ghi mã.'}
        </p>
        {hs.nganh.map((n, i) => (
          <div key={i} className="grid items-end gap-2 sm:grid-cols-[110px_minmax(0,1fr)_auto_auto]">
            <Truong nhan={`Mã ngành ${i + 1}`} gia={n.ma} doi={(v) => doi((h) => ({ ...h, nganh: h.nganh.map((x, j) => (j === i ? { ...x, ma: v.replace(/\D/g, '').slice(0, 4) } : x)) }))} />
            <Truong nhan="Tên ngành" gia={n.ten} doi={(v) => doi((h) => ({ ...h, nganh: h.nganh.map((x, j) => (j === i ? { ...x, ten: v } : x)) }))} />
            <label className="flex items-center gap-1.5 pb-2 text-sm">
              <input type="radio" name="nganh-chinh" checked={hs.nganh_chinh === i} onChange={() => dat('nganh_chinh')(i)} /> Ngành chính
            </label>
            <button
              type="button" disabled={hs.nganh.length === 1}
              onClick={() => doi((h) => ({ ...h, nganh: h.nganh.filter((_, j) => j !== i), nganh_chinh: h.nganh_chinh > i ? h.nganh_chinh - 1 : h.nganh_chinh === i ? 0 : h.nganh_chinh }))}
              className="pb-2 text-sm text-destructive disabled:opacity-40"
            >
              Bỏ
            </button>
          </div>
        ))}
        <button type="button" onClick={() => doi((h) => ({ ...h, nganh: [...h.nganh, { ma: '', ten: '' }] }))} className="text-sm text-primary">+ Thêm ngành</button>
      </Nhom>

      <Nhom tieuDe={laDn ? 'Vốn điều lệ' : '4. Vốn kinh doanh'}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Truong nhan={laDn ? 'Vốn điều lệ (đồng)' : 'Vốn kinh doanh (đồng)'} gia={hs.von ? soCoDau(hs.von) : ''} doi={(v) => dat('von')(soTien(v))} ghi={hs.von > 0 ? soBangChu(hs.von) : undefined} />
          {hs.loai === 'ctcp' && (
            <Truong nhan="Mệnh giá cổ phần (đồng)" gia={hs.menh_gia ? soCoDau(hs.menh_gia) : ''} doi={(v) => dat('menh_gia')(soTien(v))} ghi={hs.menh_gia > 0 && hs.von > 0 ? `${soCoDau(Math.floor(hs.von / hs.menh_gia))} cổ phần phổ thông` : undefined} />
          )}
        </div>
        {laDn && <p className="text-xs text-muted-foreground">MIMI điền nguồn vốn là "Vốn tư nhân" 100% và tài sản góp vốn là Đồng Việt Nam. Có vốn nhà nước, vốn nước ngoài hay góp bằng tài sản khác thì sửa tay trên giấy.</p>}
      </Nhom>

      <Nhom tieuDe={laDn ? 'Người đại diện theo pháp luật (cũng là người ký "Tôi là")' : 'Chủ hộ kinh doanh'}>
        <NhapCaNhan c={hs.dai_dien} doi={dat('dai_dien')} ten={laDn ? 'người đại diện' : 'chủ hộ'} />
        {laDn && <Truong nhan="Chức danh" gia={hs.chuc_danh} doi={dat('chuc_danh')} goiY="Giám đốc, Tổng giám đốc…" />}
        {hs.loai === 'tnhh1' && (
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">MIMI soạn ca chủ sở hữu là cá nhân và cũng là người đại diện theo pháp luật. Mô hình tổ chức công ty:</p>
            {([['chu_tich', 'Chủ tịch công ty, Giám đốc hoặc Tổng Giám đốc'], ['hdtv', 'Hội đồng thành viên, Giám đốc hoặc Tổng Giám đốc']] as const).map(([k, ten]) => (
              <label key={k} className="flex items-center gap-2"><input type="radio" name="mo-hinh" checked={hs.mo_hinh_1tv === k} onChange={() => dat('mo_hinh_1tv')(k)} /> {ten}</label>
            ))}
          </div>
        )}
      </Nhom>

      {(coThanhVien || hs.loai === 'hkd') && (
        <Nhom tieuDe={hs.loai === 'hkd' ? 'Thành viên hộ gia đình cùng đăng ký (bỏ trống nếu một mình)' : `Danh sách ${tenTv} (cá nhân)`}>
          {hs.thanh_vien.map((t, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-border/70 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{tenTv.charAt(0).toUpperCase() + tenTv.slice(1)} {i + 1}</p>
                <button type="button" onClick={() => doi((h) => ({ ...h, thanh_vien: h.thanh_vien.filter((_, j) => j !== i) }))} className="text-sm text-destructive">Bỏ</button>
              </div>
              <NhapCaNhan c={t} doi={(c) => doiTv(i, c)} ten={tenTv} />
              {coThanhVien && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Truong nhan="Giá trị vốn góp (đồng)" gia={t.von ? soCoDau(t.von) : ''} doi={(v) => doiTv(i, { ...t, von: soTien(v) })} ghi={tongVon > 0 && t.von > 0 ? `${Math.round((t.von / tongVon) * 10000) / 100}% tổng vốn góp` : undefined} />
                  <Truong nhan="Ngày cấp căn cước" kieu="date" gia={t.ngay_cap} doi={(v) => doiTv(i, { ...t, ngay_cap: v })} />
                  <Truong nhan="Nơi cấp" gia={t.noi_cap} doi={(v) => doiTv(i, { ...t, noi_cap: v })} />
                </div>
              )}
            </div>
          ))}
          <button type="button" onClick={() => doi((h) => ({ ...h, thanh_vien: [...h.thanh_vien, nguoiGopVonRong()] }))} className="text-sm text-primary">+ Thêm {tenTv}</button>
          {coThanhVien && (
            <>
              <Truong nhan="Thời hạn góp vốn" gia={hs.thoi_han_gop} doi={dat('thoi_han_gop')} />
              <p className="text-xs text-muted-foreground">Thành viên/cổ đông là tổ chức hoặc nhà đầu tư nước ngoài: MIMI chưa soạn — phần II của danh sách để trống cho bạn tự kê khai.</p>
            </>
          )}
        </Nhom>
      )}

      <Nhom tieuDe={laDn ? 'Thông tin đăng ký thuế' : '5. Thông tin đăng ký thuế'}>
        {laDn && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hs.giam_doc_la_dai_dien} onChange={(e) => dat('giam_doc_la_dai_dien')(e.target.checked)} />
              Giám đốc/Tổng giám đốc là người đại diện theo pháp luật (điền chỉ tiêu Giám đốc từ thông tin trên)
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Truong nhan="Kế toán trưởng/Phụ trách kế toán (nếu có)" gia={hs.ke_toan.ho_ten} doi={(v) => doi((h) => ({ ...h, ke_toan: { ...h.ke_toan, ho_ten: v } }))} />
              <Truong nhan="Số định danh kế toán" gia={hs.ke_toan.so_dinh_danh} doi={(v) => doi((h) => ({ ...h, ke_toan: { ...h.ke_toan, so_dinh_danh: v.replace(/\D/g, '').slice(0, 12) } }))} />
              <Truong nhan="Điện thoại kế toán" gia={hs.ke_toan.dien_thoai} doi={(v) => doi((h) => ({ ...h, ke_toan: { ...h.ke_toan, dien_thoai: v } }))} />
            </div>
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Truong nhan="Ngày bắt đầu hoạt động (bỏ trống nếu từ ngày được cấp)" kieu="date" gia={hs.ngay_bat_dau} doi={dat('ngay_bat_dau')} />
          <Truong nhan="Tổng số lao động (dự kiến)" gia={hs.so_lao_dong} doi={(v) => dat('so_lao_dong')(v.replace(/\D/g, ''))} />
          {laDn && <Truong nhan="Năm tài chính từ ngày … đến ngày" gia={`${hs.nam_tai_chinh_tu} - ${hs.nam_tai_chinh_den}`} doi={(v) => { const [a = '', b = ''] = v.split('-').map((x) => x.trim()); doi((h) => ({ ...h, nam_tai_chinh_tu: a, nam_tai_chinh_den: b })); }} ghi="Năm dương lịch: 01/01 - 31/12" />}
        </div>
        {laDn ? (
          <>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Phương pháp tính thuế GTGT</span>
              <select value={hs.gtgt} onChange={(e) => dat('gtgt')(e.target.value as HoSoDangKy['gtgt'])} className={O}>
                <option value="khau_tru">Khấu trừ</option>
                <option value="truc_tiep_gtgt">Trực tiếp trên GTGT</option>
                <option value="truc_tiep_doanh_so">Trực tiếp trên doanh số</option>
                <option value="khong_nop">Không phải nộp thuế GTGT</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Phương thức đóng bảo hiểm xã hội</span>
              <select value={hs.bhxh} onChange={(e) => dat('bhxh')(e.target.value as HoSoDangKy['bhxh'])} className={O}>
                <option value="hang_thang">Hàng tháng</option>
                <option value="ba_thang">03 tháng một lần</option>
                <option value="sau_thang">06 tháng một lần</option>
              </select>
              <span className="mt-0.5 block text-xs text-muted-foreground">Chỉ ngành chính nông, lâm, ngư, diêm nghiệp trả lương theo sản phẩm/khoán mới được chọn 03 hoặc 06 tháng (lưu ý trong mẫu).</span>
            </label>
          </>
        ) : (
          <div className="flex flex-wrap gap-4 text-sm" role="radiogroup" aria-label="Phương pháp tính thuế GTGT">
            {([['ke_khai', 'Phương pháp kê khai'], ['khoan', 'Phương pháp khoán']] as const).map(([k, ten]) => (
              <label key={k} className="flex items-center gap-2"><input type="radio" name="hkd-gtgt" checked={hs.hkd_gtgt === k} onChange={() => dat('hkd_gtgt')(k)} /> {ten}</label>
            ))}
            {hs.hkd_gtgt === 'khoan' && <p role="alert" className="w-full text-amber-700 dark:text-amber-400">Thuế khoán đã bị bỏ từ 01/01/2026 theo Nghị quyết 198/2025/QH15 (nguồn thứ cấp, chưa đối chiếu) — hỏi cơ quan thuế trước khi chọn.</p>}
          </div>
        )}
      </Nhom>

      {laDn && (
        <Nhom tieuDe="Chủ sở hữu hưởng lợi (Mẫu số 10)">
          <p className="text-xs text-muted-foreground">
            {cshhlTuDong
              ? 'MIMI tự gợi ý những cá nhân sở hữu trực tiếp từ 25% trở lên. Sở hữu gián tiếp, nhóm gia đình/hợp đồng, quyền chi phối thì MIMI không biết — sửa một ô bên dưới để tự quản lý danh sách.'
              : 'Bạn đang tự quản lý danh sách.'}
          </p>
          {dsCshhl.length === 0 && <p className="text-sm text-muted-foreground">Chưa có ai đạt ngưỡng 25%. Theo chú thích 3 Mẫu số 10, khi đó doanh nghiệp kê khai người quản lý có quyền hạn lớn nhất.</p>}
          {dsCshhl.map((c, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-4">
              <p className="text-sm font-medium text-foreground sm:col-span-4">{c.ho_ten || `Người ${i + 1}`} — trực tiếp {c.ty_le_von_truc_tiep || c.ty_le_cp_truc_tiep}%</p>
              <Truong nhan="Tỷ lệ gián tiếp (%)" gia={hs.loai === 'ctcp' ? c.ty_le_cp_gian_tiep : c.ty_le_von_gian_tiep} doi={(v) => doiCshhl(i, hs.loai === 'ctcp' ? 'ty_le_cp_gian_tiep' : 'ty_le_von_gian_tiep', v)} />
              <Truong nhan="Kiểm soát doanh nghiệp (quyền chi phối)" gia={c.kiem_soat} doi={(v) => doiCshhl(i, 'kiem_soat', v)} />
              <Truong nhan="Người quản lý (chức danh)" gia={c.nguoi_quan_ly} doi={(v) => doiCshhl(i, 'nguoi_quan_ly', v)} />
            </div>
          ))}
          {!cshhlTuDong && (
            <button type="button" onClick={() => dat('chu_so_huu_huong_loi')([])} className="text-sm text-primary">Trở lại gợi ý tự động</button>
          )}
        </Nhom>
      )}
    </form>
  );
}
