import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardLayout from "@/components/layout/DashboardLayout";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const DashboardOverview = lazy(() => import("./pages/DashboardOverview"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const LoansPage = lazy(() => import("./pages/LoansPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CreditScoringPage = lazy(() => import("./pages/CreditScoringPage"));
const FintechPage = lazy(() => import("./pages/FintechPage"));
const M2MDevicesPage = lazy(() => import("./pages/M2MDevicesPage"));
const TechnologyPage = lazy(() => import("./pages/TechnologyPage"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <img src="/mimi-favicon.png" alt="MIMI WALLET" className="w-10 h-10 animate-pulse" />
    </div>
  );
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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthInitializer>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
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
                <Route path="loans" element={<LoansPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="cashflow" element={<DashboardOverview />} />
                <Route path="credit" element={<CreditScoringPage />} />
                <Route path="fintech" element={<FintechPage />} />
                <Route path="m2m" element={<M2MDevicesPage />} />
                <Route path="tech" element={<TechnologyPage />} />
                <Route path="learn" element={<LearnPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthInitializer>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
