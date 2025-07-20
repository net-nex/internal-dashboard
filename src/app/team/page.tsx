
"use client";

import { useEffect, useState } from "react";
import { getUsers } from "@/lib/data";
import UserCard from "./components/user-card";
import type { User } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const fetchedUsers = await getUsers();
      // Sort users by level to ensure correct order
      fetchedUsers.sort((a, b) => a.level - b.level);
      setUsers(fetchedUsers);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  if (loading) {
    return <TeamPageSkeleton />;
  }

  const getLevel = (level: number) => users.filter((u) => u.level === level);
  const getLevels = (levels: number[]) => users.filter((u) => levels.includes(u.level));

  const teamSections: { title: string; users: User[], description?: string }[] = [
    { title: "Presidium", users: getLevels([0, 1]), description: "The core leadership guiding the club's vision and operations." },
    { title: "Executives", users: getLevel(2), description: "Overseeing all major club functions and strategic initiatives." },
    { title: "Domain Directors", users: getLevel(3), description: "Leading the primary domains of the club." },
    { title: "Vertical Leads", users: getLevel(4), description: "Managing specific sub-domains and their respective teams." },
    { title: "Members", users: getLevel(5), description: "The driving force behind our projects and activities." },
  ];

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-3xl font-bold font-headline gradient-text">Meet the Team</h1>
        <p className="text-muted-foreground">
          Explore the organizational structure and members of NetworkingNexus.
        </p>
      </div>

        <div className="space-y-12">
        {teamSections.map((section, index) => (
            section.users.length > 0 && (
                <div key={section.title} className="space-y-6 stagger-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{section.title}</h2>
                        {section.description && <p className="text-muted-foreground mt-1">{section.description}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {section.users.map((user, userIndex) => (
                            <div key={user.id} className="stagger-fade-in" style={{ animationDelay: `${userIndex * 50}ms` }}>
                                <UserCard user={user} />
                            </div>
                        ))}
                    </div>
                </div>
            )
        ))}
        </div>
    </div>
  );
}

function TeamPageSkeleton() {
  const sections = [
    { title: "Presidium", count: 2 },
    { title: "Executives", count: 3 },
    { title: "Domain Directors", count: 3 },
    { title: "Vertical Leads", count: 5 },
    { title: "Members", count: 10 },
  ];

  return (
    <div className="space-y-12">
      <div>
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-4 w-1/2 mt-2" />
      </div>

      {sections.map((section) => (
        <div key={section.title} className="space-y-6">
           <div>
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-4 w-1/3 mt-2" />
           </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(section.count)].map((_, i) => (
              <Card key={i} className="w-full">
                 <div className="h-16 bg-muted/40"></div>
                 <CardContent className="p-4 flex flex-col items-center text-center gap-4 -mt-10">
                     <Skeleton className="w-20 h-20 rounded-full" />
                     <div className="space-y-2 w-full">
                        <Skeleton className="h-5 w-2/3 mx-auto" />
                        <Skeleton className="h-4 w-1/2 mx-auto" />
                     </div>
                     <div className="flex flex-wrap justify-center gap-2 mt-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                     </div>
                 </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
