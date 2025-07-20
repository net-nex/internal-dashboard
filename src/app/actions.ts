'use server';

import {
  generateTaskDescription as generateTaskDescriptionFlow,
  type GenerateTaskDescriptionInput,
  type GenerateTaskDescriptionOutput,
} from '@/ai/flows/generate-task-description';
import {
  sendEmail as sendEmailFlow,
  type SendEmailInput,
} from '@/ai/flows/send-email';
import {
  summarizeTask as summarizeTaskFlow,
  type SummarizeTaskInput,
  type SummarizeTaskOutput,
} from '@/ai/flows/summarize-task';
import {
  uploadFile as uploadFileFlow,
  type UploadFileInput,
  type UploadFileOutput,
} from '@/ai/flows/upload-file';

export async function generateTaskDescription(
  input: GenerateTaskDescriptionInput
): Promise<GenerateTaskDescriptionOutput> {
  return generateTaskDescriptionFlow(input);
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  return sendEmailFlow(input);
}

export async function summarizeTask(
  input: SummarizeTaskInput
): Promise<SummarizeTaskOutput> {
  return summarizeTaskFlow(input);
}

export async function uploadFile(
  input: UploadFileInput
): Promise<UploadFileOutput> {
  return uploadFileFlow(input);
}
