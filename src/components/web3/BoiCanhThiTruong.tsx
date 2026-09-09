import { useTranslation } from 'react-i18next';
import { AlertTriangle, ExternalLink, Info, Scale, TrendingUp } from 'lucide-react';

/**
 * Thẻ bối cảnh: những gì đang xảy ra, và bằng chứng của từng câu.
 *
 * MỌI CÂU CHỮ DỰNG TẠI ĐÂY, KHÔNG ĐẾN TỪ MÁY CHỦ. Máy chủ trả về mã sự kiện và
 * tham số; component tra bản dịch theo ngôn ngữ đang bật. Đó là điều kiện để
 * bán ra ngoài Việt Nam, và cũng đúng cho người dùng Việt bật giao diện tiếng
 * Anh.
 *
 * KHÔNG DÒNG NÀO ĐƯỢC HIỆN MÀ THIẾU NGUỒN. `dan` luôn hiện cạnh câu, và có
 * `url` thì bấm được. Người đọc phải kiểm được, chứ không phải tin.
 */

export interface BangChungUI {
  nguon: 'thi_truong' | 'vi_mo' | 'phap_ly';
  ma: string;
  thamSo: Record<string, string | number>;
  dan: string;
  url?: string;
}

export interface BoiCanhUI {
  mucChuY: 'binh_thuong' | 'dang_chu_y' | 'can_doc_ky';
  maMoDau: string;
  thamSoMoDau: Record<string, string | number>;
  bangChung: BangChungUI[];
  quocGia: string[];
}

const BIEU_TUONG = {
  thi_truong: TrendingUp,
  vi_mo: Info,
  phap_ly: Scale,
} as const;

const MAU_MUC = {
  binh_thuong: 'bg-muted text-muted-foreground',
  dang_chu_y: 'bg-amber-500/10 text-amber-700 dark:text-amber-500',
  can_doc_ky: 'bg-primary/10 text-primary',
} as const;

export function BoiCanhThiTruong({
  boiCanh,
  suCo,
}: {
  boiCanh: BoiCanhUI;
  suCo: Array<{ nguon: string; loi: string }>;
}) {
  const { t, i18n } = useTranslation();
  const so = (n: number, le = 2) =>
    n.toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN', {
      maximumFractionDigits: le,
    });

  /**
   * Ghép câu cho một dòng bằng chứng.
   *
   * Giá có hai bản: kèm thay đổi 24h và không kèm. Máy chủ BỎ HẲN `doi24h` khi
   * không sàn nào trả về, thay vì gửi 0 — nên ở đây phải chọn bản đúng chứ
   * không ghép một câu nói "đứng giá".
   */
  const cau = (b: BangChungUI): string => {
    if (b.ma === 'gia.hien_tai') {
      const coDoi = typeof b.thamSo.doi24h === 'number';
      const doi = Number(b.thamSo.doi24h ?? 0);
      return t(coDoi ? 'web3.suKien.gia.hien_tai_kem_doi' : 'web3.suKien.gia.hien_tai', {
        ma: b.thamSo.ma,
        gia: so(Number(b.thamSo.gia)),
        soSan: b.thamSo.soSan,
        huong: t(doi >= 0 ? 'web3.huong.tang' : 'web3.huong.giam'),
        doi24h: so(Math.abs(doi)),
      });
    }
    if (b.ma === 'gia.lech_bat_thuong') {
      return t('web3.suKien.gia.lech_bat_thuong', {
        ma: b.thamSo.ma,
        lech: so(Number(b.thamSo.lech)),
      });
    }
    return t(`web3.suKien.${b.ma}`, b.thamSo);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${MAU_MUC[boiCanh.mucChuY]}`}>
          {t(`web3.mucChuY.${boiCanh.mucChuY}`)}
        </span>
        {boiCanh.quocGia.map((q) => (
          <span key={q} className="rounded-full bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
            {q}
          </span>
        ))}
      </div>

      <p className="mt-3 text-base font-semibold text-foreground">
        {t(`web3.moDau.${boiCanh.maMoDau}`, boiCanh.thamSoMoDau)}
      </p>

      {boiCanh.bangChung.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t('web3.khongCoBangChung')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {boiCanh.bangChung.map((b, i) => {
            const Icon = BIEU_TUONG[b.nguon];
            return (
              <li key={`${b.ma}-${i}`} className="flex gap-3">
                <Icon size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{cau(b)}</p>
                  {/* Nguồn luôn đi cùng câu. Không có nguồn thì dòng không tồn tại. */}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t(`web3.nguon.${b.nguon}`)} · {b.dan}
                    {b.url && (
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1.5 inline-flex items-center gap-0.5 text-primary hover:underline"
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/*
        Sự cố hiện cạnh kết quả, không thay thế kết quả. Một sàn chết thì phần
        còn lại vẫn dùng được — nhưng "chỉ một sàn trả lời" phải trông khác
        "hai sàn khớp nhau", nếu không người đọc tin vào một con số không có
        đối chứng.
      */}
      {suCo.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-500">
            <AlertTriangle size={13} /> {t('web3.suCo.tieuDe')}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {suCo.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {t('web3.suCo.mo_ta', { nguon: s.nguon, loi: s.loi })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t('web3.luuY')}</p>
    </div>
  );
}
