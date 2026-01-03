import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2 } from "lucide-react";

const complianceFrameworks = [
  {
    title: "IT Act 2000",
    description: "Information Technology Act compliance for data protection and cybersecurity requirements.",
    checks: ["Data encryption standards", "Audit trail maintenance", "Incident response procedures"],
  },
  {
    title: "GST Compliance",
    description: "Goods and Services Tax regulations for digital record-keeping and data integrity.",
    checks: ["Invoice data protection", "Financial record integrity", "Secure data transmission"],
  },
  {
    title: "Bank Audit Requirements",
    description: "RBI guidelines and banking sector audit standards for cloud infrastructure.",
    checks: ["Access control verification", "Transaction security", "Business continuity"],
  },
  {
    title: "MeitY Guidelines",
    description: "Ministry of Electronics and IT cloud security recommendations.",
    checks: ["Data localization", "Vendor risk management", "Security certifications"],
  },
];

export function ComplianceSection() {
  return (
    <section id="compliance" className="py-20 lg:py-32 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-4">
            <FileText className="h-4 w-4" />
            <span>Indian Regulatory Compliance</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Built for Indian Business Requirements
          </h2>
          <p className="text-lg text-muted-foreground">
            Generate compliance-ready reports aligned with Indian regulatory frameworks 
            and bank audit expectations.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {complianceFrameworks.map((framework, index) => (
            <Card key={index} className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  {framework.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{framework.description}</p>
                <ul className="space-y-2">
                  {framework.checks.map((check, checkIndex) => (
                    <li key={checkIndex} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                      {check}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
