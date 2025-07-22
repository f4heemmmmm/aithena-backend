import { ConfigService } from "@nestjs/config";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, ValidationPipe, Logger } from "@nestjs/common";

import { CreateContactDTO } from "./contact.dto";
import { ContactService } from "./contact.service";
import { EmailResponse } from "./contact.interface";

@Controller("contact")
@UseGuards(ThrottlerGuard)
export class ContactController {
    private readonly logger = new Logger(ContactController.name);

    constructor(
        private readonly contactService: ContactService,
        private readonly configService: ConfigService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    async submitContact(@Body(ValidationPipe) createContactDTO: CreateContactDTO): Promise<EmailResponse> {
        this.logger.log("Contact form submission received");
        this.logger.log("Data:", JSON.stringify(createContactDTO, null, 2));

        try {
            const result = await this.contactService.sendContactEmail(createContactDTO);
            this.logger.log("Email sent successfully");
            return result;
        } catch (error) {
            this.logger.error("Failed to send email:", error.message);
            throw error;
        }
    }

    @Get("health")
    async checkEmailHealth(): Promise<{ status: string; emailReady: boolean; config: any; timestamp: string; }> {
        this.logger.log("Health check requested");
        const emailReady = await this.contactService.testEmailConnection();

        const config = {
            smtpHost: this.configService.get<string>("SMTP_HOST"),
            smtpPort: this.configService.get<number>("SMTP_PORT"),
            smtpSecure: this.configService.get<boolean>("SMTP_SECURE", false),
            smtpUser: this.configService.get<string>("SMTP_USER"),
            smtpPassLength: this.configService.get<string>("SMTP_PASS")?.length || 0,
            smtpFrom: this.configService.get<string>("SMTP_FROM"),
            contactEmail: this.configService.get<string>("CONTACT_EMAIL"),
            nodeEnv: this.configService.get<string>("NODE_ENV"),
        };
        
        this.logger.log("📊 Health check config:", config);

        return {
            status: "OK",
            emailReady,
            config, 
            timestamp: new Date().toISOString(),
        };
    }
    
    @Get("debug-email")
    async debugEmail(): Promise<any> {
        this.logger.log("Debug email endpoint called");  
        try {
            const testResult = await this.contactService.testEmailConnection();
            return {
                success: true,
                emailReady: testResult,
                message: "Email connection test completed",
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            this.logger.error("Debug email test failed:", error);
            return {
                success: false,
                emailReady: false,
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }
};