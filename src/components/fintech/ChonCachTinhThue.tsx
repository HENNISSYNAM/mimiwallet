import { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { soSanhThue, NGUONG_MIEN, TY_LE_TREN_LAI } from '@/lib/soSanhThue';
import { dinhDangTien } from '@/lib/tien';

/**
 * "Tôi nên tính thuế theo cách nào?" — trả lời bằng số của chính họ.
 *
 * VÌ SAO CÂU HỎI ĐƯỢC LẬT NGƯỢC. Cách hiển nhiên là hiện hai con số thuế và
 * bảo chọn cái nhỏ hơn. Nhưng để tính được cách "theo lợi nhuận" thì phải biết
 * chi phí **có chứng từ hợp lệ** — mà MIMI không biết. MIMI thấy tiền ra khỏi
 * tài khoản; khoản nào có hoá đơn đầu vào đủ điều kiện khấu trừ là chuyện khác
 * hẳn. Đưa ra một con số thuế dựa trên chi phí đoán là đưa cho người ta một
 * con số họ sẽ dùng để nộp thuế.
 *
 * Nên câu hỏi lật thành: **cần chứng minh được bao nhiêu chi phí thì cách lợi
 * nhuận mới có lợi?** Chỉ cần doanh thu (MIMI có, đọc từ sao kê) và tỷ lệ ngành
 * (người dùng chọn). Không có ô nào phải đoán.
 *
 * Và đó cũng là con số hữu ích hơn. "Cách A rẻ hơn 7 triệu" là một kết luận.
 * "Bạn cần gom thêm 700 triệu chứng từ nữa" là một việc làm được — và nó chỉ
 * thẳng vào nỗi đau số một của nhóm khách này: không có chứng từ đầu vào.
 */

/**
 * Tỷ lệ thuế thu nhập cá nhân trên doanh thu theo nhóm ngành.
 *
 * Nguồn: biểu tỷ lệ áp cho hộ kinh doanh, khớp với khoảng 0,5–2% nêu trong
 * Nghị quyết 198/2025/QH15. Tra ngày 04/09/2026.
 *
 * Để người dùng chọn chứ không đoán hộ: cùng một doanh thu, ngành 0,5% và ngành
 * 2% cho hai lời khuyên ngược nhau — có test khoá điều đó trong `soSanhThue`.
 */
const NGANH = [
  { ma: 'phan_phoi', ten: 'ui2.thue.nganhPhanPhoi', tyLe: 0.005 },
  { ma: 'khac', ten: 'ui2.thue.nganhKhac', tyLe: 0.01 },
  { ma: 'san_xuat', ten: 'ui2.thue.nganhSanXuat', tyLe: 0.015 },
  { ma: 'dich_vu', ten: 'ui2.thue.nganhDichVu', tyLe: 0.02 },
] as const;

const dong = dinhDangTien;

/** "1 tỷ" — đọc từ hằng số, để lần sau luật đổi ngưỡng thì chữ trên màn hình đổi theo. */
const NGUONG_SO = (NGUONG_MIEN / 1_000_000_000).toString().replace('.', ',');

export function ChonCachTinhThue({
  doanhThu,
  chiPhiCoChungTu = 0,
}: {
  doanhThu: number;
  /**
   * Chi phí đã chứng minh được bằng hoá đơn đầu vào.
   *
   * Mặc định 0 cho nơi gọi chưa có số thật — khi đó `chungTuConThieu` chính là
   * toàn bộ mức cần chứng minh, và câu chữ tự hợp. Truyền số thật vào thì câu
   * trả lời đổi từ "cần gom bao nhiêu" sang "còn thiếu bao nhiêu".
   */
  chiPhiCoChungTu?: number;
}) {
  const [maNganh, setMaNganh] = useState<string>('khac');
  const nganh = NGANH.find((n) => n.ma === maNganh) ?? NGANH[1];

  /*
   * Truyền chi phí = 0 là cố ý, không phải chỗ chưa làm xong.
   *
   * Với chi phí 0, `chungTuConThieu` chính là toàn bộ mức chi phí cần chứng
   * minh để hai cách hoà nhau — đúng con số cần nói. Ngày nào MIMI đếm được
   * chi phí có chứng từ thật thì truyền vào đây, và câu chữ tự đổi.
   */
  const { t } = useTranslation();
  const NGUONG_CHU = t('ui2.thue.ty', { so: NGUONG_SO });
  const kq = useMemo(
    () => soSanhThue({ doanhThu, chiPhiCoChungTu, tyLeNganh: nganh.tyLe }),
    [doanhThu, chiPhiCoChungTu, nganh.tyLe],
  );

  // Hỏi thẳng kết luận của `soSanhThue` thay vì so lại ngưỡng ở đây: hai nơi so
  // hai kiểu (`<` ở đây, `<=` trong hàm) là cách đúng bằng 01 tỷ rơi vào khe hở.
  if (kq.ketLuan === 'ngoai_pham_vi') {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
        <div className="flex items-center gap-2">
          <Scale size={15} className="text-muted-foreground" />
          <p className="text-sm font-semibold">{t('ui2.thue.chonCach')}</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{kq.cau}</p>
      </div>
    );
  }

  const mucHoa = kq.chungTuConThieu ?? 0;
  const phanTram = doanhThu > 0 ? Math.round((mucHoa / doanhThu) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
      <div className="flex items-center gap-2">
        <Scale size={15} className="text-muted-foreground" />
        <p className="text-sm font-semibold">{t('ui2.thue.nenTinh')}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {t('ui2.thue.doanhThuNhom', { doanhThu: dong(doanhThu), nguong: NGUONG_CHU, tran: t('ui2.thue.ty', { so: 3 }) })}
      </p>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('ui2.thue.nganhCuaBan')}</span>
        <select
          value={maNganh}
          onChange={(e) => setMaNganh(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        >
          {NGANH.map((n) => (
            <option key={n.ma} value={n.ma}>
              {t(n.ten)} — {(n.tyLe * 100).toString().replace('.', ',')}%
            </option>
          ))}
        </select>
      </label>

      {/* Con số duy nhất đáng nhớ trên khối này. */}
      <div className="mt-4 rounded-xl bg-primary/5 p-4">
        <p className="font-mono text-2xl font-bold text-foreground">{dong(mucHoa)}</p>
        <p className="mt-1 text-sm text-foreground/80">
          {chiPhiCoChungTu > 0
            ? t('ui2.thue.conThieu', { daCo: dong(chiPhiCoChungTu) })
            : t('ui2.thue.canChungMinh', { phanTram })}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">{t('ui2.thue.theoTyLe')}</p>
          <p className="mt-0.5 font-mono font-semibold">{dong(kq.theoDoanhThu ?? 0)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {(nganh.tyLe * 100).toString().replace('.', ',')}% × ({t('ui2.thue.doanhThu')} − {NGUONG_CHU}) · {t('ui2.thue.khongCanChungTu')}
          </p>
        </div>
        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">{t('ui2.thue.theoThuNhap')}</p>
          <p className="mt-0.5 font-mono font-semibold">
            {(TY_LE_TREN_LAI * 100).toString()}% × {t('ui2.thue.lai')}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('ui2.thue.canChungTuTungKhoan')}
          </p>
        </div>
      </div>

      {/*
        Câu cuối là câu bắt buộc, không phải câu lịch sự. Cùng kỷ luật với
        `tax-summary`: tính ra một con số không có nghĩa là con số đó thay được
        cơ quan thuế.
      */}
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {t('ui2.thue.canCu', { nguong: NGUONG_CHU })}
      </p>
    </div>
  );
}
