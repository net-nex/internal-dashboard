import { config } from 'dotenv';
config({ path: '.env.local' });

import '@/ai/flows/generate-task-description.ts';
import '@/ai/flows/send-email.ts';
import '@/ai/flows/summarize-task.ts';
import '@/ai/flows/upload-file.ts';
