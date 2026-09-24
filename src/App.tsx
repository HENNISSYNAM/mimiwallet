import { Toaster } from "@/components/ui/toaster";
import ManHinhCho from '@/components/brand/ManHinhCho';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Seo from "@/components/Seo";

/** Gắn thẻ head riêng cho từng route mà không phải sửa từng trang. */
function Page({
  title,
  description,
  path,
  noIndex,
  children,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Seo title={title} description={description} path={path} noIndex={noIndex} />
      {children}
    </>
  );
}

const Landing = lazy(() => import("./pages/Landing"));
const About = lazy(() => import("./pages/About"));
const TaiNguyenDanhSach = lazy(() => import("./pages/TaiNguyenDanhSach"));
const TaiNguyenBai = lazy(() => import("./pages/TaiNguyenBai"));
const TuyenDung = lazy(() => import("./pages/TuyenDung"));
const TrangNoiDungPage = lazy(() => import("./pages/TrangNoiDungPage"));
const KhachHang = lazy(() => import("./pages/KhachHang"));
const TriTueNhanTaoPage = lazy(() => import("./pages/TriTueNhanTaoPage"));
const Login = lazy(() => import("./pages/Login"));
const BankCallback = lazy(() => import("./pages/BankCallback"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const DashboardOverview = lazy(() => import("./pages/DashboardOverview"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const Privacy = lazy(() => import("./pages/Privacy"));
const XoaTaiKhoan = lazy(() => import("./pages/XoaTaiKhoan"));
const Terms = lazy(() => import("./pages/Terms"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ThuongHieu = lazy(() => import("./pages/ThuongHieu"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ChungTuPage = lazy(() => import("./pages/ChungTuPage"));
const FintechPage = lazy(() => import("./pages/FintechPage"));
const TacTuPage = lazy(() => import("./pages/TacTuPage"));
const ChinhSachChiPage = lazy(() => import("./pages/ChinhSachChiPage"));
const ChiPhiAiPage = lazy(() => import("./pages/ChiPhiAiPage"));
const TroLyPage = lazy(() => import("./pages/TroLyPage"));
const ThuVienChungTuPage = lazy(() => import("./pages/ThuVienChungTuPage"));
const NhacThuePage = lazy(() => import("./pages/NhacThuePage"));
const KiemChuyenTienPage = lazy(() => import("./pages/KiemChuyenTienPage"));
const GiayToPage = lazy(() => import("./pages/GiayToPage"));
const TachChiCaNhanPage = lazy(() => import("./pages/TachChiCaNhanPage"));
const ToKhaiPage = lazy(() => import("./pages/ToKhaiPage"));
const KetNoiPage = lazy(() => import("./pages/KetNoiPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

/** Màn hình chờ — khung cảnh đổi theo giờ, xem `brand/ManHinhCho.tsx`. */
function LoadingFallback() {
  return <ManHinhCho />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthStore();
  if (loading) return <LoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  useEffect(() => { initialize(); }, [initialize]);
  return <>{children}</>;
}

const App = () => (
  /* `attribute="class"` để next-themes gắn `class="dark"` lên <html> — đúng cái
     tên mà `darkMode: ["class"]` trong tailwind.config.ts đang chờ. Trước đây
     CSS khai `.theme-dark`, nên không bên nào gặp bên nào.

     `defaultTheme="light"` VÀ `enableSystem={false}`. Đây là chủ ý, không phải
     bỏ sót. Sáng là giao diện chính của MIMI: toàn bộ bảng màu đã được soát
     tương phản cho nền sáng (xem các ghi chú tỉ lệ trong `index.css`), và màn
     hình chính của ứng dụng là bảng số dày đặc — sao kê, hoá đơn, đối soát —
     vốn dễ đọc hơn trên nền sáng.

     Nếu để "system", người dùng đang đặt máy ở chế độ tối sẽ rơi thẳng vào bản
     tối ngay lần mở đầu tiên, mà bản tối chỉ mới vừa sống lại hôm nay và chưa
     được soát hết từng trang. Tối là *tuỳ chọn*, không phải mặc định. */
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthInitializer>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Page path="/" title="MIMI WALLET — Kiểm soát chi tiêu cho doanh nghiệp chạy bằng AI" description="Agent được chi, bạn giữ quyền quyết: MIMI xét khoản chi theo chính sách, dựng lệnh trả VietQR, đối chiếu sao kê và hoá đơn điện tử. MIMI không giữ tiền của bạn."><Landing /></Page>} />
              <Route path="/khach-hang" element={<Page path="/khach-hang" title="Khách hàng — MIMI WALLET" description="MIMI làm gì cho hộ kinh doanh, doanh nghiệp nhỏ và vừa, startup và văn phòng kế toán."><KhachHang /></Page>} />
              <Route path="/about" element={<Page path="/about" title="Về chúng tôi — MIMI WALLET" description="Câu chuyện và đội ngũ đứng sau MIMI Wallet: đưa hộ kinh doanh Việt Nam ra khỏi vùng vô hình với ngân hàng."><About /></Page>} />
              {/* Công khai, không nằm sau đăng nhập — App Store yêu cầu
                  Privacy Policy URL truy cập được mà không cần tài khoản. */}
              {/* Bộ nhận diện — công khai, không nằm sau đăng nhập: người thiết kế
                  và người viết nội dung phải mở được mà không cần tài khoản. */}
              <Route path="/tai-nguyen/:loai" element={<Page path="/tai-nguyen" title="Tài nguyên — MIMI WALLET" description="Sự kiện, blog, góc nhìn, báo cáo và tin tức từ đội MIMI Wallet."><TaiNguyenDanhSach /></Page>} />
              <Route path="/tai-nguyen/:loai/:slug" element={<Page path="/tai-nguyen" title="Tài nguyên — MIMI WALLET" description="Bài viết từ đội MIMI Wallet."><TaiNguyenBai /></Page>} />
              <Route path="/tuyen-dung" element={<Page path="/tuyen-dung" title="Tuyển dụng — MIMI WALLET" description="Vị trí đang mở ở MIMI Wallet. Mục tiêu: trở thành kỳ lân tiếp theo của châu Á."><TuyenDung /></Page>} />
              <Route path="/tuyen-dung/:slug" element={<Page path="/tuyen-dung" title="Tuyển dụng — MIMI WALLET" description="Vị trí đang mở ở MIMI Wallet."><TaiNguyenBai loaiCoDinh="tuyen_dung" /></Page>} />
              <Route path="/thuong-hieu" element={<Page path="/thuong-hieu" title="Bộ nhận diện — MIMI WALLET" description="Màu, chữ, và quy tắc viết tiếng Việt của MIMI Wallet. Trang đọc thẳng token đang chạy nên không lệch khỏi sản phẩm."><ThuongHieu /></Page>} />
              {/* Trang Sản phẩm và Giải pháp — công khai; nội dung ở content/trangNoiDung.ts,
                  tiêu đề SEO đặt ngay trong trang vì mỗi đường dẫn một tiêu đề. */}
              <Route path="/san-pham/:slug" element={<TrangNoiDungPage />} />
              <Route path="/giai-phap/:slug" element={<TrangNoiDungPage />} />
              <Route path="/tri-tue-nhan-tao" element={<Page path="/tri-tue-nhan-tao" title="Trí tuệ nhân tạo — MIMI WALLET" description="Agent của bạn xin chi, MIMI xét bằng luật bạn đọc được: tự duyệt khi an toàn, hỏi bạn khi không, chặn đổi số tài khoản. Ghi rõ phần nào đang chạy, phần nào đang xây."><TriTueNhanTaoPage /></Page>} />
              <Route path="/privacy" element={<Page path="/privacy" title="Chính sách bảo mật — MIMI WALLET" description="Cách MIMI Wallet thu thập, lưu trữ và bảo vệ dữ liệu tài chính của doanh nghiệp bạn, cùng quyền của bạn với dữ liệu đó."><Privacy /></Page>} />
              {/* Google Play yêu cầu một đường xoá tài khoản mở được mà KHÔNG cần cài app
                  và không cần đăng nhập, cho người đã gỡ ứng dụng. Đường trong app đã có ở
                  Cài đặt; đây là đường thứ hai. Cố ý không đặt nút xoá trên trang công khai. */}
              <Route path="/xoa-tai-khoan" element={<Page path="/xoa-tai-khoan" title="Xoá tài khoản — MIMI WALLET" description="Cách xoá tài khoản MIMI Wallet và toàn bộ dữ liệu: giao dịch, hoá đơn, chứng từ, liên kết ngân hàng và hồ sơ doanh nghiệp."><XoaTaiKhoan /></Page>} />
              <Route path="/terms" element={<Page path="/terms" title="Điều khoản sử dụng — MIMI WALLET" description="Điều khoản và điều kiện khi sử dụng dịch vụ MIMI Wallet: quyền, nghĩa vụ và giới hạn trách nhiệm của các bên."><Terms /></Page>} />
              <Route path="/login" element={<Page path="/login" title="Đăng nhập — MIMI WALLET" description="Đăng nhập vào MIMI Wallet để xem dòng tiền, hoá đơn, khoản vay và bộ chứng từ chi phí của doanh nghiệp bạn."><Login /></Page>} />
              {/* Khôi phục mật khẩu. Trước đây KHÔNG có đường nào: chỉ có "Đổi
                  mật khẩu" trong Cài đặt, mà muốn vào Cài đặt thì phải đăng
                  nhập được đã — tức ai quên mật khẩu là mất tài khoản. */}
              <Route path="/quen-mat-khau" element={<Page noIndex path="/quen-mat-khau" title="Quên mật khẩu — MIMI WALLET" description="Gửi liên kết đặt lại mật khẩu tới email của bạn để khôi phục quyền truy cập tài khoản MIMI Wallet."><ForgotPassword /></Page>} />
              <Route path="/dat-lai-mat-khau" element={<Page noIndex path="/dat-lai-mat-khau" title="Đặt lại mật khẩu — MIMI WALLET" description="Tạo mật khẩu mới cho tài khoản MIMI Wallet của bạn và đăng nhập lại an toàn."><ResetPassword /></Page>} />
              {/* Where Cas Link redirects with the publicToken. Not under
                  ProtectedRoute's dashboard subtree because Cas navigates the
                  browser here directly, and it must resolve on its own. */}
              <Route path="/bank/callback" element={<Page noIndex path="/bank/callback" title="Đang liên kết ngân hàng — MIMI WALLET" description="Hoàn tất kết nối tài khoản ngân hàng của bạn với MIMI Wallet để đồng bộ sao kê tự động."><BankCallback /></Page>} />
              <Route path="/register" element={<Page path="/register" title="Tạo tài khoản — MIMI WALLET" description="Đăng ký MIMI Wallet trong vài phút: kết nối ngân hàng, nhập mã số thuế và bắt đầu quản lý dòng tiền doanh nghiệp."><Onboarding /></Page>} />
              <Route path="/admin" element={<Page noIndex path="/admin" title="Quản trị — MIMI WALLET" description="Bảng điều khiển quản trị nội bộ của MIMI Wallet dành riêng cho tài khoản có quyền admin."><AdminPage /></Page>} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Page noIndex path="/dashboard" title="Tổng quan dòng tiền — MIMI WALLET" description="Theo dõi dòng tiền, số dư ngân hàng và dự báo 90 ngày của doanh nghiệp bạn trong một màn hình duy nhất."><DashboardOverview /></Page>} />
                <Route path="tro-ly" element={<Page noIndex path="/dashboard/tro-ly" title="MIMI Assistant — MIMI WALLET" description="Hỏi MIMI về tiền, chứng từ, chi phí AI và kết nối của công ty; MIMI đọc dữ liệu thật, đề xuất việc và chỉ làm khi bạn xác nhận."><TroLyPage /></Page>} />
                <Route path="thu-vien" element={<Page noIndex path="/dashboard/thu-vien" title="Thư viện chứng từ — MIMI WALLET" description="Hoá đơn điện tử và chứng từ chụp của công ty ở một chỗ, gắn với khoản chi, xuất cho kế toán."><ThuVienChungTuPage /></Page>} />
                <Route path="kiem-truoc-khi-chuyen" element={<Page noIndex path="/dashboard/kiem-truoc-khi-chuyen" title="Kiểm tra trước khi chuyển tiền — MIMI WALLET" description="Nhập khoản sắp chuyển, MIMI so với lịch sử chi của công ty để tìm dấu hiệu đổi tài khoản, người nhận lạ hoặc kịch bản lừa đảo."><KiemChuyenTienPage /></Page>} />
                <Route path="chi-ca-nhan" element={<Page noIndex path="/dashboard/chi-ca-nhan" title="Tách chi cá nhân — MIMI WALLET" description="Tách chi tiêu cá nhân khỏi chi phí kinh doanh khi hộ kinh doanh dùng chung một tài khoản ngân hàng."><TachChiCaNhanPage /></Page>} />
                <Route path="giay-to" element={<Page noIndex path="/dashboard/giay-to" title="Soạn giấy tờ — MIMI WALLET" description="Bản nháp đơn tra soát chuyển nhầm, công văn giải trình và công văn đề nghị huỷ tờ khai, điền sẵn từ dữ liệu của công ty."><GiayToPage /></Page>} />
                <Route path="nhac-thue" element={<Page noIndex path="/dashboard/nhac-thue" title="Nhắc thuế — MIMI WALLET" description="Hạn nộp tờ khai theo quý và ngưỡng doanh thu năm, tính từ lịch kê khai và doanh thu thật."><NhacThuePage /></Page>} />
                <Route path="to-khai" element={<Page noIndex path="/dashboard/to-khai" title="Tờ khai thuế — MIMI WALLET" description="MIMI đọc hoá đơn điện tử, sao kê và hồ sơ thuế của bạn, áp quy định trong kho văn bản Công báo rồi điền đúng mẫu tờ khai để bạn tự nộp."><ToKhaiPage /></Page>} />
                <Route path="ket-noi" element={<Page noIndex path="/dashboard/ket-noi" title="Kết nối — MIMI WALLET" description="Nối ngân hàng, Casso, Tổng cục Thuế và nhà cung cấp AI để MIMI đọc số liệu thật."><KetNoiPage /></Page>} />
                <Route path="tac-tu" element={<Page noIndex path="/dashboard/tac-tu" title="Kiểm soát chi của agent — MIMI WALLET" description="Đặt hạn mức, duyệt và đối soát mọi khoản chi do agent AI của doanh nghiệp xin — MIMI không giữ và không chuyển tiền."><TacTuPage /></Page>} />
                <Route path="chinh-sach" element={<Page noIndex path="/dashboard/chinh-sach" title="Chính sách chi — MIMI WALLET" description="Đặt ngưỡng duyệt, hạn mức, nhóm chi và người nhận cho từng agent, rồi đọc lại toàn bộ thành văn bản chính sách."><ChinhSachChiPage /></Page>} />
                <Route path="chi-phi-ai" element={<Page noIndex path="/dashboard/chi-phi-ai" title="Chi phí AI — MIMI WALLET" description="Chi phí thật của OpenAI, Anthropic và Gemini theo ngày, từ file xuất của nhà cung cấp hoặc Admin API key, kèm ngân sách tháng."><ChiPhiAiPage /></Page>} />
                <Route path="invoices" element={<Page noIndex path="/dashboard/invoices" title="Hoá đơn — MIMI WALLET" description="Quản lý hoá đơn đầu ra, đối soát công nợ và theo dõi khoản phải thu của doanh nghiệp bạn theo thời gian thực."><InvoicesPage /></Page>} />
                <Route path="clients" element={<Page noIndex path="/dashboard/clients" title="Khách hàng — MIMI WALLET" description="Danh sách khách hàng, lịch sử giao dịch và tình trạng công nợ của từng đối tác trong hệ thống MIMI Wallet."><ClientsPage /></Page>} />
                <Route path="reports" element={<Page noIndex path="/dashboard/reports" title="Tổng hợp dòng tiền — MIMI WALLET" description="Tiền vào, tiền ra theo tháng từ sao kê ngân hàng của doanh nghiệp bạn — chưa phải báo cáo tài chính."><ReportsPage /></Page>} />
                <Route path="chung-tu" element={<Page noIndex path="/dashboard/chung-tu" title="Chứng từ chi phí — MIMI WALLET" description="Khoản chi nào đã có hoá đơn, khoản nào chưa, và còn thiếu bao nhiêu để tính thuế theo lợi nhuận."><ChungTuPage /></Page>} />
                <Route path="settings" element={<Page noIndex path="/dashboard/settings" title="Cài đặt tài khoản — MIMI WALLET" description="Quản lý thông tin doanh nghiệp, bảo mật, gói dịch vụ và tuỳ chọn thông báo trong MIMI Wallet."><SettingsPage /></Page>} />
                <Route path="cashflow" element={<Page noIndex path="/dashboard/cashflow" title="Dòng tiền — MIMI WALLET" description="Phân tích dòng tiền vào ra theo ngày, tuần, tháng và dự báo thanh khoản 90 ngày cho doanh nghiệp bạn."><DashboardOverview /></Page>} />
                <Route path="fintech" element={<Page noIndex path="/dashboard/fintech" title="Ngân hàng mở & eKYC — MIMI WALLET" description="Liên kết ngân hàng, xác thực eKYC, phương thức thanh toán và trạng thái tuân thủ trong một nơi duy nhất."><FintechPage /></Page>} />
              </Route>
              <Route path="*" element={<Page noIndex path="/404" title="Không tìm thấy trang — MIMI WALLET" description="Đường dẫn bạn truy cập không tồn tại hoặc đã được chuyển đi. Quay lại trang chủ MIMI Wallet để tiếp tục."><NotFound /></Page>} />

            </Routes>
          </Suspense>
        </AuthInitializer>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
