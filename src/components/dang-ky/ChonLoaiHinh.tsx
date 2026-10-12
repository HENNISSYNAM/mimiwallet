import { useState } from 'react';
import { goiYLoaiHinh, LOAI_HINH, MO_TA, type LoaiHinh, type TraLoiChon } from '@/lib/dangKy/loaiHinh';
import NhanNguon from './NhanNguon';

/**
 * Bước 1 — ba câu hỏi để gợi ý loại hình, rồi bảng khác biệt chính (trách nhiệm, số thành viên,
 * thuế) của bốn loại, mỗi ô kèm căn cứ. Người dùng vẫn tự chọn: gợi ý chỉ là điểm bắt đầu.
 */
export default function ChonLoaiHinh({ loai, chon }: { loai: LoaiHinh; chon: (l: LoaiHinh) => void }) {
  const [tl, setTl] = useState<TraLoiChon>({ so_nguoi: null, nho_le_gia_dinh: null, muon_co_phan: null });
  const goiY = goiYLoaiHinh(tl);

  const CoKhong = ({ ten, gia, doi }: { ten: string; gia: boolean | null; doi: (v: boolean) => void }) => (
    <div className="flex gap-4 text-sm" role="radiogroup" aria-label={ten}>
      {([[true, 'Có'], [false, 'Không']] as const).map(([v, nhan]) => (
        <label key={nhan} className="flex items-center gap-1.5">
          <input type="radio" name={ten} checked={gia === v} onChange={() => doi(v)} /> {nhan}
        </label>
      ))}
    </div>
  );

  return (
    <section aria-labelledby="dkkd-buoc-1" className="space-y-4 rounded-xl border border-border p-4">
      <h2 id="dkkd-buoc-1" className="text-lg font-semibold text-foreground">1. Chọn loại hình</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">Bao nhiêu người (cá nhân, tổ chức) cùng góp vốn, tính cả bạn?</span>
          <input
            type="number" min={1} inputMode="numeric"
            value={tl.so_nguoi ?? ''}
            onChange={(e) => setTl((x) => ({ ...x, so_nguoi: e.target.value ? Number(e.target.value) : null }))}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <div className="text-sm">
          <span className="mb-1 block font-medium text-foreground">Kinh doanh nhỏ, một mình hoặc cùng gia đình, chấp nhận chịu trách nhiệm bằng toàn bộ tài sản để thủ tục gọn nhất?</span>
          <CoKhong ten="Kinh doanh nhỏ, gia đình" gia={tl.nho_le_gia_dinh} doi={(v) => setTl((x) => ({ ...x, nho_le_gia_dinh: v }))} />
        </div>
        <div className="text-sm">
          <span className="mb-1 block font-medium text-foreground">Muốn chia vốn thành cổ phần để gọi nhà đầu tư, chuyển nhượng dễ?</span>
          <CoKhong ten="Muốn cổ phần" gia={tl.muon_co_phan} doi={(v) => setTl((x) => ({ ...x, muon_co_phan: v }))} />
        </div>
      </div>

      <div role="status" className="rounded-lg bg-muted/40 p-3 text-sm">
        {goiY.loai ? (
          <>
            <p className="font-medium text-foreground">MIMI gợi ý: {MO_TA[goiY.loai].ten}</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">{goiY.ly_do.map((l) => <li key={l}>{l}</li>)}</ul>
            {goiY.loai !== loai && (
              <button type="button" onClick={() => chon(goiY.loai!)} className="mt-2 rounded-lg border border-primary px-3 py-1.5 text-sm text-primary">
                Dùng loại hình này
              </button>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">{goiY.ly_do[0]}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="mb-2 text-left text-sm text-muted-foreground">Khác biệt chính — bấm vào nhãn để xem căn cứ. Loại đang soạn được tô đậm.</caption>
          <thead>
            <tr className="text-left">
              <th className="border-b border-border p-2">Loại hình</th>
              <th className="border-b border-border p-2">Trách nhiệm</th>
              <th className="border-b border-border p-2">Số thành viên</th>
              <th className="border-b border-border p-2">Thuế khi đăng ký</th>
            </tr>
          </thead>
          <tbody>
            {LOAI_HINH.map((l) => {
              const m = MO_TA[l];
              return (
                <tr key={l} className={l === loai ? 'bg-primary/5' : undefined}>
                  <th scope="row" className="border-b border-border p-2 align-top text-left">
                    <label className="flex items-start gap-2 font-medium">
                      <input type="radio" name="loai-hinh" checked={l === loai} onChange={() => chon(l)} aria-label={`Soạn hồ sơ ${m.ten}`} />
                      {m.ten}
                    </label>
                  </th>
                  {[m.trach_nhiem, m.so_thanh_vien, m.thue].map((d, i) => (
                    <td key={i} className="border-b border-border p-2 align-top">{d.chu}<NhanNguon cc={d.can_cu} /></td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Doanh nghiệp tư nhân và công ty hợp danh chưa có trong trang này: MIMI chưa đọc mẫu gốc của hai loại đó nên không gợi ý.
      </p>
    </section>
  );
}
