/**
 * Xuất tin vĩ mô từ `macro_news` thành mầm (seed) cho MiroFish.
 *
 * Chạy:
 *   npx --yes deno run --allow-net --allow-env --allow-write \
 *     research/mirofish-seed/xuat_seed.ts --days 7 --topic policy
 *
 * KHÔNG VIẾT BỘ LỌC MỚI. Đây là điểm quan trọng nhất của file này.
 *
 * `macro-news/analysis.ts` đã phân loại chủ đề và chiều tác động, có 14 test, và
 * đã xử lý đúng một cái bẫy tiếng Việt mà bộ lọc viết vội nào cũng vấp: "hạ" là
 * chuỗi con của "thảo" và "điều hành", nên khớp thô làm "Hội thảo về lãi suất"
 * bị đọc thành tin hạ lãi suất. `src/lib/dailyBrief.ts` thì đã có `tinDangDua()`
 * — cổng lọc còn-mới / có-chủ-đề / có-chiều.
 *
 * Dựng thêm một tầng lọc từ khoá nữa ở đây là làm lại việc đã làm, bằng thứ
 * chưa được kiểm. Script này chỉ ĐỌC kết quả phân loại đã lưu trong bảng và áp
 * đúng `tinDangDua`.
 *
 * ĐỊNH DẠNG RA: JSON, mỗi tin một mục, kèm chủ đề và chiều đã phân loại. Nạp vào
 * MiroFish làm seed material.
 *
 * ĐIỀU KHÔNG LÀM: script này không sinh dự đoán. Dự đoán đến từ MiroFish, và
 * phải đi qua `laPhatBieuKiemChungDuoc()` rồi ghi vào bảng `predictions` kèm
 * ngày đối chiếu — nếu không thì không ai chấm được, và cả bài tập trở thành
 * máy kể chuyện.
 */

import { tinDangDua, type NewsItem } from '../../src/lib/dailyBrief.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ??
  'https://xzymxgdavepvygdcmfup.supabase.co';
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_ANON_KEY') ?? '';

interface Doi {
  days: number;
  topic?: string;
  out: string;
  fromFile?: string;
}

function docThamSo(): Doi {
  const a = Deno.args;
  const lay = (ten: string) => {
    const i = a.indexOf(`--${ten}`);
    return i >= 0 ? a[i + 1] : undefined;
  };
  return {
    days: Number(lay('days') ?? 7),
    topic: lay('topic'),
    out: lay('out') ?? 'research/mirofish-seed/seed.json',
    fromFile: lay('from-file'),
  };
}

/**
 * Đọc tin từ file JSON thay vì gọi mạng.
 *
 * Có hai lý do thật, không phải tiện tay thêm vào:
 *
 * 1. `macro_news` chỉ cho `authenticated` đọc, nên chạy trực tiếp cần service
 *    role key. Truyền khoá đó qua dòng lệnh là để nó nằm lại trong lịch sử
 *    shell — không nên. Đổ dữ liệu ra file bằng công cụ đã có quyền rồi đọc
 *    file thì không phải cầm khoá.
 * 2. Chạy lại được. Một lần mô phỏng phải tái lập được về sau, mà tin thì trôi
 *    đi: bảy ngày nữa cùng câu lệnh sẽ cho tập tin khác. Giữ file đầu vào là
 *    giữ khả năng kiểm chứng.
 */
async function docTuFile(duongDan: string): Promise<NewsItem[]> {
  const raw = JSON.parse(await Deno.readTextFile(duongDan));
  // Nhận cả mảng thuần lẫn bọc {rows: [...]} của supabase db query.
  return Array.isArray(raw) ? raw : (raw.rows ?? []);
}

async function main() {
  const { days, topic, out, fromFile } = docThamSo();

  if (fromFile) {
    const tho = await docTuFile(fromFile);
    await xuat(tho, { days, topic, out, nguon: fromFile });
    return;
  }

  if (!KEY) {
    console.error('Thiếu SUPABASE_SERVICE_ROLE_KEY hoặc SUPABASE_ANON_KEY trong môi trường.');
    console.error('Hoặc dùng --from-file <đường-dẫn.json> để đọc từ file đã đổ sẵn.');
    Deno.exit(1);
  }

  const tu = new Date(Date.now() - days * 86_400_000).toISOString();
  const url = new URL(`${SUPABASE_URL}/rest/v1/macro_news`);
  url.searchParams.set('select', 'id,title,summary,url,source,published_at,topic,impact');
  url.searchParams.set('published_at', `gte.${tu}`);
  url.searchParams.set('order', 'published_at.desc');
  url.searchParams.set('limit', '200');

  const res = await fetch(url, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) {
    console.error(`Truy vấn thất bại: ${res.status} ${await res.text()}`);
    Deno.exit(1);
  }

  const tho = (await res.json()) as NewsItem[];

  /*
   * Phân biệt "bảng rỗng" với "RLS chặn". Hai chuyện này cho ra cùng một kết
   * quả rỗng nhưng cần hai cách xử lý khác hẳn, và đoán nhầm thì mất cả buổi.
   *
   * `macro_news` chỉ có chính sách đọc cho vai trò `authenticated`, nên anon key
   * luôn trả về mảng rỗng, im lặng, HTTP 200.
   */
  if (!tho.length && !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    console.error('Không lấy được tin nào, và đang dùng anon key.');
    console.error('macro_news chỉ có chính sách đọc cho vai trò `authenticated`,');
    console.error('nên anon luôn nhận mảng rỗng — HTTP 200, không báo lỗi gì.');
    console.error('Đặt SUPABASE_SERVICE_ROLE_KEY rồi chạy lại.');
    Deno.exit(1);
  }

  await xuat(tho, { days, topic, out, nguon: 'macro_news (REST)' });
}

interface ThamSoXuat {
  days: number;
  topic?: string;
  out: string;
  nguon: string;
}

async function xuat(tho: NewsItem[], { days, topic, out, nguon }: ThamSoXuat) {
  const homNay = new Date().toISOString().slice(0, 10);

  /*
   * Cùng một cổng lọc mà bản tin hằng ngày dùng. Dùng chung nghĩa là khi quy tắc
   * đổi, cả hai đổi theo — không có chuyện mô phỏng chạy trên một tập tin khác
   * với tập tin người dùng đọc.
   */
  let loc = tho.filter((n) => tinDangDua(n, homNay));
  if (topic) loc = loc.filter((n) => n.topic === topic);

  const seed = {
    sinh_luc: new Date().toISOString(),
    nguon_du_lieu: nguon,
    cua_so_ngay: days,
    loc_chu_de: topic ?? null,
    tong_lay_ve: tho.length,
    sau_khi_loc: loc.length,
    /*
     * Ghi rõ nguồn lọc để người đọc file seed biết nó đã đi qua đâu — một file
     * JSON không có xuất xứ thì vài tuần sau không ai nhớ nó được tạo thế nào.
     */
    quy_tac_loc: 'src/lib/dailyBrief.ts::tinDangDua (còn mới ≤3 ngày, topic ≠ general, impact ≠ neutral)',
    items: loc.map((n) => ({
      id: n.id,
      tieu_de: n.title,
      tom_tat: n.summary,
      nguon: n.source,
      dang_ngay: n.published_at,
      url: n.url,
      chu_de: n.topic,
      chieu_tac_dong: n.impact,
    })),
  };

  await Deno.writeTextFile(out, JSON.stringify(seed, null, 2));

  // Thống kê theo chủ đề — cho biết ngay mầm nghiêng về đâu.
  const theoChuDe = new Map<string, number>();
  for (const n of loc) theoChuDe.set(n.topic, (theoChuDe.get(n.topic) ?? 0) + 1);

  console.log(`Lấy về ${tho.length} tin, còn ${loc.length} sau khi lọc.`);
  for (const [cd, n] of [...theoChuDe].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cd.padEnd(15)} ${n}`);
  }
  console.log(`Đã ghi: ${out}`);

  if (!loc.length) {
    console.log('');
    console.log('Không tin nào qua cổng lọc. Bình thường nếu kỳ này không có tin nào về');
    console.log('lãi suất / tín dụng / tỷ giá / chính sách kèm chiều tác động rõ ràng.');
    console.log('Nới bằng --days lớn hơn, ĐỪNG nới bằng cách hạ chuẩn lọc.');
  }
}

if (import.meta.main) await main();
