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
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              {/* Công khai, không nằm sau đăng nhập — App Store yêu cầu
                  Privacy Policy URL truy cập được mà không cần tài khoản. */}
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              {/* Khôi phục mật khẩu. Trước đây KHÔNG có đường nào: chỉ có "Đổi
                  mật khẩu" trong Cài đặt, mà muốn vào Cài đặt thì phải đăng
                  nhập được đã — tức ai quên mật khẩu là mất tài khoản. */}
              <Route path="/quen-mat-khau" element={<ForgotPassword />} />
              <Route path="/dat-lai-mat-khau" element={<ResetPassword />} />
              {/* Where Cas Link redirects with the publicToken. Not under
                  ProtectedRoute's dashboard subtree because Cas navigates the
                  browser here directly, and it must resolve on its own. */}
              <Route path="/bank/callback" element={<BankCallback />} />
              <Route path="/register" element={<Onboarding />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardOverview />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="loans" element={<LoansPage />} />
                <Route path="p2p" element={<P2PLendingPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="cashflow" element={<DashboardOverview />} />
                <Route path="credit" element={<CreditScoringPage />} />
                <Route path="fintech" element={<FintechPage />} />
                <Route path="m2m" element={<M2MDevicesPage />} />
                <Route path="tech" element={<TechnologyPage />} />
                <Route path="learn" element={<LearnPage />} />
                <Route path="carbon" element={<CarbonPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthInitializer>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
