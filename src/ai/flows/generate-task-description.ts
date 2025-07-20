// Generates a detailed task description from a given title.
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTaskDescriptionInputSchema = z.object({
  title: z.string().describe('The title of the task.'),
});

export type GenerateTaskDescriptionInput = z.infer<
  typeof GenerateTaskDescriptionInputSchema
>;

const GenerateTaskDescriptionOutputSchema = z.object({
  description: z
    .string()
    .describe('A detailed, well-structured description for the task.'),
});

export type GenerateTaskDescriptionOutput = z.infer<
  typeof GenerateTaskDescriptionOutputSchema
>;

export async function generateTaskDescription(
  input: GenerateTaskDescriptionInput
): Promise<GenerateTaskDescriptionOutput> {
  return generateTaskDescriptionFlow(input);
}

const generateTaskDescriptionPrompt = ai.definePrompt({
  name: 'generateTaskDescriptionPrompt',
  input: { schema: GenerateTaskDescriptionInputSchema },
  output: { schema: GenerateTaskDescriptionOutputSchema },
  prompt: `You are an expert project manager. Your goal is to expand a brief task title into a clear, detailed, and actionable task description.

The description should include:
- A clear statement of the primary objective.
- A few bullet points outlining the key steps or requirements.
- A concluding sentence about the expected outcome.

Generate a description for the following task title:
Task Title: {{{title}}}
`,
});

const generateTaskDescriptionFlow = ai.defineFlow(
  {
    name: 'generateTaskDescriptionFlow',
    inputSchema: GenerateTaskDescriptionInputSchema,
    outputSchema: GenerateTaskDescriptionOutputSchema,
  },
  async (input) => {
    const { output } = await generateTaskDescriptionPrompt(input);
    return output!;
  }
);
