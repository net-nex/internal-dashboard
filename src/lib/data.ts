
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
          await sendEmail({
            to: assignee.email,
            subject: `New Task Assigned: ${taskData.title}`,
            html: `
              <h1>You have a new task</h1>
              <p>Hi ${assignee.name.split(' ')[0]},</p>
              <p>A new task, "<strong>${taskData.title}</strong>", has been assigned to you by ${user.name}.</p>
              <p><strong>Deadline:</strong> ${taskData.deadline.toLocaleDateString()}</p>
              <p>Please log in to the NetworkingNexus platform to view the details.</p>
              <p>Thank you,</p>
              <p>NetworkingNexus Team</p>
            `,
          });
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
  await updateDoc(taskRef, data);
  const updatedTask = await getTask(taskId);

  if (updatedTask) {
    await createLog(user, 'updated', updatedTask);
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
