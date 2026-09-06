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
const Login = lazy(() => import("./pages/Login"));
const BankCallback = lazy(() => import("./pages/BankCallback"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const DashboardOverview = lazy(() => import("./pages/DashboardOverview"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const LoansPage = lazy(() => import("./pages/LoansPage"));
const P2PLendingPage = lazy(() => import("./pages/P2PLendingPage"));
const ThuongHieu = lazy(() => import("./pages/ThuongHieu"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CreditScoringPage = lazy(() => import("./pages/CreditScoringPage"));
const FintechPage = lazy(() => import("./pages/FintechPage"));
const M2MDevicesPage = lazy(() => import("./pages/M2MDevicesPage"));
const TechnologyPage = lazy(() => import("./pages/TechnologyPage"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const CarbonPage = lazy(() => import("./pages/CarbonPage"));
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
              <Route path="/" element={<Page path="/" title="MIMI WALLET — Ví xanh cho doanh nghiệp Việt" description="Đọc sao kê ngân hàng, dựng bộ chứng từ chi phí và đối soát công nợ tự động cho doanh nghiệp và hộ kinh doanh Việt Nam."><Landing /></Page>} />
              <Route path="/about" element={<Page path="/about" title="Về chúng tôi — MIMI WALLET" description="Câu chuyện và đội ngũ đứng sau MIMI Wallet: đưa hộ kinh doanh Việt Nam ra khỏi vùng vô hình với ngân hàng."><About /></Page>} />
              {/* Công khai, không nằm sau đăng nhập — App Store yêu cầu
                  Privacy Policy URL truy cập được mà không cần tài khoản. */}
              {/* Bộ nhận diện — công khai, không nằm sau đăng nhập: người thiết kế
                  và người viết nội dung phải mở được mà không cần tài khoản. */}
              <Route path="/thuong-hieu" element={<Page path="/thuong-hieu" title="Bộ nhận diện — MIMI WALLET" description="Màu, chữ, và quy tắc viết tiếng Việt của MIMI Wallet. Trang đọc thẳng token đang chạy nên không lệch khỏi sản phẩm."><ThuongHieu /></Page>} />
              <Route path="/privacy" element={<Page path="/privacy" title="Chính sách bảo mật — MIMI WALLET" description="Cách MIMI Wallet thu thập, lưu trữ và bảo vệ dữ liệu tài chính của doanh nghiệp bạn, cùng quyền của bạn với dữ liệu đó."><Privacy /></Page>} />
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
                <Route path="invoices" element={<Page noIndex path="/dashboard/invoices" title="Hoá đơn — MIMI WALLET" description="Quản lý hoá đơn đầu ra, đối soát công nợ và theo dõi khoản phải thu của doanh nghiệp bạn theo thời gian thực."><InvoicesPage /></Page>} />
                <Route path="clients" element={<Page noIndex path="/dashboard/clients" title="Khách hàng — MIMI WALLET" description="Danh sách khách hàng, lịch sử giao dịch và tình trạng công nợ của từng đối tác trong hệ thống MIMI Wallet."><ClientsPage /></Page>} />
                <Route path="loans" element={<Page noIndex path="/dashboard/loans" title="Khoản vay — MIMI WALLET" description="Theo dõi hồ sơ vay, hạn mức và lịch trả nợ; nộp yêu cầu tài trợ hoá đơn ngay trong MIMI Wallet."><LoansPage /></Page>} />
                <Route path="p2p" element={<Page noIndex path="/dashboard/p2p" title="Vay ngang hàng — MIMI WALLET" description="Kết nối nhu cầu vốn của doanh nghiệp với nhà đầu tư cá nhân qua nền tảng vay ngang hàng của MIMI Wallet."><P2PLendingPage /></Page>} />
                <Route path="reports" element={<Page noIndex path="/dashboard/reports" title="Báo cáo tài chính — MIMI WALLET" description="Báo cáo dòng tiền, chi phí và thuế được dựng tự động từ sao kê ngân hàng của doanh nghiệp bạn."><ReportsPage /></Page>} />
                <Route path="settings" element={<Page noIndex path="/dashboard/settings" title="Cài đặt tài khoản — MIMI WALLET" description="Quản lý thông tin doanh nghiệp, bảo mật, gói dịch vụ và tuỳ chọn thông báo trong MIMI Wallet."><SettingsPage /></Page>} />
                <Route path="cashflow" element={<Page noIndex path="/dashboard/cashflow" title="Dòng tiền — MIMI WALLET" description="Phân tích dòng tiền vào ra theo ngày, tuần, tháng và dự báo thanh khoản 90 ngày cho doanh nghiệp bạn."><DashboardOverview /></Page>} />
                <Route path="credit" element={<Page noIndex path="/dashboard/credit" title="Điểm tín dụng — MIMI WALLET" description="Điểm tín dụng doanh nghiệp 0–1000 dựng từ dữ liệu dòng tiền thật, kèm các yếu tố ảnh hưởng và gợi ý cải thiện."><CreditScoringPage /></Page>} />
                <Route path="fintech" element={<Page noIndex path="/dashboard/fintech" title="Ngân hàng mở & eKYC — MIMI WALLET" description="Liên kết ngân hàng, xác thực eKYC, phương thức thanh toán và trạng thái tuân thủ trong một nơi duy nhất."><FintechPage /></Page>} />
                <Route path="m2m" element={<Page noIndex path="/dashboard/m2m" title="Thanh toán thiết bị M2M — MIMI WALLET" description="Quản lý ví thiết bị tự động với luật IF-THEN-LIMIT để máy móc tự thanh toán trong hạn mức bạn đặt."><M2MDevicesPage /></Page>} />
                <Route path="tech" element={<Page noIndex path="/dashboard/tech" title="Công nghệ nền tảng — MIMI WALLET" description="Kiến trúc kỹ thuật của MIMI Wallet: bảo mật hậu lượng tử, hạ tầng dữ liệu và các trụ cột công nghệ."><TechnologyPage /></Page>} />
                <Route path="learn" element={<Page noIndex path="/dashboard/learn" title="Học tài chính — MIMI WALLET" description="Bài học ngắn về dòng tiền, thuế và tín dụng dành cho chủ doanh nghiệp nhỏ, theo dõi tiến độ ngay trong ứng dụng."><LearnPage /></Page>} />
                <Route path="carbon" element={<Page noIndex path="/dashboard/carbon" title="Tài chính xanh & ESG — MIMI WALLET" description="Đo phát thải Scope 1-3, theo dõi tín chỉ carbon và tiếp cận khoản vay xanh cho doanh nghiệp của bạn."><CarbonPage /></Page>} />
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
