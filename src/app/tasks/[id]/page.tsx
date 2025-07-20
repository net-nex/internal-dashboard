"use client";

import { useEffect, useState, useRef } from "react";
import { getTask, getUser, addComment, updateTask, getLoggedInUser, deleteTask } from "@/lib/data";
import { notFound, useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Loader2, Trash2, AlertCircle, Wand2, Edit } from "lucide-react";
import { Calendar, Clock } from "lucide-react";
import type { Task, User, Comment as CommentType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { isToday, isTomorrow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeTask } from "@/ai/flows/summarize-task";

export default function TaskDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assignees, setAssignees] = useState<(User | null)[]>([]);
  const [assigner, setAssigner] = useState<User | null>(null);
  const [commentUsers, setCommentUsers] = useState<Record<string, User | null>>({});
  const router = useRouter();


  const fetchTaskData = async (taskId: string) => {
    setLoading(true);
    try {
      const fetchedTask = await getTask(taskId);
      if (fetchedTask) {
        setTask(fetchedTask);
        setProgress(fetchedTask.progress || 0);

        const [assigner, assignees, loggedInUser] = await Promise.all([
            getUser(fetchedTask.assignerId),
            Promise.all((fetchedTask.assigneeIds || []).map(id => getUser(id))),
            getLoggedInUser()
        ]);
        
        setAssigner(assigner);
        setAssignees(assignees);
        setCurrentUser(loggedInUser);

        const commentUserIds = new Set(fetchedTask.comments.map(c => c.userId));
        const users = await Promise.all(Array.from(commentUserIds).map(id => getUser(id)));
        const userMap = users.reduce((acc, u) => {
            if(u) acc[u.id] = u;
            return acc;
        }, {} as Record<string, User>);

        setCommentUsers(userMap);

      }
    } catch (error) {
      console.error("Failed to fetch task:", error);
      toast({ title: "Error", description: "Failed to load task details.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTaskData(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleProgressChange = (newProgress: number[]) => {
    setProgress(newProgress[0]);
  }
  
  const handleProgressUpdate = async () => {
    if (!task) return;
    setIsSubmitting(true);
    try {
      const newStatus = progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'To Do';
      const updatedTask = await updateTask(task.id, { progress, status: newStatus });
      if (updatedTask) {
          setTask(updatedTask);
          toast({ title: "Progress updated!" });
      }
    } catch (error) {
       toast({ title: "Error", description: "Failed to update progress", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !task) return;
    setIsSubmitting(true);
    try {
      const updatedTask = await addComment(task.id, commentText);
      if (updatedTask) {
        setTask(updatedTask);
        if (currentUser && !commentUsers[currentUser.id]) {
            setCommentUsers(prev => ({...prev, [currentUser.id]: currentUser}));
        }
      }
      setCommentText("");
      toast({ title: "Comment added!" });
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast({ title: "Error", description: "Could not add comment.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    setIsSubmitting(true);
    try {
      await deleteTask(task.id);
      toast({ title: "Task Deleted", description: "The task has been successfully deleted." });
      router.push('/tasks');
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({ title: "Error", description: "Could not delete the task.", variant: "destructive" });
      setIsSubmitting(false);
    }
  }
  
  const handleGenerateSummary = async () => {
    if (!task) return;
    setIsSummarizing(true);
    try {
      const commentsForAI = task.comments.map(c => ({
        author: commentUsers[c.userId]?.name || "Unknown User",
        text: c.text
      }));

      const result = await summarizeTask({
        title: task.title,
        description: task.description,
        comments: commentsForAI,
      });

      if (result.summary) {
        const updatedTaskWithSummary = await updateTask(task.id, { summary: result.summary });
        if (updatedTaskWithSummary) {
          setTask(updatedTaskWithSummary);
        }
        toast({ title: "Summary Generated!", description: "The AI summary has been added to the task." });
      }
    } catch (error) {
      console.error("Failed to generate summary:", error);
      toast({ title: "Error", description: "Could not generate summary. Check API keys.", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };


  if (loading) {
    return <TaskDetailSkeleton />;
  }

  if (!task) {
    return notFound();
  }

  const isAssignee = currentUser ? (task.assigneeIds || []).includes(currentUser.id) : false;
  const isAssigner = currentUser ? task.assignerId === currentUser.id : false;
  const isManager = currentUser && currentUser.level <= 1;

  const deadlineDate = new Date(task.deadline);
  const isUrgent = (isToday(deadlineDate) || isTomorrow(deadlineDate)) && task.status !== 'Completed';
  
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');
  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="grid md:grid-cols-3 gap-8 fade-in">
      <div className="md:col-span-2 flex flex-col gap-8">
        <Card className="stagger-fade-in">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <Badge variant={
                      task.status === 'Completed' ? 'secondary' : 
                      task.status === 'In Progress' ? 'default' : 'outline'
                    } className="capitalize">
                    {task.status.toLowerCase()}
                  </Badge>
                  {isUrgent && (
                    <Badge variant="destructive" className="gap-1.5">
                      <AlertCircle className="h-3 w-3" />
                      Urgently Needed
                    </Badge>
                  )}
                </div>
                <CardTitle className="font-headline text-2xl gradient-text">{task.title}</CardTitle>
                <CardDescription>Created on {formatDate(task.createdAt)}</CardDescription>
              </div>
               <div className="flex items-center gap-2 text-sm text-muted-foreground self-start md:self-center">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(task.deadline)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(task.deadline)}</span>
                  </div>
                  {isAssigner && (
                    <>
                    <Button asChild variant="outline" size="icon">
                      <Link href={`/tasks/${task.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the task
                            and all its associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteTask} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    </>
                  )}
               </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{task.description}</p>
            
            {task.summary && (
              <>
                <Separator className="my-6" />
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-primary" />
                    AI-Generated Summary
                  </h4>
                  <blockquote className="border-l-2 border-primary pl-4 text-sm text-muted-foreground italic">
                    {task.summary}
                  </blockquote>
                </div>
              </>
            )}

            <Separator className="my-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Assigner</h4>
                  {assigner && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{assigner.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{assigner.name}</p>
                        <p className="text-muted-foreground">{assigner.position}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Assignees</h4>
                    <div className="flex flex-col gap-2">
                        {assignees.map(user => user && (
                            <div key={user.id} className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-muted-foreground">{user.position}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
             {(isAssignee || isAssigner) && (
              <div className="mt-6">
                 <Separator className="my-6" />
                <Label htmlFor="progress" className="font-semibold">Update Progress</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    id="progress"
                    min={0}
                    max={100}
                    step={5}
                    value={[progress]}
                    onValueChange={handleProgressChange}
                    className="flex-1"
                    disabled={!isAssignee}
                  />
                  <span className="font-bold text-lg w-16 text-right">{progress}%</span>
                  <Button onClick={handleProgressUpdate} disabled={isSubmitting || progress === task.progress}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-1 stagger-fade-in" style={{ animationDelay: '400ms' }}>
        <Card>
          <CardHeader>
            <CardTitle>Comments & Attachments</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {task.comments.map(comment => {
                    const commentUser = commentUsers[comment.userId];
                    const isFile = comment.text.startsWith("File uploaded:");
                    return (
                        <div key={comment.id} className="flex gap-3">
                             <Avatar className="h-8 w-8">
                                <AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-sm">{commentUser?.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatTime(comment.createdAt)}</p>
                                </div>
                                 <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg mt-1">
                                  {isFile ? (
                                    <div className="flex items-center gap-2">
                                      <Paperclip className="h-4 w-4" />
                                      <Link href={comment.fileURL || '#'} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                                        {comment.text.replace("File uploaded: ", "")}
                                      </Link>
                                    </div>
                                  ) : (
                                    <p>{comment.text}</p>
                                  )}
                                </div>
                            </div>
                        </div>
                    )
                })}
             </div>
            <Separator />
            <div className="relative">
                <Textarea 
                  placeholder="Add a comment..." 
                  className="pr-24" 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={isSubmitting}
                />
                 <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center gap-1">
                    <Button size="icon" onClick={handleAddComment} disabled={isSubmitting || !commentText.trim()}>
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4"/>}
                    </Button>
                </div>
            </div>
            
             {isManager && (
                <>
                <Separator />
                 <Button variant="outline" className="w-full group" onClick={handleGenerateSummary} disabled={isSummarizing}>
                    {isSummarizing ? <Loader2 className="animate-spin" /> : <Wand2 className="transition-transform group-hover:rotate-12" />}
                    {isSummarizing ? 'Summarizing...' : 'Generate AI Summary'}
                 </Button>
                </>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


function TaskDetailSkeleton() {
    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 flex flex-col gap-8">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-48" />
                                <Skeleton className="h-8 w-80" />
                                <Skeleton className="h-4 w-40" />
                            </div>
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-10 w-10 rounded-md" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                        <Separator className="my-6" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-20" />
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Skeleton className="h-5 w-20" />
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Comments & Attachments</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Separator />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
