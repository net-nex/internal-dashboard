'use server';
/**
 * @fileOverview A Genkit flow for uploading files to Firebase Storage.
 * This flow takes file data from the client, decodes it, and uploads it
 * from the server, avoiding browser CORS issues.
 *
 * - uploadFile - The main function to handle the file upload.
 * - UploadFileInput - The input type for the uploadFile function.
 * - UploadFileOutput - The return type for the uploadFile function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const UploadFileInputSchema = z.object({
  taskId: z.string().describe("The ID of the task to associate the file with."),
  fileName: z.string().describe("The name of the file."),
  fileType: z.string().describe("The MIME type of the file."),
  fileData: z.string().describe(
    "The file content as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type UploadFileInput = z.infer<typeof UploadFileInputSchema>;

const UploadFileOutputSchema = z.object({
  downloadURL: z.string().url().describe("The public download URL of the uploaded file."),
});
export type UploadFileOutput = z.infer<typeof UploadFileOutputSchema>;


export async function uploadFile(input: UploadFileInput): Promise<UploadFileOutput> {
  return uploadFileFlow(input);
}


const uploadFileFlow = ai.defineFlow(
  {
    name: 'uploadFileFlow',
    inputSchema: UploadFileInputSchema,
    outputSchema: UploadFileOutputSchema,
  },
  async (input) => {
    try {
      // Generate a unique file name to prevent overwrites, but keep the extension
      const fileExtension = input.fileName.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      
      const storageRef = ref(storage, `tasks/${input.taskId}/${uniqueFileName}`);
      
      // The client sends a data URI (e.g., "data:image/png;base64,iVBORw..."),
      // and uploadString with 'data_url' format handles it correctly.
      const snapshot = await uploadString(storageRef, input.fileData, 'data_url');
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        downloadURL: downloadURL,
      };

    } catch (error) {
      console.error("Error in uploadFileFlow:", error);
      // Re-throw the error to be caught by the calling client function
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
