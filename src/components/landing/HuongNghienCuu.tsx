import { useTranslation } from 'react-i18next';
import { FlaskConical } from 'lucide-react';

/**
 * HƯỚNG NGHIÊN CỨU (02/10/2026) — các công nghệ tài chính tiên tiến MIMI đang theo dõi, kèm đánh giá thẳng thắn có hợp
 * với MIMI lúc này không. NÓI THẬT: KHÔNG cái nào trong số này có trong sản phẩm. Nhãn trạng thái và câu dẫn nói rõ
 * điều đó, để không ai (khách, giám khảo, nhà đầu tư) đọc thành tính năng. Đánh giá gốc: phân tích của đội ngày
 * 02/10/2026; thứ MIMI làm trước được ghi ở docs/BAI_TOAN_LOI_BIG4.md.
 *
 * Chữ để ngay trong tệp theo 4 ngôn ngữ (như ManHinhChoDemo) để không giẫm lên bộ dịch đang được chuyển.
 */

type TrangThai = 'chua' | 'khong' | 'sau';
interface Muc { ten: string; trangThai: TrangThai; ly_do: string }
interface Bo { tieuDe: string; dan: string; trangThai: Record<TrangThai, string>; muc: Muc[]; ketLuan: string }

const BO: Record<string, Bo> = {
  vi: {
    tieuDe: 'Hướng nghiên cứu',
    dan: 'Những công nghệ tài chính tiên tiến chúng tôi đang theo dõi, và đánh giá thẳng thắn chúng có hợp với MIMI lúc này không. Chưa cái nào có trong sản phẩm.',
    trangThai: { chua: 'Chưa làm', khong: 'Không chọn', sau: 'Để sau' },
    muc: [
      { ten: 'Học liên bang (Federated Learning, FATE)', trangThai: 'chua', ly_do: 'Cần nhiều tổ chức cùng có dữ liệu thật để huấn luyện chung. Khi có nhiều kế toán dịch vụ, một bảng so sánh số liệu gộp (không lộ từng hộ) đã đủ.' },
      { ten: 'Blockchain liên minh (FISCO BCOS)', trangThai: 'khong', ly_do: 'Cần một nhóm tổ chức cùng vận hành. MIMI đã có sổ cái băm nối chuỗi, neo dấu thời gian công khai, người ngoài tự kiểm được mà không cần ai vận hành chung.' },
      { ten: 'Mật mã nâng cao (ZKP, FHE)', trangThai: 'sau', ly_do: 'FHE còn quá chậm cho việc này. ZKP có chỗ dùng: chứng minh doanh thu dưới một ngưỡng mà không đưa sao kê. Việc trước tiên là bằng chứng truy ngược được từng dòng.' },
      { ten: 'GAN sinh dữ liệu gian lận (FDGAN)', trangThai: 'chua', ly_do: 'MIMI kiểm bằng quy tắc rõ ràng và bộ ca thử có đáp án. Dữ liệu do GAN sinh có thể dạy hệ thống sai theo cách khó phát hiện.' },
    ],
    ketLuan: 'Việc MIMI làm trước: kiểm sao kê đủ bằng cộng dồn số dư, chuỗi bằng chứng từ sao kê tới tờ khai, và tính thuế theo ngày hiệu lực của luật.',
  },
  en: {
    tieuDe: 'Research directions',
    dan: 'Advanced financial technologies we are watching, with an honest view of whether they fit MIMI today. None of them is in the product.',
    trangThai: { chua: 'Not yet', khong: 'Not chosen', sau: 'Later' },
    muc: [
      { ten: 'Federated learning (FATE)', trangThai: 'chua', ly_do: 'It needs several organisations with real data training together. With many accounting firms, an aggregated comparison (no single business exposed) is enough.' },
      { ten: 'Consortium blockchain (FISCO BCOS)', trangThai: 'khong', ly_do: 'It needs a group of operators. MIMI already has a hash-chained ledger with public timestamps that outsiders can verify on their own.' },
      { ten: 'Advanced cryptography (ZKP, FHE)', trangThai: 'sau', ly_do: 'FHE is still too slow here. ZKP has a use: proving revenue is below a threshold without sharing statements. Line-by-line traceable evidence comes first.' },
      { ten: 'Fraud-data GANs (FDGAN)', trangThai: 'chua', ly_do: 'MIMI checks with explicit rules and labelled test cases. GAN-generated data can teach a system wrong in ways that are hard to spot.' },
    ],
    ketLuan: 'What MIMI builds first: proving bank statements are complete with running balances, an evidence chain from statement line to tax return, and tax rules versioned by effective date.',
  },
  ko: {
    tieuDe: '연구 방향',
    dan: '저희가 주목하는 첨단 금융 기술과, 지금 MIMI에 맞는지에 대한 솔직한 평가입니다. 아직 제품에 포함된 것은 없습니다.',
    trangThai: { chua: '아직', khong: '채택 안 함', sau: '나중에' },
    muc: [
      { ten: '연합 학습 (FATE)', trangThai: 'chua', ly_do: '실제 데이터를 가진 여러 기관이 함께 학습해야 합니다. 회계 사무소가 많아지면 개별 사업자를 드러내지 않는 집계 비교로 충분합니다.' },
      { ten: '컨소시엄 블록체인 (FISCO BCOS)', trangThai: 'khong', ly_do: '여러 기관이 함께 운영해야 합니다. MIMI는 이미 공개 타임스탬프를 붙인 해시 체인 원장이 있어 외부에서 직접 검증할 수 있습니다.' },
      { ten: '고급 암호 (ZKP, FHE)', trangThai: 'sau', ly_do: 'FHE는 아직 너무 느립니다. ZKP는 거래 내역을 넘기지 않고 매출이 기준 이하임을 증명하는 데 쓸 수 있습니다. 먼저 한 줄씩 추적 가능한 증거가 필요합니다.' },
      { ten: '부정 거래 데이터 생성 GAN (FDGAN)', trangThai: 'chua', ly_do: 'MIMI는 명확한 규칙과 정답이 있는 테스트 사례로 검사합니다. GAN이 만든 데이터는 찾기 어려운 방식으로 시스템을 잘못 가르칠 수 있습니다.' },
    ],
    ketLuan: 'MIMI가 먼저 만드는 것: 잔액 누적으로 거래 내역 누락 확인, 거래 내역에서 세금 신고서까지의 증거 체인, 시행일 기준 세법 버전 관리.',
  },
  zh: {
    tieuDe: '研究方向',
    dan: '我们正在关注的先进金融技术，以及它们目前是否适合 MIMI 的坦率评估。这些技术都尚未纳入产品。',
    trangThai: { chua: '暂未', khong: '不采用', sau: '以后' },
    muc: [
      { ten: '联邦学习 (FATE)', trangThai: 'chua', ly_do: '需要多个拥有真实数据的机构共同训练。会计服务机构多了以后，做不暴露单个商户的汇总对比就足够。' },
      { ten: '联盟链 (FISCO BCOS)', trangThai: 'khong', ly_do: '需要多方共同运营。MIMI 已有带公开时间戳的哈希链账本，外部可自行验证。' },
      { ten: '高级密码学 (ZKP, FHE)', trangThai: 'sau', ly_do: 'FHE 目前太慢。ZKP 可用于在不提供流水的情况下证明营业额低于某个门槛。首先要做到每一行都可追溯的证据。' },
      { ten: '欺诈数据生成 GAN (FDGAN)', trangThai: 'chua', ly_do: 'MIMI 用明确规则和带答案的测试用例来检查。GAN 生成的数据可能以难以察觉的方式把系统教错。' },
    ],
    ketLuan: 'MIMI 优先做：用余额累加证明流水完整、从流水行到申报表的证据链、按生效日期管理税法版本。',
  },
};

const MAU: Record<TrangThai, string> = {
  chua: 'bg-muted text-muted-foreground',
  khong: 'bg-destructive/10 text-destructive',
  sau: 'bg-primary/10 text-primary',
};

export default function HuongNghienCuu() {
  const { i18n } = useTranslation();
  const b = BO[(i18n.resolvedLanguage ?? 'vi').slice(0, 2)] ?? BO.vi;
  return (
    <section id="huong-nghien-cuu" className="bg-background py-20" aria-labelledby="huong-nghien-cuu-tieu-de">
      <div className="container mx-auto max-w-5xl px-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FlaskConical size={16} aria-hidden /> R&amp;D
        </p>
        <h2 id="huong-nghien-cuu-tieu-de" className="font-serif text-3xl text-foreground md:text-4xl">{b.tieuDe}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{b.dan}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {b.muc.map((m) => (
            <article key={m.ten} className="rounded-2xl border border-border/70 bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-foreground">{m.ten}</h3>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${MAU[m.trangThai]}`}>{b.trangThai[m.trangThai]}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.ly_do}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 rounded-xl bg-secondary/40 px-4 py-3 text-sm text-foreground">{b.ketLuan}</p>
      </div>
    </section>
  );
}
