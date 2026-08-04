import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageTransition } from "@/components/PageTransition";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AWSAccounts from "./pages/AWSAccounts";
import AzureAccounts from "./pages/AzureAccounts";
import GCPAccounts from "./pages/GCPAccounts";
import Findings from "./pages/Findings";
import GRCReporting from "./pages/GRCReporting";
import ComplianceReports from "./pages/ComplianceReports";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";
import AssetInventory from "./pages/AssetInventory";
import AttackPaths from "./pages/AttackPaths";
import SecurityGraph from "./pages/SecurityGraph";
import AutopilotPolicies from "./pages/AutopilotPolicies";
import ConfigDrift from "./pages/ConfigDrift";
import ThreatIntelligence from "./pages/ThreatIntelligence";
import BreachSimulation from "./pages/BreachSimulation";
import DigitalTwin from "./pages/DigitalTwin";
import KubernetesSecurity from "./pages/KubernetesSecurity";
import ZeroTrustAccess from "./pages/ZeroTrustAccess";
import SaasSecurity from "./pages/SaasSecurity";
import SecurityEvents from "./pages/SecurityEvents";
import RuntimeSecurity from "./pages/RuntimeSecurity";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Security from "./pages/Security";
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
            <NotificationProvider>
            <PageTransition>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/dashboard/accounts" element={<ProtectedRoute><AWSAccounts /></ProtectedRoute>} />
                <Route path="/dashboard/azure-accounts" element={<ProtectedRoute><AzureAccounts /></ProtectedRoute>} />
                <Route path="/dashboard/gcp-accounts" element={<ProtectedRoute><GCPAccounts /></ProtectedRoute>} />
                <Route path="/dashboard/cloud-accounts" element={<Navigate to="/dashboard/azure-accounts" replace />} />
                <Route path="/dashboard/findings" element={<ProtectedRoute><Findings /></ProtectedRoute>} />
                <Route path="/dashboard/grc" element={<ProtectedRoute><GRCReporting /></ProtectedRoute>} />
                <Route path="/dashboard/reports" element={<ProtectedRoute><ComplianceReports /></ProtectedRoute>} />
                <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/dashboard/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
                <Route path="/dashboard/assets" element={<ProtectedRoute><AssetInventory /></ProtectedRoute>} />
                <Route path="/dashboard/attack-paths" element={<ProtectedRoute><AttackPaths /></ProtectedRoute>} />
                <Route path="/dashboard/security-graph" element={<ProtectedRoute><SecurityGraph /></ProtectedRoute>} />
                <Route path="/dashboard/autopilot" element={<ProtectedRoute><AutopilotPolicies /></ProtectedRoute>} />
                <Route path="/dashboard/drift" element={<ProtectedRoute><ConfigDrift /></ProtectedRoute>} />
                <Route path="/dashboard/threats" element={<ProtectedRoute><ThreatIntelligence /></ProtectedRoute>} />
                <Route path="/dashboard/simulations" element={<ProtectedRoute><BreachSimulation /></ProtectedRoute>} />
                <Route path="/dashboard/digital-twin" element={<ProtectedRoute><DigitalTwin /></ProtectedRoute>} />
                <Route path="/dashboard/kubernetes" element={<ProtectedRoute><KubernetesSecurity /></ProtectedRoute>} />
                <Route path="/dashboard/zero-trust" element={<ProtectedRoute><ZeroTrustAccess /></ProtectedRoute>} />
                <Route path="/dashboard/saas-security" element={<ProtectedRoute><SaasSecurity /></ProtectedRoute>} />
                <Route path="/dashboard/events" element={<ProtectedRoute><SecurityEvents /></ProtectedRoute>} />
                <Route path="/dashboard/runtime-security" element={<ProtectedRoute><RuntimeSecurity /></ProtectedRoute>} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/security" element={<Security />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
