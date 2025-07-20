"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { getLoggedInUser, getUsers, addTask } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { generateTaskDescription } from "@/ai/flows/generate-task-description";
import { CalendarIcon, Send, Loader2, Check, ChevronsUpDown, X, Wand2, Paperclip, Trash2 } from "lucide-react";
import type { User, Attachment } from "@/lib/types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

// Helper to convert file to Base64
const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  assigneeIds: z.array(z.string()).min(1, { message: "Please select at least one assignee." }),
  deadline: z.date({ required_error: "A deadline is required." }),
  attachments: z.array(z.object({
      name: z.string(),
      type: z.string(),
      data: z.string(),
  })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AssignTaskPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [user, users] = await Promise.all([getLoggedInUser(), getUsers()]);
      setCurrentUser(user);

      if (user) {
        let filteredUsers: User[] = [];
        switch (user.level) {
          case 0: case 1:
            filteredUsers = users.filter(u => u.id !== user.id);
            break;
          case 2: // Executive Chairs
            filteredUsers = users.filter(u => u.level >= 3);
            break;
          case 3: // Domain Directors
            filteredUsers = users.filter(u => u.domain === user.domain && u.level > user.level);
            break;
          case 4: // Sub-domain Leads
            filteredUsers = users.filter(u => u.domain === user.domain && u.subdomain === user.subdomain && u.level > user.level);
            break;
          default:
            filteredUsers = [];
            break;
        }
        setAssignableUsers(filteredUsers);
      }
    };
    fetchData();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      assigneeIds: [],
      attachments: [],
    },
  });

  async function onSubmit(values: FormValues) {
    if(!currentUser) return;
    setIsSubmitting(true);
    
    try {
      await addTask({
        title: values.title,
        description: values.description,
        assigneeIds: values.assigneeIds,
        deadline: values.deadline,
        attachments: values.attachments,
        assignerId: currentUser.id,
        status: 'To Do',
      });
      toast({
        title: "Task Assigned!",
        description: `Task "${values.title}" has been assigned.`,
      });
      router.push("/tasks");
    } catch (error) {
      console.error("Failed to assign task:", error);
      toast({
        title: "Error",
        description: "Could not assign the task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleGenerateDescription = async () => {
    const title = form.getValues("title");
    if (!title) {
      toast({
        title: "Title is required",
        description: "Please enter a task title before generating a description.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateTaskDescription({ title });
      if (result.description) {
        form.setValue("description", result.description, { shouldValidate: true });
        toast({ title: "Description generated successfully!" });
      }
    } catch (e) {
      toast({
        title: "Generation Failed",
        description: "Could not generate description. Check API keys.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentAttachments = form.getValues('attachments') || [];
    
    const newAttachments: Attachment[] = await Promise.all(
        files.map(async (file) => ({
            name: file.name,
            type: file.type,
            data: await toBase64(file),
        }))
    );

    form.setValue('attachments', [...currentAttachments, ...newAttachments], { shouldValidate: true });
    // Clear the file input
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const selectedAssignees = form.watch('assigneeIds').map(id => assignableUsers.find(u => u.id === id)).filter(Boolean) as User[];
  const attachments = form.watch('attachments') || [];

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-3xl font-bold font-headline gradient-text">Assign New Task</h1>
        <p className="text-muted-foreground">
          Fill out the details below to assign a new task.
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
                    <div className="flex justify-between items-center">
                      <FormLabel>Task Description</FormLabel>
                      <Button type="button" variant="ghost" size="sm" onClick={handleGenerateDescription} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 />}
                        {isGenerating ? 'Generating...' : 'Generate with AI'}
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed description of the task requirements, goals, and any relevant context."
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

               <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supporting Assets</FormLabel>
                    <FormControl>
                        <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                            <Paperclip /> Attach Files
                        </Button>
                    </FormControl>
                     <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileChange}
                     />
                     <div className="space-y-2">
                        {attachments.map((file, index) => (
                             <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-md">
                                <span className="truncate">{file.name}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                        const newAttachments = [...attachments];
                                        newAttachments.splice(index, 1);
                                        field.onChange(newAttachments);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                     </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting || assignableUsers.length === 0} className="group w-full">
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Send className="transition-transform group-hover:-rotate-45" />
                )}
                {isSubmitting ? "Assigning..." : "Assign Task"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
