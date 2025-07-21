
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, arrayUnion, query, where, writeBatch, deleteDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from './firebase';
import type { User, Task, Comment, TaskData, ActivityLog } from './types';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail, uploadFile } from "@/app/actions";
import { toast } from "@/hooks/use-toast";

// --- User Functions (Firestore) ---

let allUsersCache: User[] | null = null;

export const getUsers = async (): Promise<User[]> => {
  if (allUsersCache) {
    return allUsersCache;
  }
  try {
    const usersCollection = collection(db, "users");
    const snapshot = await getDocs(usersCollection);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    allUsersCache = users; // Cache the result
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const getUser = async (id: string | null): Promise<User | null> => {
  if (!id) return null;
  // First, check the cache
  if (allUsersCache) {
    const user = allUsersCache.find(u => u.id === id);
    if (user) return user;
  }
  // If not in cache, fetch from Firestore
  try {
    const users = await getUsers(); // This will populate the cache
    return users.find(u => u.id === id) || null;
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    return null;
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const usersCollection = collection(db, "users");
    const q = query(usersCollection, where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() } as User;
  } catch (error) {
    console.error("Error finding user by email:", error);
    return null;
  }
}

export const getLoggedInUser = async (): Promise<User | null> => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) return null;
    return await getUser(userId);
  } catch (error) {
    console.warn("localStorage is not available, no user logged in.");
    return null;
  }
};


// --- Task Functions (Firestore) ---
const tasksCollection = collection(db, "tasks");

const generateEmailTemplate = (assigneeName: string, assignerName: string, taskTitle: string, taskDeadline: string, taskId: string, action: 'assigned' | 'added') => {
  const websiteUrl = 'https://netnex-internal-dashboard.vercel.app';
  const taskUrl = `${websiteUrl}/tasks/${taskId}`;
  const subject = action === 'assigned' ? `New Task Assigned: ${taskTitle}` : `You've been added to a task: ${taskTitle}`;
  const headline = action === 'assigned' ? 'You have a new task!' : 'You\'ve been added to a task.';

  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; margin: 0; padding: 0; background-color: #f4f4f7; }
              .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
              .header { background-color: #2D29A1; color: #ffffff; padding: 24px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
              .content { padding: 32px; }
              .content h2 { color: #1a202c; font-size: 20px; margin-top: 0; }
              .content p { color: #4a5568; line-height: 1.6; }
              .task-card { background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-top: 20px; }
              .task-card strong { color: #2d3748; }
              .button-container { text-align: center; margin-top: 24px; }
              .button { background-color: #00D5FF; color: #1a202c; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; }
              .footer { background-color: #edf2f7; padding: 20px; text-align: center; font-size: 12px; color: #718096; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Networking Nexus</h1>
              </div>
              <div class="content">
                  <h2>${headline}</h2>
                  <p>Hi ${assigneeName},</p>
                  <p>A task has been ${action} to you by <strong>${assignerName}</strong>. Please review the details below.</p>
                  
                  <div class="task-card">
                      <p><strong>Task:</strong> ${taskTitle}</p>
                      <p><strong>Deadline:</strong> ${taskDeadline}</p>
                  </div>

                  <div class="button-container">
                      <a href="${taskUrl}" class="button">View Task Details</a>
                  </div>
                  
                  <p>If you have any questions, please comment on the task directly on the platform.</p>
                  <p>Thank you!</p>
              </div>
              <div class="footer">
                  © ${new Date().getFullYear()} Networking Nexus. All Rights Reserved.
              </div>
          </div>
      </body>
      </html>
    `,
  };
};

export const getTasks = async (user: User): Promise<Task[]> => {
  try {
    const snapshot = await getDocs(tasksCollection);
    const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

    let visibleTasks: Task[];

    if (user.level <= 1) {
        // Presidium can see all tasks
        visibleTasks = allTasks;
    } else {
        // Other users see tasks assigned to them or by them
        visibleTasks = allTasks.filter(task => 
            task.assignerId === user.id || (task.assigneeIds || []).includes(user.id)
        );
    }
    
    // Default sort by most recent
    return visibleTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  } catch (error) {
    console.error("Error fetching tasks: ", error);
    return [];
  }
};

export const getTask = async (id: string): Promise<Task | null> => {
  try {
    const docRef = doc(db, "tasks", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Task : null;
  } catch (error) {
    console.error("Error fetching task: ", error);
    return null;
  }
};

export const addTask = async (taskData: TaskData) => {
  const user = await getLoggedInUser();
  if (!user) throw new Error("User not logged in");

  // 1. Create the task document with a generated ID.
  const newTaskRef = doc(collection(db, "tasks"));
  const newTaskId = newTaskRef.id;

  const newTask: Omit<Task, 'id'> = {
    title: taskData.title,
    description: taskData.description,
    assignerId: taskData.assignerId,
    assigneeIds: taskData.assigneeIds,
    deadline: taskData.deadline.toISOString(),
    createdAt: new Date().toISOString(),
    comments: [],
    progress: 0,
    status: 'To Do',
  };
  
  // 2. Set the initial task data.
  await setDoc(newTaskRef, newTask);

  // 3. If there are attachments, upload them via the Genkit flow.
  if (taskData.attachments && taskData.attachments.length > 0) {
    toast({
      title: 'Uploading files...',
      description: 'Please wait while attachments are being uploaded.'
    });

    const attachmentComments: Comment[] = [];
    for (const attachment of taskData.attachments) {
      try {
        const result = await uploadFile({
          taskId: newTaskId,
          fileName: attachment.name,
          fileType: attachment.type,
          fileData: attachment.data,
        });

        if (result.downloadURL) {
           attachmentComments.push({
            id: uuidv4(),
            userId: user.id,
            text: `File uploaded: ${attachment.name}`,
            createdAt: new Date().toISOString(),
            fileURL: result.downloadURL,
          });
        }
      } catch (error) {
         console.error(`Failed to upload ${attachment.name}:`, error);
         toast({ title: "File Upload Failed", description: `Could not upload ${attachment.name}.`, variant: "destructive" });
      }
    }
    
    // 4. Update the task with the file comments if any were successful.
    if(attachmentComments.length > 0) {
        await updateDoc(newTaskRef, {
            comments: arrayUnion(...attachmentComments)
        });
    }
  }
  
  const createdTask = await getTask(newTaskId);
  if (createdTask) {
    await createLog(user, 'created', createdTask);
    // Send email notifications to assignees
    const assignees = await Promise.all(taskData.assigneeIds.map(id => getUser(id)));
    for (const assignee of assignees) {
      if (!assignee) continue;
      try {
          const { subject, html } = generateEmailTemplate(
            assignee.name.split(' ')[0],
            user.name,
            taskData.title,
            taskData.deadline.toLocaleDateString(),
            newTaskId,
            'assigned'
          );
          await sendEmail({ to: assignee.email, subject, html });
      } catch (emailError) {
          console.error(`Failed to send email to ${assignee.email}:`, emailError);
      }
    }
  }

  return createdTask;
};


export const updateTask = async (taskId: string, data: Partial<Task>): Promise<Task | null> => {
  const user = await getLoggedInUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }
  const taskRef = doc(db, "tasks", taskId);
  const originalTask = await getTask(taskId);

  await updateDoc(taskRef, data);
  const updatedTask = await getTask(taskId);

  if (updatedTask) {
    await createLog(user, 'updated', updatedTask);

    // Check for new assignees to notify
    if (originalTask && data.assigneeIds) {
        const originalAssignees = new Set(originalTask.assigneeIds || []);
        const newAssignees = data.assigneeIds.filter(id => !originalAssignees.has(id));

        if (newAssignees.length > 0) {
            const assigneeUsers = await Promise.all(newAssignees.map(id => getUser(id)));
            for (const assignee of assigneeUsers) {
                if (!assignee) continue;
                try {
                    const { subject, html } = generateEmailTemplate(
                      assignee.name.split(' ')[0],
                      user.name,
                      updatedTask.title,
                      new Date(updatedTask.deadline).toLocaleDateString(),
                      updatedTask.id,
                      'added'
                    );
                    await sendEmail({ to: assignee.email, subject, html });
                } catch (emailError) {
                    console.error(`Failed to send reassignment email to ${assignee.email}:`, emailError);
                }
            }
        }
    }
  }
  
  return updatedTask;
}

export const deleteTask = async (taskId: string): Promise<void> => {
  const user = await getLoggedInUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }
  try {
    const taskToDelete = await getTask(taskId);
    if (!taskToDelete) {
        throw new Error("Task not found.");
    }
    
    const taskRef = doc(db, "tasks", taskId);
    await deleteDoc(taskRef);
    await createLog(user, 'deleted', taskToDelete);
  } catch (error) {
    console.error("Error deleting task: ", error);
    throw new Error("Failed to delete task");
  }
};

export const addComment = async (taskId: string, text: string): Promise<Task | null> => {
  const user = await getLoggedInUser();
  if (!user) throw new Error("User not logged in");

  const newComment: Comment = {
    id: uuidv4(),
    userId: user.id,
    text,
    createdAt: new Date().toISOString(),
  };

  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, {
    comments: arrayUnion(newComment)
  });
  
  const updatedTask = await getTask(taskId);
  if(updatedTask) {
    await createLog(user, 'commented on', updatedTask);
  }
  return updatedTask;
};

const logsCollection = collection(db, "logs");

const createLog = async (user: User, action: string, task: Task) => {
    if (!task || !user) {
        console.warn("Log not created. Missing user or task.", { userId: user?.id, taskId: task?.id });
        return;
    }

    await addDoc(logsCollection, {
        userId: user.id,
        action: `${action} task`,
        taskId: task.id,
        taskTitle: task.title,
        timestamp: new Date().toISOString(),
    });
};

export const getLogs = async (): Promise<ActivityLog[]> => {
  try {
    const snapshot = await getDocs(logsCollection);
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error("Error fetching logs: ", error);
    return [];
  }
};
