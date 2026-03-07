import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AWSAccounts from "./pages/AWSAccounts";
import Findings from "./pages/Findings";
import ComplianceReports from "./pages/ComplianceReports";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";
import AssetInventory from "./pages/AssetInventory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/accounts"
                element={
                  <ProtectedRoute>
                    <AWSAccounts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/findings"
                element={
                  <ProtectedRoute>
                    <Findings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/reports"
                element={
                  <ProtectedRoute>
                    <ComplianceReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/help"
                element={
                  <ProtectedRoute>
                    <HelpSupport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/assets"
                element={
                  <ProtectedRoute>
                    <AssetInventory />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
