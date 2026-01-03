import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Cloud, CheckCircle2, AlertCircle } from "lucide-react";

interface AWSAccount {
  id: string;
  name: string;
  accountId: string;
  status: "connected" | "error" | "syncing";
  lastScan: string;
  riskScore: number;
}

interface AWSAccountsCardProps {
  accounts: AWSAccount[];
  onAddAccount: () => void;
}

export function AWSAccountsCard({ accounts, onAddAccount }: AWSAccountsCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-critical" />;
      case "syncing":
        return <Cloud className="h-4 w-4 text-info animate-pulse" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          AWS Accounts
        </CardTitle>
        <Button size="sm" onClick={onAddAccount}>
          <Plus className="mr-1 h-4 w-4" />
          Add Account
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(account.status)}
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-xs text-muted-foreground">{account.accountId}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge 
                variant={account.riskScore <= 30 ? "outline" : account.riskScore <= 60 ? "secondary" : "destructive"}
              >
                Score: {account.riskScore}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">{account.lastScan}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
