/**
 * Xoá tệp trong Storage khi xoá tài khoản — hàm thuần, nhận client kho tệp được tiêm vào.
 *
 * Vì sao phải có: `auth.admin.deleteUser` chỉ cuốn theo DÒNG trong CSDL bằng CASCADE. Tệp trong
 * Storage (ảnh chứng từ, tài liệu, giấy tờ KYC) nằm ở `storage.objects` và không có khoá ngoài nào
 * trỏ tới công ty, nên còn nguyên sau khi tài khoản biến mất — dữ liệu cá nhân và số liệu công ty
 * mồ côi, không ai còn đường dẫn để xoá.
 *
 * Quy ước đường dẫn ở cả ba bucket: thư mục đầu tiên là id công ty (`{company_id}/…`). Nên chỉ có
 * thể dọn được KHI CÒN BIẾT id công ty — tức là phải chạy TRƯỚC khi xoá dòng công ty.
 *
 * Bốn điều hàm này cam kết:
 *   1. Phân trang: một thư mục có thể có hơn 1000 tệp (giới hạn một lần `list`); lặp tới khi hết.
 *   2. Thư mục lồng nhau: `list` chỉ trả cấp hiện tại, thư mục con có `id === null` → đi vào xoá tiếp.
 *   3. Chạy lại được (idempotent): không còn gì thì trả 0 tệp, không lỗi.
 *   4. Không nói dối: mọi lời gọi lỗi đều vào báo cáo; `hoan_tat` chỉ true khi KHÔNG lỗi nào và
 *      lần liệt kê cuối cùng đã trống.
 */

/** Một mục do `list` trả về. Thư mục ảo có `id === null`; tệp thật có `id` là chuỗi. */
export interface MucKho {
  name: string;
  id: string | null;
}

export interface LoiKho {
  message: string;
  statusCode?: string | number;
}

/** Phần tối thiểu của client kho tệp mà module này cần. `tuSupabase` bọc client thật thành dạng này. */
export interface KhoTep {
  list(bucket: string, thuMuc: string, tuyChon: { limit: number; offset: number }): Promise<{ data: MucKho[] | null; error: LoiKho | null }>;
  remove(bucket: string, duongDan: string[]): Promise<{ data: unknown; error: LoiKho | null }>;
}

/** Bọc `supabase.storage` (service role) thành `KhoTep`. */
export function tuSupabase(client: {
  storage: {
    from(bucket: string): {
      list(path?: string, options?: { limit?: number; offset?: number }): Promise<{ data: MucKho[] | null; error: LoiKho | null }>;
      remove(paths: string[]): Promise<{ data: unknown; error: LoiKho | null }>;
    };
  };
}): KhoTep {
  return {
    list: (bucket, thuMuc, tuyChon) => client.storage.from(bucket).list(thuMuc, tuyChon),
    remove: (bucket, duongDan) => client.storage.from(bucket).remove(duongDan),
  };
}

/** Các bucket có dữ liệu người dùng/công ty. Thêm bucket mới vào đây khi có (test giữ cho khớp mã). */
export const BUCKET_DU_LIEU = ['chung-tu', 'tai-lieu', 'secure-documents'] as const;

export const CO_LIST_TOI_DA = 1000;
const CO_XOA_MOT_LAN = 100;
/** Chặn vòng lặp vô hạn khi kho trả dữ liệu lạ; 10.000 vòng × 1000 mục = 10 triệu tệp mỗi thư mục. */
const VONG_TOI_DA = 10_000;

export interface KetQuaThuMuc {
  bucket: string;
  /** Thư mục gốc đã dọn, không có dấu `/` cuối. */
  thu_muc: string;
  so_tep_da_xoa: number;
  /** Rỗng nghĩa là mọi lời gọi thành công. */
  loi: string[];
  /** Bucket không tồn tại: không có gì để xoá, không tính là lỗi. */
  khong_co_bucket: boolean;
  /** true khi không lỗi nào VÀ thư mục đã trống ở lần liệt kê cuối. */
  hoan_tat: boolean;
}

function laBucketKhongCo(e: LoiKho): boolean {
  return String(e.statusCode) === '404' || /bucket not found/i.test(e.message);
}

const chuan = (s: string) => s.replace(/^\/+|\/+$/g, '');
const noi = (a: string, b: string) => (a ? `${a}/${b}` : b);

/** Xoá đệ quy mọi thứ dưới `bucket/thuMuc`. Không ném lỗi: lỗi vào `loi` của kết quả. */
export async function xoaThuMuc(kho: KhoTep, bucket: string, thuMuc: string): Promise<KetQuaThuMuc> {
  const goc = chuan(thuMuc);
  const kq: KetQuaThuMuc = { bucket, thu_muc: goc, so_tep_da_xoa: 0, loi: [], khong_co_bucket: false, hoan_tat: false };
  // Chống xoá nhầm cả bucket: thư mục gốc rỗng bị từ chối, không phải "xoá hết".
  if (!goc) {
    kq.loi.push('thư mục gốc rỗng — từ chối xoá cả bucket');
    return kq;
  }
  await xoaDeQuy(kho, kq, goc);
  kq.hoan_tat = kq.loi.length === 0;
  return kq;
}

async function xoaDeQuy(kho: KhoTep, kq: KetQuaThuMuc, thuMuc: string): Promise<void> {
  const daThamThuMuc = new Set<string>();
  for (let vong = 0; vong < VONG_TOI_DA; vong++) {
    // Luôn đọc offset 0: sau mỗi lần xoá, danh sách co lại nên trang đầu luôn là phần chưa xoá.
    // (Phân trang theo offset trong lúc xoá sẽ nhảy cóc và bỏ sót tệp.)
    const { data, error } = await kho.list(kq.bucket, thuMuc, { limit: CO_LIST_TOI_DA, offset: 0 });
    if (error) {
      if (laBucketKhongCo(error)) {
        kq.khong_co_bucket = true;
        return;
      }
      kq.loi.push(`liệt kê ${kq.bucket}/${thuMuc}: ${error.message}`);
      return;
    }
    const muc = data ?? [];
    if (muc.length === 0) return;

    const tep = muc.filter((m) => m.id !== null).map((m) => noi(thuMuc, m.name));
    const thuMucCon = muc.filter((m) => m.id === null).map((m) => noi(thuMuc, m.name));

    for (let i = 0; i < tep.length; i += CO_XOA_MOT_LAN) {
      const lo = tep.slice(i, i + CO_XOA_MOT_LAN);
      const { error: loiXoa } = await kho.remove(kq.bucket, lo);
      if (loiXoa) {
        // Dừng ngay: nếu cứ liệt kê lại thì gặp đúng các tệp không xoá được và lặp mãi.
        kq.loi.push(`xoá ${lo.length} tệp trong ${kq.bucket}/${thuMuc}: ${loiXoa.message}`);
        return;
      }
      kq.so_tep_da_xoa += lo.length;
    }

    const chuaThamThuMuc = thuMucCon.filter((t) => !daThamThuMuc.has(t));
    for (const con of chuaThamThuMuc) {
      daThamThuMuc.add(con);
      await xoaDeQuy(kho, kq, con);
      if (kq.loi.length) return;
    }

    // Không tệp nào vừa xoá và không thư mục con nào mới: vào thư mục con đã dọn xong mà nó vẫn hiện
    // thì kho không cho gỡ — dừng, báo lỗi thay vì quay vô hạn.
    if (tep.length === 0 && chuaThamThuMuc.length === 0) {
      kq.loi.push(`${kq.bucket}/${thuMuc}: còn ${thuMucCon.length} thư mục con không gỡ được`);
      return;
    }
  }
  kq.loi.push(`${kq.bucket}/${thuMuc}: quá ${VONG_TOI_DA} vòng, dừng để tránh lặp vô hạn`);
}

export interface BaoCaoKho {
  /** true CHỈ khi mọi thư mục ở mọi bucket dọn xong không lỗi. */
  ok: boolean;
  so_tep_da_xoa: number;
  ket_qua: KetQuaThuMuc[];
  /** Các thư mục chưa dọn xong, để nói thật với người dùng. */
  that_bai: { bucket: string; thu_muc: string; loi: string[] }[];
}

/**
 * Dọn mọi thư mục trong mọi bucket. Một bucket lỗi KHÔNG chặn các bucket còn lại (dọn được bao nhiêu
 * hay bấy nhiêu, rồi báo cáo đúng phần hỏng) — nhưng `ok` chỉ true khi tất cả sạch.
 */
export async function xoaKhoTep(
  kho: KhoTep,
  o: { thuMuc: string[]; buckets?: readonly string[] },
): Promise<BaoCaoKho> {
  const buckets = o.buckets ?? BUCKET_DU_LIEU;
  const thuMuc = [...new Set(o.thuMuc.map(chuan).filter(Boolean))];
  const ket_qua: KetQuaThuMuc[] = [];
  for (const bucket of buckets) {
    for (const t of thuMuc) {
      try {
        ket_qua.push(await xoaThuMuc(kho, bucket, t));
      } catch (e) {
        // Client kho ném thay vì trả `error`: vẫn là một lần thất bại, không được nuốt.
        ket_qua.push({ bucket, thu_muc: t, so_tep_da_xoa: 0, loi: [`ngoại lệ: ${(e as Error)?.message ?? String(e)}`], khong_co_bucket: false, hoan_tat: false });
      }
    }
  }
  const that_bai = ket_qua.filter((r) => !r.hoan_tat).map((r) => ({ bucket: r.bucket, thu_muc: r.thu_muc, loi: r.loi }));
  return {
    ok: that_bai.length === 0,
    so_tep_da_xoa: ket_qua.reduce((n, r) => n + r.so_tep_da_xoa, 0),
    ket_qua,
    that_bai,
  };
}
