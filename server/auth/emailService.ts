// server/auth/emailService.ts
import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config();

// Create transporter using Gmail with better configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email transporter verification failed:', error);
    } else {
        console.log('✅ Email transporter is ready to send emails');
    }
});

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export class EmailService {
    static async sendEmail(options: EmailOptions): Promise<void> {
        try {
            console.log('📧 Sending email to:', options.to);

            const mailOptions = {
                from: {
                    name: 'UNY Compass Support',
                    address: process.env.EMAIL_USER!
                },
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text || options.html.replace(/<[^>]*>/g, ''),
                // Add headers to improve deliverability
                headers: {
                    'X-Mailer': 'UNY Compass',
                    'X-Priority': '3',
                    'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER!}?subject=Unsubscribe>`,
                    'Reply-To': process.env.EMAIL_USER!
                }
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully:', info.messageId);

        } catch (error) {
            console.error('❌ Failed to send email:', error);
            throw new Error('Failed to send email');
        }
    }

    static async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password - UNY Compass</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
                        line-height: 1.6; 
                        color: #333; 
                        margin: 0; 
                        padding: 0; 
                        background-color: #f8f9fa;
                    }
                    .container { 
                        max-width: 600px; 
                        margin: 20px auto; 
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .header { 
                        text-align: center; 
                        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
                        padding: 40px 20px; 
                        color: white;
                    }
                    .header h1 { 
                        margin: 0; 
                        font-size: 2rem; 
                        font-weight: 700; 
                        letter-spacing: -0.025em;
                    }
                    .header p { 
                        margin: 8px 0 0 0; 
                        opacity: 0.9; 
                        font-size: 1.1rem; 
                    }
                    .content { 
                        padding: 40px 30px; 
                    }
                    .content h2 {
                        color: #1f2937;
                        margin-top: 0;
                        margin-bottom: 24px;
                        font-size: 1.5rem;
                        font-weight: 600;
                    }
                    .content p {
                        margin-bottom: 16px;
                        color: #4b5563;
                        font-size: 16px;
                    }
                    .button-container {
                        text-align: center;
                        margin: 32px 0;
                    }
                    .button { 
                        display: inline-block; 
                        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
                        color: white !important; 
                        text-decoration: none; 
                        padding: 16px 32px; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px;
                        transition: transform 0.2s ease;
                    }
                    .button:hover {
                        transform: translateY(-1px);
                    }
                    .link-box {
                        background: #f3f4f6;
                        padding: 16px;
                        border-radius: 8px;
                        margin: 24px 0;
                        border-left: 4px solid #6366f1;
                    }
                    .link-box p {
                        margin: 0;
                        word-break: break-all;
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                        font-size: 14px;
                        color: #6b7280;
                    }
                    .warning { 
                        background: #fef3c7; 
                        border: 1px solid #fcd34d; 
                        padding: 20px; 
                        border-radius: 8px; 
                        margin: 24px 0; 
                    }
                    .warning-title {
                        color: #92400e;
                        font-weight: 600;
                        margin: 0 0 12px 0;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .warning ul {
                        margin: 0;
                        padding-left: 20px;
                        color: #92400e;
                    }
                    .warning li {
                        margin-bottom: 4px;
                    }
                    .footer { 
                        background: #f9fafb;
                        text-align: center; 
                        padding: 24px; 
                        border-top: 1px solid #e5e7eb;
                        color: #6b7280; 
                        font-size: 14px; 
                    }
                    .footer p {
                        margin: 4px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>UNY Compass</h1>
                        <p>Your Academic Journey Companion</p>
                    </div>
                    
                    <div class="content">
                        <h2>🔐 Password Reset Request</h2>
                        <p>Hello there!</p>
                        <p>We received a request to reset the password for your UNY Compass account. No worries – it happens to the best of us!</p>
                        
                        <div class="button-container">
                            <a href="${resetLink}" class="button">Reset My Password</a>
                        </div>
                        
                        <p><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
                        <div class="link-box">
                            <p>${resetLink}</p>
                        </div>
                        
                        <div class="warning">
                            <p class="warning-title">⚠️ Important Security Information</p>
                            <ul>
                                <li>This reset link will expire in <strong>1 hour</strong> for your security</li>
                                <li>If you didn't request this password reset, please ignore this email</li>
                                <li>Your current password remains unchanged until you complete the reset process</li>
                                <li>Only use this link if you initiated the password reset request</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p><strong>UNY Compass Support Team</strong></p>
                        <p>This is an automated message from UNY Compass</p>
                        <p>If you're having trouble, please contact our support team</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const textVersion = `
UNY COMPASS - Password Reset Request

Hello!

We received a request to reset the password for your UNY Compass account.

To reset your password, copy and paste this link into your browser:
${resetLink}

IMPORTANT SECURITY INFORMATION:
• This reset link will expire in 1 hour for your security
• If you didn't request this password reset, please ignore this email
• Your current password remains unchanged until you complete the reset process
• Only use this link if you initiated the password reset request

---
UNY Compass Support Team
This is an automated message from UNY Compass
        `;

        await this.sendEmail({
            to: email,
            subject: '🔐 Reset Your UNY Compass Password - Action Required',
            html,
            text: textVersion
        });
    }

    // Test email function
    static async sendTestEmail(to: string): Promise<void> {
        await this.sendEmail({
            to,
            subject: '✅ UNY Compass Email Test - Success!',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 12px;">
                    <h1 style="margin: 0 0 16px 0; font-size: 2rem;">🎉 Email Test Successful!</h1>
                    <p style="margin: 0; font-size: 1.1rem; opacity: 0.9;">Your UNY Compass email configuration is working perfectly.</p>
                    <p style="margin: 16px 0 0 0; font-size: 1rem; opacity: 0.8;">You can now receive password reset emails and other important notifications.</p>
                </div>
            `,
            text: 'UNY Compass Email Test Successful! Your email configuration is working correctly. You can now receive password reset emails and other important notifications.'
        });
    }

    // Add a method to send welcome emails
    static async sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
        const name = firstName ? ` ${firstName}` : '';

        await this.sendEmail({
            to: email,
            subject: '🎓 Welcome to UNY Compass - Let\'s Get Started!',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 2rem; font-weight: 700;">Welcome to UNY Compass!</h1>
                        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 1.1rem;">Your Academic Journey Starts Here</p>
                    </div>
                    <div style="padding: 40px 30px; text-align: center;">
                        <h2 style="color: #1f2937; margin: 0 0 20px 0;">Hi${name}! 👋</h2>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Thank you for joining UNY Compass. We're excited to help you navigate your academic journey and achieve your goals.</p>
                        <p style="color: #6b7280; font-size: 14px; margin: 0;">Questions? Just reply to this email - we're here to help!</p>
                    </div>
                </div>
            `,
            text: `Welcome to UNY Compass!
            
Hi${name}!

Thank you for joining UNY Compass. We're excited to help you navigate your academic journey and achieve your goals.

Questions? Just reply to this email - we're here to help!

Best regards,
UNY Compass Team`
        });
    }
}