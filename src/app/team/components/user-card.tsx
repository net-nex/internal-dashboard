import { User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare } from "lucide-react";

interface UserCardProps {
  user: User;
}

export default function UserCard({ user }: UserCardProps) {
  const showDomainBadge = user.level > 2;
  const isCoreTeam = user.level <= 2;

  return (
    <Card className="w-full h-full flex flex-col hover:border-primary/50 transition-colors duration-300 text-center">
      <CardHeader className="items-center">
        <CardTitle className="text-xl font-bold text-foreground">{user.name}</CardTitle>
        <p className="text-primary font-semibold">{user.position}</p>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow items-center justify-between">
        <div className="flex flex-wrap gap-2 justify-center">
          {isCoreTeam && <Badge variant="secondary">Core Team</Badge>}
          {showDomainBadge && <Badge variant="secondary">{user.domain}</Badge>}
          {user.subdomain && <Badge variant="outline">{user.subdomain}</Badge>}
        </div>
        <div className="mt-6 flex items-center justify-center gap-2">
           <Button variant="outline" size="icon" asChild>
                <a href={`mailto:${user.email}`} aria-label="Email">
                    <Mail />
                </a>
            </Button>
             <Button variant="outline" size="icon" asChild>
                <a href={`https://wa.me/${user.phone}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                    <MessageSquare />
                </a>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
