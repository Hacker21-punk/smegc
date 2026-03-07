import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  Server,
  Database as DatabaseIcon,
  HardDrive,
  Shield,
  Globe,
  Box,
  Zap,
  Users,
  Network,
  RefreshCw,
  Download,
  Filter,
} from "lucide-react";

type CloudProvider = "aws" | "azure" | "gcp";
type ResourceType = "compute" | "container" | "serverless" | "storage" | "database" | "identity" | "networking" | "security" | "other";
type AssetStatus = "active" | "inactive" | "unknown" | "deleted";

interface CloudAsset {
  id: string;
  provider: CloudProvider;
  resource_type: ResourceType;
  resource_id: string;
  resource_name: string | null;
  region: string | null;
  status: AssetStatus;
  risk_score: number | null;
  metadata: Record<string, unknown>;
  tags: Record<string, unknown>;
  last_seen_at: string | null;
  created_at: string;
}

const providerConfig: Record<CloudProvider, { label: string; color: string; icon: string }> = {
  aws: { label: "AWS", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: "☁️" },
  azure: { label: "Azure", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: "🔷" },
  gcp: { label: "GCP", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: "🔶" },
};

const resourceTypeConfig: Record<ResourceType, { label: string; icon: React.ReactNode }> = {
  compute: { label: "Compute", icon: <Server className="h-4 w-4" /> },
  container: { label: "Container", icon: <Box className="h-4 w-4" /> },
  serverless: { label: "Serverless", icon: <Zap className="h-4 w-4" /> },
  storage: { label: "Storage", icon: <HardDrive className="h-4 w-4" /> },
  database: { label: "Database", icon: <DatabaseIcon className="h-4 w-4" /> },
  identity: { label: "Identity", icon: <Users className="h-4 w-4" /> },
  networking: { label: "Networking", icon: <Network className="h-4 w-4" /> },
  security: { label: "Security", icon: <Shield className="h-4 w-4" /> },
  other: { label: "Other", icon: <Globe className="h-4 w-4" /> },
};

const statusConfig: Record<AssetStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "secondary" },
  unknown: { label: "Unknown", variant: "outline" },
  deleted: { label: "Deleted", variant: "destructive" },
};

export default function AssetInventory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assets, setAssets] = useState<CloudAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cloud_assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load assets");
      console.error(error);
    } else {
      setAssets((data as unknown as CloudAsset[]) || []);
    }
    setLoading(false);
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      !searchQuery ||
      asset.resource_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.resource_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.region?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = providerFilter === "all" || asset.provider === providerFilter;
    const matchesType = typeFilter === "all" || asset.resource_type === typeFilter;
    const matchesTab = activeTab === "all" || asset.provider === activeTab;
    return matchesSearch && matchesProvider && matchesType && matchesTab;
  });

  const providerCounts = {
    all: assets.length,
    aws: assets.filter((a) => a.provider === "aws").length,
    azure: assets.filter((a) => a.provider === "azure").length,
    gcp: assets.filter((a) => a.provider === "gcp").length,
  };

  const typeCounts = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.resource_type] = (acc[a.resource_type] || 0) + 1;
    return acc;
  }, {});

  const exportCSV = () => {
    const headers = ["Provider", "Type", "Resource ID", "Name", "Region", "Status", "Risk Score"];
    const rows = filteredAssets.map((a) => [
      a.provider, a.resource_type, a.resource_id, a.resource_name || "", a.region || "", a.status, a.risk_score ?? 0,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cloud-assets.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Assets exported successfully");
  };

  const getRiskColor = (score: number | null) => {
    if (score === null || score === 0) return "text-muted-foreground";
    if (score >= 75) return "text-destructive";
    if (score >= 50) return "text-orange-500";
    if (score >= 25) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} lastScanTime="" onRefresh={fetchAssets} />
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Asset Inventory</h1>
              <p className="text-muted-foreground">
                Unified view of all cloud resources across AWS, Azure, and GCP
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchAssets}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(["aws", "azure", "gcp"] as CloudProvider[]).map((provider) => (
              <Card key={provider} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab(provider)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{providerConfig[provider].label}</p>
                      <p className="text-2xl font-bold">{providerCounts[provider]}</p>
                    </div>
                    <span className="text-2xl">{providerConfig[provider].icon}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("all")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Assets</p>
                    <p className="text-2xl font-bold">{providerCounts.all}</p>
                  </div>
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resource Type Breakdown */}
          {Object.keys(typeCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeCounts).map(([type, count]) => {
                const config = resourceTypeConfig[type as ResourceType];
                return (
                  <Badge
                    key={type}
                    variant="outline"
                    className="cursor-pointer px-3 py-1.5 gap-1.5"
                    onClick={() => setTypeFilter(type === typeFilter ? "all" : type)}
                  >
                    {config?.icon}
                    {config?.label}: {count}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Tabs + Filters + Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="all">All ({providerCounts.all})</TabsTrigger>
                    <TabsTrigger value="aws">☁️ AWS ({providerCounts.aws})</TabsTrigger>
                    <TabsTrigger value="azure">🔷 Azure ({providerCounts.azure})</TabsTrigger>
                    <TabsTrigger value="gcp">🔶 GCP ({providerCounts.gcp})</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search resources..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(resourceTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {assets.length === 0 ? "No assets discovered yet" : "No matching assets"}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {assets.length === 0
                      ? "Connect a cloud account and run a scan to discover your infrastructure assets across AWS, Azure, and GCP."
                      : "Try adjusting your search or filters to find what you're looking for."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssets.map((asset) => {
                        const pConfig = providerConfig[asset.provider];
                        const tConfig = resourceTypeConfig[asset.resource_type];
                        const sConfig = statusConfig[asset.status];
                        return (
                          <TableRow key={asset.id}>
                            <TableCell>
                              <Badge variant="outline" className={pConfig.color}>
                                {pConfig.icon} {pConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {tConfig.icon}
                                <span className="text-sm">{tConfig.label}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{asset.resource_name || asset.resource_id}</p>
                                {asset.resource_name && (
                                  <p className="text-xs text-muted-foreground font-mono">{asset.resource_id}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{asset.region || "—"}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={sConfig.variant}>{sConfig.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-semibold ${getRiskColor(asset.risk_score)}`}>
                                {asset.risk_score ?? 0}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
