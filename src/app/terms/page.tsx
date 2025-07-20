import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <div className="fade-in max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold font-headline gradient-text">Terms & Conditions</h1>
        <p className="text-muted-foreground">
          Rules and guidelines for using the NetworkingNexus internal platform.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="text-primary" />
            Platform Usage Policy
          </CardTitle>
          <CardDescription>
            To ensure the integrity and security of our club's operations, all members must adhere to the following rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
            <div className="space-y-2">
                <h3 className="font-semibold text-foreground">1. Account Security</h3>
                <p>
                    Your account on this platform is for your personal use only. Sharing your password or granting access to your account to any other individual, whether a club member or an external party, is strictly prohibited.
                </p>
                <p className="text-destructive/80 font-medium">
                    Violation of this rule may lead to immediate suspension of your account and potential suspension from club activities, pending a review by the executive committee.
                </p>
            </div>
            <div className="space-y-2">
                <h3 className="font-semibold text-foreground">2. Data Integrity</h3>
                <p>
                    All members are expected to provide truthful and accurate updates regarding their tasks and responsibilities. Knowingly submitting false or misleading information undermines the collaborative spirit of our club and can disrupt project timelines.
                </p>
                <p>
                    Please ensure all comments, progress updates, and file attachments are relevant and accurately reflect the current status of your work.
                </p>
            </div>
             <div className="space-y-2">
                <h3 className="font-semibold text-foreground">3. Professional Conduct</h3>
                <p>
                    All communications and interactions on this platform must be professional and respectful. Harassment, hate speech, or any form of abusive language will not be tolerated.
                </p>
            </div>
             <div className="space-y-2">
                <h3 className="font-semibold text-foreground">4. Compliance</h3>
                <p>
                    By logging in and using this platform, you agree to abide by these terms and conditions. Failure to comply may result in disciplinary action.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
