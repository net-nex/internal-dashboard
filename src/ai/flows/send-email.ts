'use server';
/**
 * @fileOverview An email sending flow using Resend.
 *
 * - sendEmail - A function that sends an email.
 * - SendEmailInput - The input type for the sendEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Resend } from 'resend';

const SendEmailInputSchema = z.object({
  to: z.string().email().describe('The recipient email address.'),
  subject: z.string().describe('The subject of the email.'),
  html: z.string().describe('The HTML content of the email.'),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn("RESEND_API_KEY is not set. Email functionality will be disabled.");
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    if (!resend) {
        console.error("Email not sent: Resend is not configured. Please set RESEND_API_KEY.");
        return;
    }
    try {
      await resend.emails.send({
        from: 'NexusFlow <onboarding@resend.dev>',
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      console.log(`Email sent to ${input.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      // In a real app, you might want to handle this error more gracefully
      // For the prototype, we'll just log it.
    }
  }
);
