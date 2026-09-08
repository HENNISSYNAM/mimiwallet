import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MST_HOP_LE, chuanHoaMst } from '@/lib/maSoThue';

/**
 * Thông tin doanh nghiệp thật, và sửa được.
 *
 * VÌ SAO VIẾT LẠI. Tới 08/09/2026 mục này đọc `companyProfile` từ
 * `src/lib/mockData.ts` — tức mọi người dùng đều thấy **"Công ty TNHH Đức Phát
 * Foods", mã số thuế 0312345678, ngành F&B, TP. Hồ Chí Minh**, bất kể họ đã
 * khai gì lúc đăng ký. Bốn dòng dữ liệu bịa, trình bày như hồ sơ của chính họ,
 * trong màn hình mang tên "Thông tin doanh nghiệp".
 *
 * Nó còn chỉ để đọc, nên không có đường sửa.
 *
 * CHUYỆN ĐÓ CHẶN MỘT TÍNH NĂNG THẬT. `gdt-sync` từ chối khi công ty chưa có mã
 * số thuế, và câu chỉ dẫn của máy chủ là *"Vào Cài đặt và điền mã số thuế"* —
 * trỏ tới đúng màn hình này, nơi hiện mã số thuế của một công ty không có thật
 * và không có ô nào để nhập. Người dùng làm theo hướng dẫn thì đi vào ngõ cụt.
 *
 * Trước đó mã số thuế chỉ nhập được ở luồng đăng ký và thẻ chào mừng — cả hai
 * đều chạy đúng một lần, và bỏ qua là mất luôn.
 *
 * CHỌN CÔNG TY CŨ NHẤT, giống `resolveCompany` phía máy chủ. Một người có thể
 * sở hữu nhiều dòng `companies` (trigger tạo một dòng cho mỗi lần đăng ký), và
 * nếu màn hình này sửa dòng khác với dòng edge function đọc thì người dùng điền
 * mã số thuế xong vẫn bị báo là chưa có.
 */

interface DoanhNghiep {
  id: string;
  name: string | null;
  tax_id: string | null;
  industry: string | null;
  province: string | null;
}

function Dong({ nhan, giaTri }: { nhan: string; giaTri: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-border/20 py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{nhan}</span>
      <span className={giaTri ? 'text-sm font-medium text-foreground' : 'text-sm text-muted-foreground/60'}>
        {giaTri || 'Chưa có'}
      </span>
    </div>
  );
}

export function ThongTinDoanhNghiep() {
  const [dn, setDn] = useState<DoanhNghiep | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [mst, setMst] = useState('');
  const [dangLuu, setDangLuu] = useState(false);

  const tai = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDangTai(false); return; }
    const { data } = await supabase
      .from('companies')
      .select('id, name, tax_id, industry, province')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    setDn((data as DoanhNghiep | null) ?? null);
    setMst(data?.tax_id ?? '');
    setDangTai(false);
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  const luuMst = useCallback(async () => {
    if (!dn) return;
    const sach = chuanHoaMst(mst);
    if (!MST_HOP_LE(sach)) {
      toast.error('Mã số thuế phải là 10 chữ số, hoặc 10 chữ số kèm 3 số chi nhánh.');
      return;
    }
    setDangLuu(true);
    const { error } = await supabase.from('companies').update({ tax_id: sach }).eq('id', dn.id);
    setDangLuu(false);
    if (error) { toast.error(error.message); return; }
    setDn({ ...dn, tax_id: sach });
    /*
     * Không nói "đã xác thực". MIMI chưa tra mã số thuế với cơ quan thuế —
     * `XINVOICE_CLIENT_ID` chưa cấu hình nên `tax-lookup` trả 503. Lưu một mã
     * chưa đối chiếu thì không sao; gọi nó là đã xác thực thì không được.
     */
    toast.success('Đã lưu mã số thuế. Giờ đồng bộ được hoá đơn từ Tổng Cục Thuế.');
  }, [dn, mst]);

  if (dangTai) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" /> Đang tải…
      </div>
    );
  }

  if (!dn) {
    return (
      <p className="py-3 text-sm text-muted-foreground">
        Chưa có hồ sơ doanh nghiệp nào. Đăng xuất rồi đăng nhập lại để tạo hồ sơ.
      </p>
    );
  }

  const daLuu = (dn.tax_id ?? '') === chuanHoaMst(mst);

  return (
    <div>
      <Dong nhan="Tên doanh nghiệp" giaTri={dn.name} />
      <Dong nhan="Ngành nghề" giaTri={dn.industry} />
      <Dong nhan="Tỉnh / Thành phố" giaTri={dn.province} />

      <div className="border-t border-border/20 pt-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted-foreground">Mã số thuế</span>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              value={mst}
              onChange={(e) => setMst(e.target.value)}
              placeholder="10 chữ số"
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm"
            />
            <button
              onClick={() => void luuMst()}
              disabled={dangLuu || daLuu || !mst.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {dangLuu && <Loader2 size={14} className="animate-spin" />}
              {daLuu ? 'Đã lưu' : 'Lưu'}
            </button>
          </div>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          Cần mã số thuế để tải hoá đơn điện tử từ Tổng Cục Thuế — thiếu nó thì không
          phân biệt được hoá đơn bán ra và mua vào.
        </p>
      </div>
    </div>
  );
}
