/**
 * Notification Service
 * 
 * Sends email notifications for job completions.
 * Uses Brevo (formerly Sendinblue) SMTP
 */

import nodemailer from 'nodemailer';
import fs from 'fs-extra';
import path from 'path';

interface JobNotification {
  to: string;
  jobId: string;
  jobName: string;
  repoName: string;
  status: 'SUCCESS' | 'FAILED';
  duration?: string;
  artifactsUrl?: string;
  logsPath?: string; // Path to log file to attach
}

// Create transporter for Brevo SMTP
function createTransporter() {
  const smtpUser = process.env.BREVO_SMTP_USER;
  const smtpPass = process.env.BREVO_SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM;

  if (!smtpUser || !smtpPass || !emailFrom) {
    console.log('📧 Email notifications disabled (Brevo SMTP not configured)');
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

let transporter: nodemailer.Transporter | null | undefined = undefined;

// Initialize on first use
function getTransporter() {
  if (transporter === undefined) {
    transporter = createTransporter();
  }
  return transporter;
}

export async function sendJobNotification(notification: JobNotification): Promise<boolean> {
  const transport = getTransporter();
  
  if (!transport) {
    console.log(`📧 [Mock] Would send ${notification.status} notification for job ${notification.jobId} to ${notification.to}`);
    return true;
  }

  const isSuccess = notification.status === 'SUCCESS';
  const emoji = isSuccess ? '✅' : '❌';
  const statusText = isSuccess ? 'succeeded' : 'failed';
  const statusColor = isSuccess ? '#22c55e' : '#ef4444';

  const subject = `${emoji} Job ${statusText}: ${notification.repoName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
        .success { background: #dcfce7; color: #166534; }
        .failed { background: #fee2e2; color: #991b1b; }
        .details { margin: 20px 0; }
        .detail-row { display: flex; margin: 8px 0; }
        .detail-label { font-weight: 600; width: 100px; }
        .btn { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px; }
        .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${emoji} Job ${statusText}</h1>
        </div>
        <div class="content">
          <p>Your CI job has ${statusText}.</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Repository:</span>
              <span>${notification.repoName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Job ID:</span>
              <span>${notification.jobId}</span>
            </div>
            ${notification.duration ? `
            <div class="detail-row">
              <span class="detail-label">Duration:</span>
              <span>${notification.duration}</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="status-badge ${isSuccess ? 'success' : 'failed'}">${notification.status}</span>
            </div>
          </div>
          
          <div style="margin-top: 20px;">
            ${notification.artifactsUrl ? `<a href="${notification.artifactsUrl}" class="btn">Download Artifacts</a>` : ''}
          </div>
          
          ${notification.logsPath ? `
          <div style="margin-top: 15px; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 14px;">
            📎 <strong>Log file attached</strong> - See the attached <code>job-${notification.jobId}-logs.txt</code> for full output.
          </div>
          ` : ''}
          
          <div class="footer">
            <p>This email was sent by GitOps DevTools.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Job ${statusText}: ${notification.repoName}

Repository: ${notification.repoName}
Job ID: ${notification.jobId}
Status: ${notification.status}
${notification.duration ? `Duration: ${notification.duration}` : ''}
${notification.logsPath ? `\nLog file attached: job-${notification.jobId}-logs.txt` : ''}
  `;

  try {
    // Build attachments array
    const attachments: { filename: string; content: string }[] = [];
    
    // Attach log file if path is provided and file exists
    if (notification.logsPath && await fs.pathExists(notification.logsPath)) {
      const logContent = await fs.readFile(notification.logsPath, 'utf-8');
      attachments.push({
        filename: `job-${notification.jobId}-logs.txt`,
        content: logContent,
      });
      console.log(`📎 Attaching log file: ${notification.logsPath}`);
    }

    await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: notification.to,
      subject,
      text,
      html,
      attachments,
    });
    console.log(`📧 Sent ${notification.status} notification for job ${notification.jobId} to ${notification.to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
}

// Test the email configuration
export async function testEmailConfig(): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.log('Email not configured');
    return false;
  }

  try {
    await transport.verify();
    console.log('✅ SMTP connection verified');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error);
    return false;
  }
}
