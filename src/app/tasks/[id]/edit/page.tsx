"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, notFound } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getLoggedInUser, getUsers, getTask, updateTask } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Send, Loader2, Check, ChevronsUpDown, X } from "lucide-react";
import type { User, Task } from "@/lib/types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  assigneeIds: z.array(z.string()).min(1, { message: "Please select at least one assignee." }),
  deadline: z.date({ required_error: "A deadline is required." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      assigneeIds: [],
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!id) return;
      
      const [user, users, fetchedTask] = await Promise.all([
        getLoggedInUser(), 
        getUsers(),
        getTask(id)
      ]);

      if (!fetchedTask || user?.id !== fetchedTask.assignerId) {
        return notFound();
      }
      
      setCurrentUser(user);
      setTask(fetchedTask);

      // Populate form with task data
      form.reset({
        title: fetchedTask.title,
        description: fetchedTask.description,
        assigneeIds: fetchedTask.assigneeIds || [],
        deadline: new Date(fetchedTask.deadline),
      });

      if (user) {
        // Logic to determine assignable users, same as assign page
        let filteredUsers: User[] = [];
        switch (user.level) {
          case 0: case 1:
            filteredUsers = users.filter(u => u.id !== user.id);
            break;
          case 2:
            filteredUsers = users.filter(u => u.level >= 3);
            break;
          case 3:
            filteredUsers = users.filter(u => u.domain === user.domain && u.level > user.level);
            break;
          case 4:
            filteredUsers = users.filter(u => u.domain === user.domain && u.subdomain === user.subdomain && u.level > user.level);
            break;
          default:
            filteredUsers = [];
            break;
        }
        setAssignableUsers(filteredUsers);
      }
      setLoading(false);
    };
    fetchData();
  }, [id, form]);
  
  async function onSubmit(values: FormValues) {
    if(!task) return;
    setIsSubmitting(true);
    
    try {
      await updateTask(task.id, {
        title: values.title,
        description: values.description,
        assigneeIds: values.assigneeIds,
        deadline: values.deadline.toISOString(),
      });
      toast({
        title: "Task Updated!",
        description: `Task "${values.title}" has been successfully updated.`,
      });
      router.push(`/tasks/${task.id}`);
    } catch (error) {
      console.error("Failed to update task:", error);
      toast({
        title: "Error",
        description: "Could not update the task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedAssignees = form.watch('assigneeIds').map(id => assignableUsers.find(u => u.id === id)).filter(Boolean) as User[];
  
  if (loading) {
    return (
       <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-3xl font-bold font-headline gradient-text">Edit Task</h1>
        <p className="text-muted-foreground">
          Update the details for the task below.
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Finalize Q4 budget report" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed description of the task requirements..."
                        className="resize-none"
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="assigneeIds"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Assign To</FormLabel>
                       <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value?.length && "text-muted-foreground"
                              )}
                            >
                              <span className="truncate">
                                {selectedAssignees.length > 0
                                  ? selectedAssignees.map(u => u.name.split(' ')[0]).join(', ')
                                  : "Select team members"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                           <Command>
                            <CommandInput placeholder="Search members..." />
                             <CommandList>
                              <CommandEmpty>No members found.</CommandEmpty>
                              <CommandGroup>
                                {assignableUsers.map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    value={user.name}
                                    onSelect={() => {
                                      const currentIds = field.value || [];
                                      const newIds = currentIds.includes(user.id)
                                        ? currentIds.filter(id => id !== user.id)
                                        : [...currentIds, user.id];
                                      field.onChange(newIds);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value?.includes(user.id) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {user.name} - {user.position}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                             </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="pt-2 flex flex-wrap gap-1">
                        {selectedAssignees.map(user => (
                          <Badge key={user.id} variant="secondary" className="gap-1">
                            {user.name}
                            <button
                              type="button"
                              className="rounded-full hover:bg-muted-foreground/20"
                              onClick={() => {
                                const newIds = field.value.filter(id => id !== user.id);
                                field.onChange(newIds);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Deadline</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0,0,0,0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="group w-full">
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Send className="transition-transform group-hover:-rotate-45" />
                )}
                {isSubmitting ? "Saving Changes..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
