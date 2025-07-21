'use server';
/**
 * @fileOverview An email sending flow using Nodemailer and Gmail SMTP.
 *
 * - sendEmail - A function that sends an email.
 * - SendEmailInput - The input type for the sendEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import nodemailer from 'nodemailer';

const SendEmailInputSchema = z.object({
  to: z.string().email().describe('The recipient email address.'),
  subject: z.string().describe('The subject of the email.'),
  html: z.string().describe('The HTML content of the email.'),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

let transporter: nodemailer.Transporter | null = null;

if (process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
} else {
  console.warn("GMAIL_EMAIL or GMAIL_APP_PASSWORD is not set. Email functionality will be disabled.");
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
    if (!transporter) {
        console.error("Email not sent: Nodemailer is not configured. Please set GMAIL_EMAIL and GMAIL_APP_PASSWORD in your .env file.");
        // Optionally, throw an error to make the failure more explicit to the caller
        throw new Error("Email service is not configured.");
    }
    
    const mailOptions = {
        from: `"Internal Dashboard" <${process.env.GMAIL_EMAIL}>`,
        to: input.to,
        subject: input.subject,
        html: input.html,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${input.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      // In a real app, you might want to handle this error more gracefully
      // Re-throwing the error to let the caller know something went wrong.
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
