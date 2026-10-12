import { Fragment, type CSSProperties, type ReactNode } from 'react';
import type { Khoi, VanBanMau } from '@/lib/dangKy/mau';

/**
 * Vẽ một mẫu đăng ký (danh sách khối từ `lib/dangKy/mau.ts`) thành trang giấy để xem trước và in.
 *
 * Chữ có chân, cỡ ~13pt như văn bản hành chính; ô trống in dòng chấm để người dùng còn viết tay
 * được. Danh sách nhiều cột (Mẫu số 6, 7, 10) in khổ ngang bằng trang tên riêng `dang-ky-ngang` —
 * khai trong thẻ <style> ngay tại đây vì chỉ mẫu này cần, không đụng `@page` chung của index.css.
 */

const CHAM = '……………………………………';

function Sup({ n }: { n?: number }) {
  return n ? <sup>{n}</sup> : null;
}

function KhoiIn({ k }: { k: Khoi }): ReactNode {
  switch (k.k) {
    case 'so_mau':
      return <p style={{ textAlign: 'right', fontWeight: 700 }}>{k.chu}</p>;
    case 'quoc_hieu':
      return (
        <div style={{ textAlign: 'center', fontWeight: 700, margin: '4px 0 6px' }}>
          <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style={{ textDecoration: 'underline' }}>Độc lập - Tự do - Hạnh phúc</div>
        </div>
      );
    case 'ngay':
      return <p style={{ textAlign: 'right', fontStyle: 'italic' }}>{k.chu}</p>;
    case 'tieu_de':
      return (
        <h2 style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.08em', margin: '10px 0 8px' }}>
          {k.dong.map((d, i) => <div key={i}>{d}</div>)}
        </h2>
      );
    case 'can_giua':
      return <p style={{ textAlign: 'center', fontWeight: 600, fontStyle: k.nghieng ? 'italic' : undefined }}>{k.chu}</p>;
    case 'muc':
      return (
        <p style={{ fontWeight: 700, marginTop: 8 }}>
          {k.chu}<Sup n={k.cc} />
          {k.nghieng ? <span style={{ fontWeight: 400, fontStyle: 'italic' }}> ({k.nghieng})</span> : null}
          {k.sau ? <span style={{ fontWeight: 400 }}>{k.sau}</span> : k.nghieng ? ':' : null}
        </p>
      );
    case 'dong':
      return (
        <p style={{ paddingLeft: k.thut ? '1.5em' : undefined }}>
          {k.nhan}<Sup n={k.cc} />
          {k.nghieng ? <i> ({k.nghieng})</i> : null}: {k.gia.trim() ? <span data-gia>{k.gia}</span> : <span aria-hidden>{CHAM}</span>}
        </p>
      );
    case 'doan':
      return (
        <p style={{ fontStyle: k.nghieng ? 'italic' : undefined, fontWeight: k.dam ? 700 : undefined, textAlign: 'justify' }}>
          {k.chu}<Sup n={k.cc} />
        </p>
      );
    case 'o':
      return (
        <div style={{ display: 'flex', flexDirection: k.ngang ? 'row' : 'column', flexWrap: 'wrap', gap: k.ngang ? '4px 28px' : 2, margin: '2px 0 4px' }}>
          {k.muc.map((m, i) => (
            <span key={i} data-o={m.chon ? 'chon' : 'trong'}>
              <span style={{ fontFamily: 'Segoe UI Symbol, DejaVu Sans, sans-serif' }}>{m.chon ? '☒' : '☐'}</span> {m.nhan}<Sup n={m.cc} />
            </span>
          ))}
        </div>
      );
    case 'khung':
      return (
        <div style={{ border: '1px solid currentColor', padding: '4px 8px', margin: '4px 0' }} className="khong-ngat">
          {k.khoi.map((x, i) => <KhoiIn key={i} k={x} />)}
        </div>
      );
    case 'bang':
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0 8px', fontSize: k.nho ? '0.72em' : '0.92em' }}>
          <thead>
            {k.dau.map((h, i) => (
              <tr key={i}>
                {h.map((o, j) => (
                  <th key={j} colSpan={o.cot} rowSpan={o.hang} style={{ border: '1px solid currentColor', padding: '2px 4px', fontWeight: 700, verticalAlign: 'middle' }}>{o.chu}</th>
                ))}
              </tr>
            ))}
            {k.so_cot ? (
              <tr>{k.so_cot.map((s, j) => <th key={j} style={{ border: '1px solid currentColor', padding: '1px 2px', fontWeight: 700 }}>{s}</th>)}</tr>
            ) : null}
          </thead>
          <tbody>
            {k.dong.map((h, i) => (
              <tr key={i}>
                {h.map((o, j) => (
                  <td key={j} colSpan={o.cot} rowSpan={o.hang} style={{ border: '1px solid currentColor', padding: '2px 4px', verticalAlign: 'top', whiteSpace: 'pre-line', height: '1.6em' }}>{o.chu}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'ky':
      return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }} className="khong-ngat">
          <div style={{ textAlign: 'center', minWidth: '50%' }}>
            {k.ngay ? <p style={{ fontStyle: 'italic' }}>{k.ngay}</p> : null}
            {k.chuc_danh.map((d, i) => <div key={i} style={{ fontWeight: 700 }}>{d}</div>)}
            <div style={{ fontStyle: 'italic' }}>(Ký và ghi họ tên)<Sup n={k.cc} /></div>
            <div style={{ height: 64 }} />
            <div style={{ fontWeight: 700 }}>{k.ten}</div>
          </div>
        </div>
      );
    case 'chu_thich':
      return (
        <div style={{ borderTop: '1px solid currentColor', marginTop: 16, paddingTop: 4, fontSize: '0.72em', width: '100%' }}>
          {k.dong.map((d, i) => {
            const m = /^([\d, ]+?)\s(.*)$/.exec(d);
            return <p key={i}>{m ? <><sup>{m[1]}</sup> {m[2]}</> : d}</p>;
          })}
        </div>
      );
  }
}

export default function GiayIn({ vanBan, ngatTruoc }: { vanBan: VanBanMau; ngatTruoc?: boolean }) {
  return (
    <article
      aria-label={vanBan.ten}
      data-ma={vanBan.ma}
      className="bg-white text-black"
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: 13.5,
        lineHeight: 1.45,
        padding: '18px 22px',
        // Danh sách nhiều cột: trang ngang riêng. Các văn bản sau văn bản đầu: sang trang mới khi in cả bộ.
        page: vanBan.ngang ? 'dang-ky-ngang' : undefined,
        breakBefore: ngatTruoc ? 'page' : undefined,
      } as CSSProperties}
    >
      {vanBan.khoi.map((k, i) => <Fragment key={i}><KhoiIn k={k} /></Fragment>)}
    </article>
  );
}

/** Trang in ngang cho Mẫu số 6, 7, 10 — chỉ có tác dụng khi in. */
export function KieuInDangKy() {
  return <style>{'@page dang-ky-ngang { size: A4 landscape; margin: 12mm; }'}</style>;
}
