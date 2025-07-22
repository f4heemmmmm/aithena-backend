import * as nodemailer from "nodemailer";
import { ConfigService } from "@nestjs/config";
import { Injectable, Logger, BadRequestException } from "@nestjs/common";

import { CreateContactDTO } from "./contact.dto";
import { EmailResponse } from "./contact.interface";

@Injectable()
export class ContactService {
    private readonly logger = new Logger(ContactService.name);
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.initializeTransporter();
    }

    private initializeTransporter() {
        const smtpHost = this.configService.get<string>("SMTP_HOST");
        const smtpPort = this.configService.get<number>("SMTP_PORT");
        const smtpUser = this.configService.get<string>("SMTP_USER");
        const smtpPass = this.configService.get<string>("SMTP_PASS");
        const smtpSecure = this.configService.get<boolean>("SMTP_SECURE", false);

        this.logger.log("🔧 Initializing email transporter...");
        this.logger.log(`📧 SMTP Host: ${smtpHost}`);
        this.logger.log(`📧 SMTP Port: ${smtpPort}`);
        this.logger.log(`📧 SMTP Secure: ${smtpSecure}`);
        this.logger.log(`📧 SMTP User: ${smtpUser}`);
        this.logger.log(`📧 SMTP Pass: ${smtpPass ? "***" + smtpPass.slice(-4) : "NOT_SET"}`);
        this.logger.log(`📧 SMTP Pass Length: ${smtpPass ? smtpPass.length : 0} characters`);

        if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
            this.logger.error("❌ Missing SMTP configuration!");
            this.logger.error(`Missing: ${[
                !smtpHost && "SMTP_HOST",
                !smtpPort && "SMTP_PORT",
                !smtpUser && "SMTP_USER",
                !smtpPass && "SMTP_PASS"
            ].filter(Boolean).join(", ")}`);
            return;
        }

        const cleanPassword = smtpPass.replace(/\s/g, "");
        this.logger.log(`📧 Cleaned password length: ${cleanPassword.length}`);

        if (cleanPassword.length !== 16) {
            this.logger.error(`❌ Gmail App Password should be 16 characters, got ${cleanPassword.length}`);
            this.logger.error("Please check your Gmail App Password format");
        }

        try {
            this.transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: smtpUser,
                    pass: cleanPassword,
                },
                tls: {
                    rejectUnauthorized: false
                },
                debug: process.env.NODE_ENV === "development",
                logger: process.env.NODE_ENV === "development",
            });
            this.logger.log("✅ Gmail transporter created successfully");
        } catch (error) {
            this.logger.error("❌ Error creating Gmail transporter:", error.message);
        }
    }

    async sendContactEmail(contactData: CreateContactDTO): Promise<EmailResponse> {
        try {
            this.logger.log("Processing contact form submission...");
            const { first_name, last_name, email, message } = contactData;
            if (!this.transporter) {
                this.logger.error("Email transporter not configured");
                throw new BadRequestException("Email service not available - transporter not initialized");
            }
            try {
                this.logger.log("Testing email connection...");
                await this.testConnectionWithTimeout();
                this.logger.log("Email connection verified");
            } catch (verifyError) {
                this.logger.error("Email connection verification failed:", verifyError.message);
                throw new BadRequestException(`Email connection failed: ${verifyError.message}`);
            }

            const notificationEmail = {
                from: `"AITHENA Contact Form" <${this.configService.get<string>("SMTP_USER")}>`,
                to: this.configService.get<string>("CONTACT_EMAIL"),
                subject: `New Contact Form Submission - ${first_name} ${last_name}`,
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Contact Form Submission</title>
                    </head>
                    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f5f5f5; color: #333;">
                        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0;">
                            
                            <!-- Header -->
                            <div style="background: #ffffff; padding: 24px; border-bottom: 1px solid #e0e0e0;">
                                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                                    New Contact Form Submission
                                </h1>
                                <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">
                                    Received on ${new Date().toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })}
                                </p>
                            </div>

                            <!-- Contact Details -->
                            <div style="padding: 24px;">
                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #555; width: 100px;">
                                            Name:
                                        </td>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #333;">
                                            ${first_name} ${last_name}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #555;">
                                            Email:
                                        </td>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                                            <a href="mailto:${email}" style="color: #0066cc; text-decoration: none;">
                                                ${email}
                                            </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; font-weight: 600; color: #555;">
                                            Date:
                                        </td>
                                        <td style="padding: 12px 0; color: #333;">
                                            ${new Date().toLocaleString()}
                                        </td>
                                    </tr>
                                </table>

                                <!-- Message -->
                                <div style="margin-bottom: 24px;">
                                    <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #333;">
                                        Message:
                                    </h2>
                                    <div style="background: #f8f9fa; padding: 16px; border-left: 4px solid #0066cc; white-space: pre-wrap; line-height: 1.5;">
                                        ${message}
                                    </div>
                                </div>

                                <!-- Reply Button -->
                                <div style="text-align: center; margin-top: 24px;">
                                    <a href="mailto:${email}?subject=Re: Your inquiry&body=Hello ${first_name},%0D%0A%0D%0AThank you for contacting us." 
                                       style="display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 500;">
                                        Reply to ${first_name}
                                    </a>
                                </div>
                            </div>

                            <!-- Footer -->
                            <div style="background: #f8f9fa; padding: 16px; border-top: 1px solid #e0e0e0; text-align: center;">
                                <p style="margin: 0; color: #666; font-size: 12px;">
                                    This email was automatically generated by the AITHENA contact form.
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                replyTo: email,
            };

            const autoReplyEmail = {
                from: `"AITHENA" <${this.configService.get<string>("SMTP_USER")}>`,
                to: email,
                subject: "Thank you for contacting AITHENA",
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Thank You - AITHENA</title>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                    </head>
                    <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); min-height: 100vh;">
                        <!-- Main Container -->
                        <div style="max-width: 680px; margin: 0 auto; background: #ffffff; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden;">
                            
                            <!-- Hero Header -->
                            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 60px 40px; text-align: center; position: relative; overflow: hidden;">
                                <!-- Animated Background Pattern -->
                                <div style="position: absolute; inset: 0; opacity: 0.1;">
                                    <div style="position: absolute; inset: 0; background-image: radial-gradient(circle at 25px 25px, rgba(59, 130, 246, 0.3) 2px, transparent 0); background-size: 50px 50px;"></div>
                                </div>
                                
                                <!-- Floating Decorative Elements -->
                                <div style="position: absolute; top: 20px; left: 40px; width: 80px; height: 80px; background: rgba(59, 130, 246, 0.15); border-radius: 50%; filter: blur(30px);"></div>
                                <div style="position: absolute; bottom: 30px; right: 40px; width: 100px; height: 100px; background: rgba(147, 197, 253, 0.1); border-radius: 50%; filter: blur(40px);"></div>
                                <div style="position: absolute; top: 50%; left: 20px; width: 60px; height: 60px; background: rgba(59, 130, 246, 0.08); border-radius: 50%; filter: blur(25px);"></div>
                                
                                <!-- Content -->
                                <div style="position: relative; z-index: 10;">
                                    <div style="margin-bottom: 20px;">
                                        <h1 style="margin: 0; font-family: 'DM Sans', sans-serif; font-size: 56px; font-weight: 300; color: #ffffff; letter-spacing: -0.03em; line-height: 1.1;">
                                            Thank You
                                        </h1>
                                    </div>
                                    <p style="margin: 0; color: #93c5fd; font-size: 18px; font-weight: 300; letter-spacing: 0.01em;">
                                        We've received your message
                                    </p>
                                </div>
                            </div>

                            <!-- Content Section -->
                            <div style="padding: 50px 40px; background: #ffffff;">
                                <!-- Greeting -->
                                <div style="margin-bottom: 40px;">
                                    <p style="margin: 0 0 30px 0; font-family: 'DM Sans', sans-serif; font-size: 20px; color: #1e293b; font-weight: 400; letter-spacing: -0.01em;">
                                        Dear ${first_name},
                                    </p>
                                    
                                    <p style="margin: 0; font-size: 17px; color: #475569; line-height: 1.8; font-weight: 300;">
                                        Thank you for reaching out to <span style="font-family: 'DM Sans', sans-serif; font-weight: 600; color: #1e293b; background: linear-gradient(135deg, #3b82f6, #1d4ed8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">AITHENA</span>. We have received your message and will respond within 24 hours. Your inquiry is important to us, and we look forward to assisting you with our AI-powered legal solutions.
                                    </p>
                                </div>

                                <!-- Message Summary Card -->
                                <div style="background: linear-gradient(135deg, #faf0e6 0%, #f8fafc 100%); border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin: 40px 0; position: relative; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%); border-radius: 16px 16px 0 0;"></div>
                                    
                                    <div style="margin-bottom: 20px;">
                                        <h3 style="margin: 0; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px;">
                                            Your Message
                                        </h3>
                                    </div>
                                    <div style="background: #ffffff; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6;">
                                        <p style="margin: 0; color: #374151; font-style: italic; line-height: 1.7; font-size: 15px;">
                                            "${message.length > 160 ? message.substring(0, 160) + "..." : message}"
                                        </p>
                                    </div>
                                </div>

                                <!-- Call-to-Action Section -->
                                <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 32px; margin: 40px 0; text-align: center; position: relative; overflow: hidden;">
                                    <div style="position: absolute; top: 10px; right: 15px; width: 40px; height: 40px; background: rgba(59, 130, 246, 0.1); border-radius: 50%; filter: blur(15px);"></div>
                                    <div style="position: absolute; bottom: 10px; left: 15px; width: 50px; height: 50px; background: rgba(147, 197, 253, 0.08); border-radius: 50%; filter: blur(20px);"></div>
                                    
                                    <div style="position: relative; z-index: 10;">
                                        <h3 style="margin: 0 0 16px 0; font-family: 'DM Sans', sans-serif; font-size: 20px; font-weight: 500; color: #ffffff; letter-spacing: -0.01em;">
                                            Need immediate assistance?
                                        </h3>
                                        <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                                            For urgent inquiries, reach out to us directly
                                        </p>
                                        <a href="mailto:hello@aithena.sg" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px; box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.3); transition: all 0.3s ease;">
                                            hello@aithena.sg
                                        </a>
                                    </div>
                                </div>

                                <!-- Signature -->
                                <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0 0 12px 0; font-size: 16px; color: #475569; font-weight: 300;">
                                        Best regards,
                                    </p>
                                    <p style="margin: 0; font-family: 'DM Sans', sans-serif; font-size: 20px; font-weight: 600; color: #1e293b; letter-spacing: -0.01em;">
                                        The AITHENA Team
                                    </p>
                                </div>
                            </div>

                            <!-- Footer -->
                            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px; border-top: 1px solid #e2e8f0;">
                                <!-- Brand Section -->
                                <div style="text-align: center; margin-bottom: 25px;">
                                    <h4 style="margin: 0 0 8px 0; font-family: 'DM Sans', sans-serif; font-size: 32px; font-weight: 600; color: #1e293b; letter-spacing: -0.02em;">
                                        AITHENA
                                    </h4>
                                    <p style="margin: 0; font-family: 'DM Sans', sans-serif; color: #3b82f6; font-size: 15px; font-weight: 300; font-style: italic; letter-spacing: 0.01em;">
                                        Simplifying Legal Work with AI-Powered Efficiency
                                    </p>
                                </div>
                                
                                <!-- Address & Legal -->
                                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0 0 12px 0; color: #64748b; font-size: 14px; line-height: 1.6; font-weight: 400;">
                                        160 Robinson Road, #14-04<br>
                                        Singapore Business Federation Center
                                    </p>
                                    <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 300;">
                                        This is an automated message. Please do not reply to this email.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
            };

            this.logger.log("Sending notification email...");
            await this.transporter.sendMail(notificationEmail);
            this.logger.log("Notification email sent successfully");

            this.logger.log("Sending auto-reply email...");
            await this.transporter.sendMail(autoReplyEmail);
            this.logger.log("Auto-reply email sent successfully");

            this.logger.log(`Contact form emails sent successfully for ${first_name} ${last_name}`);

            return {
                success: true,
                message: "Message sent successfully! We'll get back to you soon.",
            };

        } catch (error) {
            this.logger.error("Failed to send emails:", error);

            if (error && typeof error === "object" && "code" in error) {
                const emailError = error as { code?: string; message?: string };

                if (emailError.code === "EAUTH") {
                    throw new BadRequestException("Gmail authentication failed. Check your email and app password.");
                } else if (emailError.code === "ECONNECTION" || emailError.code === "ETIMEDOUT") {
                    throw new BadRequestException("Unable to connect to Gmail servers. Check your internet connection.");
                } else if (emailError.code === "EMESSAGE") {
                    throw new BadRequestException("Invalid email format.");
                }
            }

            if (error instanceof BadRequestException) {
                throw error;
            }

            const errorMessage = error instanceof Error ? error.message : "Unknown email error";
            throw new BadRequestException(`Email sending failed: ${errorMessage}`);
        }
    }

    private async testConnectionWithTimeout(): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Gmail connection timeout (15s)"));
            }, 15000);

            this.transporter.verify((error, success) => {
                clearTimeout(timeout);
                if (error) {
                    this.logger.error("❌ Gmail verify callback error:", error);
                    reject(error);
                } else {
                    this.logger.log("✅ Gmail verify callback success:", success);
                    resolve();
                }
            });
        });
    }

    async testEmailConnection(): Promise<boolean> {
        try {
            if (!this.transporter) {
                this.logger.error("❌ Email transporter not initialized");
                return false;
            }
            this.logger.log("🧪 Testing Gmail connection...");
            await this.testConnectionWithTimeout();
            this.logger.log("✅ Gmail connection test successful");
            return true;
        } catch (error) {
            this.logger.error("❌ Gmail connection test failed:", error.message);
            this.logger.error("❌ Error details:", {
                code: error.code,
                command: error.command,
                response: error.response,
                stack: error.stack?.substring(0, 500),
            });
            return false;
        }
    }
}