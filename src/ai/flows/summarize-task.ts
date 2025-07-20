'use server';
/**
 * @fileOverview An AI flow to summarize a task based on its details and comments.
 *
 * - summarizeTask - A function that generates a summary.
 * - SummarizeTaskInput - The input type for the summarizeTask function.
 * - SummarizeTaskOutput - The return type for the summarizeTask function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummarizeTaskInputSchema = z.object({
  title: z.string().describe('The title of the task.'),
  description: z.string().describe('The original description of the task.'),
  comments: z.array(z.object({
    author: z.string(),
    text: z.string(),
  })).describe('A list of comments made on the task.'),
});
export type SummarizeTaskInput = z.infer<typeof SummarizeTaskInputSchema>;

const SummarizeTaskOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise, one-paragraph summary of the task\'s status and key discussion points.'),
});
export type SummarizeTaskOutput = z.infer<typeof SummarizeTaskOutputSchema>;

export async function summarizeTask(input: SummarizeTaskInput): Promise<SummarizeTaskOutput> {
  return summarizeTaskFlow(input);
}

const summarizeTaskPrompt = ai.definePrompt({
  name: 'summarizeTaskPrompt',
  input: { schema: SummarizeTaskInputSchema },
  output: { schema: SummarizeTaskOutputSchema },
  prompt: `You are a project management assistant. Your task is to generate a concise, one-paragraph summary of a task's progress based on its title, description, and the comments from team members. The summary should be easy for a manager to read to get a quick update.

Task Title: {{{title}}}
Original Description: {{{description}}}

Comments Feed:
{{#each comments}}
- {{author}}: "{{text}}"
{{/each}}

Based on all this information, please generate the summary.
`,
});

const summarizeTaskFlow = ai.defineFlow(
  {
    name: 'summarizeTaskFlow',
    inputSchema: SummarizeTaskInputSchema,
    outputSchema: SummarizeTaskOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeTaskPrompt(input);
    return output!;
  }
);
