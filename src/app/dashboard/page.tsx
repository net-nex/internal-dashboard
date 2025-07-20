
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getLoggedInUser, getTasks, getUser, getLogs } from "@/lib/data";
import { Activity, ListTodo, CheckCircle2, Users, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Task, User as UserType, ActivityLog } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logUsers, setLogUsers] = useState<Record<string, UserType | null>>({});
  const [taskAssignees, setTaskAssignees] = useState<Record<string, (UserType | null)[]>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 12) setGreeting("Good Morning");
    else if (currentHour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    const fetchData = async () => {
      setLoading(true);
      const currentUser = await getLoggedInUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setUser(currentUser);

      const [fetchedTasks, fetchedLogs] = await Promise.all([
        getTasks(currentUser),
        currentUser.level <= 1 ? getLogs() : Promise.resolve([]),
      ]);
      
      setTasks(fetchedTasks);
      setLogs(fetchedLogs);

      // Pre-fetch user data for logs and tasks
      const logUserIds = new Set(fetchedLogs.map(log => log.userId));
      const taskAssigneeIds = new Set(fetchedTasks.flatMap(task => task.assigneeIds || []));
      const allUserIds = [...new Set([...logUserIds, ...taskAssigneeIds])];
      
      const userPromises = allUserIds.map(id => getUser(id));
      const users = await Promise.all(userPromises);
      const userMap = users.reduce((acc, u) => {
        if (u) acc[u.id] = u;
        return acc;
      }, {} as Record<string, UserType>);

      const newLogUsers: Record<string, UserType | null> = {};
      fetchedLogs.forEach(log => {
        newLogUsers[log.userId] = userMap[log.userId] || null;
      });
      setLogUsers(newLogUsers);

      const newTaksAssignees: Record<string, (UserType | null)[]> = {};
      fetchedTasks.forEach(task => {
        newTaksAssignees[task.id] = (task.assigneeIds || []).map(id => userMap[id] || null);
      });
      setTaskAssignees(newTaksAssignees);

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading || !user) {
    return <DashboardSkeleton />;
  }

  const myTasks = tasks.filter((task) => (task.assigneeIds || []).includes(user.id));
  const completedTasks = tasks.filter((task) => task.status === "Completed").length;
  const inProgressTasks = tasks.filter((task) => task.status === "In Progress").length;
  
  const recentTasks = tasks.slice(0, 5);
  const recentLogs = logs.slice(0, 7);

  const userRoleDescription = () => {
    if (!user) return "";
    let description = `${user.position}`;
    if (user.subdomain) description += ` of ${user.subdomain}`;
    if (user.level >= 4 && user.domain) description += ` (${user.domain})`;
    return description;
  };

  return (
    <div className="flex flex-col gap-8 fade-in">
      <div>
        <h1 className="text-3xl font-bold font-headline">{greeting && `${greeting}, `}<span className="gradient-text">{user?.name.split(' ')[0]}!</span></h1>
        <p className="text-muted-foreground">You are the {userRoleDescription()}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Visible Tasks", value: tasks.length, icon: ListTodo, subtext: user.level <= 1 ? "Across the organization" : "Assigned to or by you" },
          { title: "Completed Tasks", value: completedTasks, icon: CheckCircle2, subtext: `${tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}% completion rate` },
          { title: "In Progress", value: inProgressTasks, icon: Activity, subtext: `${myTasks.filter(t => t.status === 'In Progress').length} assigned to you` },
          { title: "My Tasks", value: myTasks.length, icon: Users, subtext: "Tasks assigned directly to you" }
        ].map((item, index) => (
          <Card key={item.title} className="stagger-fade-in hover:border-primary/50 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <p className="text-xs text-muted-foreground">{item.subtext}</p>
            </CardContent>
          </Card>
        ))}
      </div>

     <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="stagger-fade-in lg:col-span-2" style={{ animationDelay: '500ms' }}>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>A log of the most recent tasks visible to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Assignees</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTasks.map((task) => {
                  const assignees = taskAssignees[task.id] || [];
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <Badge variant={ task.status === 'Completed' ? 'secondary' : task.status === 'In Progress' ? 'default' : 'outline' } className="capitalize">
                          {task.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center -space-x-2">
                          {assignees.map(assignee =>
                            assignee ? (
                              <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                                <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ) : null
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                              <Link href={`/tasks/${task.id}`}>View</Link>
                          </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {user.level <= 1 && (
            <Card className="stagger-fade-in lg:col-span-1" style={{ animationDelay: '600ms' }}>
              <CardHeader>
                <CardTitle>Platform Logs</CardTitle>
                <CardDescription>Live feed of activities.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {recentLogs.map((log) => {
                    const logUser = logUsers[log.userId];
                    return (
                        <div key={log.id} className="flex items-start gap-3 text-sm">
                           <Avatar className="h-8 w-8 border-2 border-background">
                              <AvatarFallback>{logUser?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="leading-snug">
                                    <span className="font-semibold">{logUser?.name}</span> {log.action} <Link href={`/tasks/${log.taskId}`} className="font-semibold text-primary hover:underline">{log.taskTitle}</Link>.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    );
                 })}
              </CardContent>
            </Card>
        )}
     </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-4 w-1/3 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-3 w-full mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>A log of the most recent tasks visible to you.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-5 w-1/6" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Platform Logs</CardTitle>
            <CardDescription>A live feed of all platform activities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
