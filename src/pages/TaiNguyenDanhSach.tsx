import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TheBai from '@/components/tai-nguyen/TheBai';
import { CAU_HINH_LOAI, docDanhSach, loaiTuDuong, type BaiTaiNguyen, type LoaiTaiNguyen } from '@/lib/taiNguyen';
import NotFound from './NotFound';

/**
 * Danh sách bài của một loại tài nguyên (/tai-nguyen/:loai). Chưa có bài thì nói thẳng là chưa có —
 * không bày bài mẫu.
 */
export function DanhSachBai({ loai }: { loai: LoaiTaiNguyen }) {
  const [bai, setBai] = useState<BaiTaiNguyen[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    let huy = false;
    setBai(null);
    setLoi(null);
    docDanhSach(loai)
      .then((d) => { if (!huy) setBai(d); })
      .catch(() => { if (!huy) setLoi('Chưa tải được danh sách. Thử lại sau ít phút.'); });
    return () => { huy = true; };
  }, [loai]);

  if (loi) return <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{loi}</p>;
  if (!bai) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Đang tải…</p>;
  }
  if (!bai.length) {
    return <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{CAU_HINH_LOAI[loai].rong}</p>;
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {bai.map((b) => <TheBai key={b.id} b={b} />)}
    </div>
  );
}

export default function TaiNguyenDanhSach() {
  const { loai: duong } = useParams();
  const loai = loaiTuDuong(duong);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [duong]);
  if (!loai || loai === 'tuyen_dung') return <NotFound />;
  const ch = CAU_HINH_LOAI[loai];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="mimi-hero-warm border-b border-border/60">
        <div className="container mx-auto px-4 pt-32 pb-14 lg:px-8 lg:pt-40">
          <nav aria-label="Đường dẫn" className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Trang chủ</Link>
            <ChevronRight size={14} />
            <span>Tài nguyên</span>
          </nav>
          <h1 className="mimi-tieu-de-trang mt-4 text-foreground">{ch.ten}</h1>
          <p className="mimi-doan-dan mt-4 max-w-2xl text-muted-foreground">{ch.mo}</p>
        </div>
      </section>
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <DanhSachBai loai={loai} />
        </div>
      </section>
      <Footer />
    </div>
  );
}
