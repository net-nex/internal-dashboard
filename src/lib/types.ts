export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  position: string;
  domain: 'Technical' | 'Corporate' | 'Creatives' | 'Executive' | 'Advisory';
  subdomain?: 'Development' | 'ML' | 'IoT' | 'UI/UX' | 'Sponsorship' | 'Events' | 'Content';
  reportsTo: string | null;
  level: number;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  assignerId: string;
  assigneeIds: string[];
  status: 'To Do' | 'In Progress' | 'Completed';
  createdAt: string;
  deadline: string;
  comments: Comment[];
  progress: number;
  summary?: string;
};

export type Attachment = {
  name: string;
  type: string;
  data: string; // Base64 encoded string
}

export type TaskData = Omit<Task, 'id' | 'createdAt' | 'comments' | 'deadline' | 'progress' | 'status' | 'summary'> & {
  deadline: Date;
  attachments?: Attachment[];
  links?: string[];
  status: 'To Do';
};

export type Comment = {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  fileURL?: string;
};

export type ActivityLog = {
  id: string;
  userId: string;
  action: string;
  taskId: string;
  taskTitle: string;
  timestamp: string;
};
