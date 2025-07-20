"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getTasks, getUser, getLoggedInUser } from "@/lib/data";
import Link from 'next/link';
import { PlusCircle, ArrowUpDown, AlertCircle, Users, CheckCircle, Calendar, Percent } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isToday, isTomorrow } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

type SortOption = 
  | "recent" 
  | "oldest"
  | "deadline_asc" 
  | "deadline_desc" 
  | "deadline_crossed"
  | "progress_desc" 
  | "progress_asc";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [assigneesMap, setAssigneesMap] = useState<Record<string, (User | null)[]>>({});

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const user = await getLoggedInUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUser(user);
      
      const fetchedTasks = await getTasks(user);
      setTasks(fetchedTasks);

      const allAssigneeIds = new Set(fetchedTasks.flatMap(task => task.assigneeIds || []));
      const userPromises = Array.from(allAssigneeIds).map(id => getUser(id));
      const users = await Promise.all(userPromises);
      const userMap = users.reduce((acc, u) => {
        if(u) acc[u.id] = u;
        return acc;
      }, {} as Record<string, User>);
      
      const newAssigneesMap: Record<string, (User | null)[]> = {};
      for (const task of fetchedTasks) {
        newAssigneesMap[task.id] = (task.assigneeIds || []).map(id => userMap[id] || null);
      }
      setAssigneesMap(newAssigneesMap);

      setLoading(false);
    };

    fetchInitialData();
  }, []);

  const sortedTasks = useMemo(() => {
    let sorted = [...tasks];
    const now = new Date().getTime();

    switch (sortBy) {
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "deadline_asc":
        sorted.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        break;
      case "deadline_desc":
        sorted.sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
        break;
      case "deadline_crossed":
        sorted = sorted
          .filter(t => new Date(t.deadline).getTime() < now && t.status !== 'Completed')
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        break;
      case "progress_desc":
        sorted.sort((a, b) => (b.progress || 0) - (a.progress || 0));
        break;
      case "progress_asc":
        sorted.sort((a, b) => (a.progress || 0) - (b.progress || 0));
        break;
      case "recent":
      default:
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    return sorted;
  }, [tasks, sortBy]);


  if (loading) {
    return <TasksSkeleton />;
  }
  
  if (!currentUser) {
      return (
        <div className="flex flex-col gap-8 fade-in items-center justify-center h-full">
            <p className="text-muted-foreground">You must be logged in to view tasks.</p>
        </div>
      )
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');

  return (
    <div className="flex flex-col gap-8 fade-in">
       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline gradient-text">Tasks</h1>
            <p className="text-muted-foreground">
                {currentUser.level <= 1 ? "Manage and track all tasks in the system." : "Tasks assigned to you or by you."}
            </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="deadline_asc">Deadline (Earliest First)</SelectItem>
                <SelectItem value="deadline_desc">Deadline (Latest First)</SelectItem>
                <SelectItem value="deadline_crossed">Deadline (Crossed)</SelectItem>
                <SelectItem value="progress_desc">Progress (High to Low)</SelectItem>
                <SelectItem value="progress_asc">Progress (Low to High)</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild className="group w-full sm:w-auto">
                <Link href="/tasks/assign">
                    <PlusCircle className="transition-transform group-hover:rotate-90" />
                    Assign Task
                </Link>
            </Button>
        </div>
      </div>

      {/* Desktop View: Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Assignees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTasks.length > 0 ? sortedTasks.map((task, index) => {
                  const assignees = assigneesMap[task.id] || [];
                  const isOverdue = new Date(task.deadline).getTime() < new Date().getTime() && task.status !== 'Completed';
                  const deadlineDate = new Date(task.deadline);
                  const isUrgent = (isToday(deadlineDate) || isTomorrow(deadlineDate)) && task.status !== 'Completed';

                  return (
                    <TableRow key={task.id} className="stagger-fade-in" style={{ animationDelay: `${index * 50}ms`}}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <span>{task.title}</span>
                          {isUrgent && (
                            <Badge variant="destructive" className="gap-1.5 whitespace-nowrap">
                              <AlertCircle className="h-3 w-3" />
                              Urgently Needed
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center -space-x-2">
                          {assignees.slice(0, 3).map(assignee =>
                            assignee ? (
                              <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                                <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ) : null
                          )}
                           {(task.assigneeIds || []).length > 3 && <Avatar className="h-6 w-6 border-2 border-background"><AvatarFallback>+{(task.assigneeIds || []).length - 3}</AvatarFallback></Avatar>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          task.status === 'Completed' ? 'secondary' : 
                          task.status === 'In Progress' ? 'default' : 'outline'
                        } className="capitalize">
                          {task.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs w-8">{task.progress || 0}%</span>
                          <div className="w-24 h-2 bg-muted rounded-full">
                              <div className={cn("h-2 rounded-full", isOverdue ? "bg-destructive" : "bg-secondary")} style={{ width: `${task.progress || 0}%` }}></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={cn(isOverdue && "text-destructive")}>
                        {formatDate(task.deadline)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/tasks/${task.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No tasks found for this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      {/* Mobile View: Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {sortedTasks.length > 0 ? sortedTasks.map((task, index) => {
            const assignees = assigneesMap[task.id] || [];
            const isOverdue = new Date(task.deadline).getTime() < new Date().getTime() && task.status !== 'Completed';
            const deadlineDate = new Date(task.deadline);
            const isUrgent = (isToday(deadlineDate) || isTomorrow(deadlineDate)) && task.status !== 'Completed';

            return (
              <Card key={task.id} className="stagger-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                     <CardTitle className="text-base leading-tight">{task.title}</CardTitle>
                     <Badge variant={
                          task.status === 'Completed' ? 'secondary' : 
                          task.status === 'In Progress' ? 'default' : 'outline'
                        } className="capitalize whitespace-nowrap">
                          {task.status.toLowerCase()}
                      </Badge>
                  </div>
                   {isUrgent && (
                        <Badge variant="destructive" className="gap-1.5 w-fit">
                            <AlertCircle className="h-3 w-3" />
                            Urgently Needed
                        </Badge>
                    )}
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span className={cn(isOverdue && "text-destructive font-semibold")}>{formatDate(task.deadline)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Percent className="h-4 w-4" />
                            <span>{task.progress || 0}%</span>
                        </div>
                    </div>
                     <div className="w-full h-2 bg-muted rounded-full">
                        <div className={cn("h-2 rounded-full", isOverdue ? "bg-destructive" : "bg-secondary")} style={{ width: `${task.progress || 0}%` }}></div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Assignees</h4>
                        <div className="flex items-center -space-x-2">
                          {assignees.slice(0, 4).map(assignee =>
                            assignee ? (
                              <Avatar key={assignee.id} className="h-8 w-8 border-2 border-background">
                                <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ) : null
                          )}
                           {assignees.length > 4 && <Avatar className="h-8 w-8 border-2 border-background"><AvatarFallback>+{assignees.length - 4}</AvatarFallback></Avatar>}
                        </div>
                    </div>
                    <Button asChild className="w-full">
                      <Link href={`/tasks/${task.id}`}>View Details</Link>
                    </Button>
                </CardContent>
              </Card>
            )
        }) : (
             <div className="text-center text-muted-foreground py-12 col-span-full">
                No tasks found for this filter.
            </div>
        )}
       </div>
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <Skeleton className="h-10 w-full sm:w-[220px]" />
            <Skeleton className="h-10 w-full sm:w-36" />
        </div>
      </div>
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {[...Array(6)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-24"/></TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(10)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-48"/></TableCell>
                <TableCell><Skeleton className="h-6 w-20"/></TableCell>
                <TableCell><Skeleton className="h-6 w-24"/></TableCell>
                <TableCell><Skeleton className="h-5 w-28"/></TableCell>
                <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                <TableCell><Skeleton className="h-8 w-20"/></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full"/>
              <Skeleton className="h-8 w-full"/>
              <Skeleton className="h-10 w-full"/>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
