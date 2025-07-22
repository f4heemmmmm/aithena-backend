// 1. UPDATE main.ts for better production CORS handling
import * as express from "express";
import { AppModule } from "./app.module";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

// Extend Express Request interface to include ip property
interface ExtendedRequest extends Request {
    ip: string;
}

async function bootstrap() {
    try {
        console.log("🚀 Starting AITHENA Backend...");

        const app = await NestFactory.create(AppModule, {
            logger: ["error", "warn", "log", "debug", "verbose"],
        });

        const configService = app.get(ConfigService);

        // Configure payload size limits for image uploads
        app.use(express.json({ 
            limit: "10mb",
            verify: (req: ExtendedRequest, res: Response, buf: Buffer) => {
                if (buf.length > 5 * 1024 * 1024) { // 5MB
                    const clientIp = req.ip || req.connection?.remoteAddress || "unknown";
                    console.log(`📸 Large request received: ${Math.round(buf.length / 1024 / 1024)}MB from ${clientIp}`);
                }
            }
        }));
        
        app.use(express.urlencoded({ 
            limit: "10mb", 
            extended: true,
            parameterLimit: 50000
        }));

        app.use(express.raw({ 
            limit: "10mb",
            type: ["image/*", "application/octet-stream"]
        }));

        // IMPROVED: Configure CORS for production
        const frontendUrl = configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
        const nodeEnv = configService.get<string>("NODE_ENV") || "development";
        
        // Production vs Development origins
        const allowedOrigins = nodeEnv === "production" 
            ? [
                frontendUrl,
                "https://*.vercel.app", // Allow all Vercel deployments
                "https://your-custom-domain.com" // Add your custom domain if any
            ]
            : [
                frontendUrl,
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
                "https://localhost:3000",
                "https://localhost:3001"
            ];

        app.enableCors({
            origin: (origin, callback) => {
                // Allow requests with no origin (like mobile apps, curl, etc.)
                if (!origin) return callback(null, true);
                
                // Check if origin matches allowed patterns
                const isAllowed = allowedOrigins.some(allowedOrigin => {
                    if (allowedOrigin.includes("*")) {
                        // Handle wildcard domains
                        const pattern = allowedOrigin.replace("*", ".*");
                        return new RegExp(pattern).test(origin);
                    }
                    return allowedOrigin === origin;
                });

                if (isAllowed) {
                    callback(null, true);
                } else {
                    console.warn(`🚫 CORS blocked request from: ${origin}`);
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: [
                "Content-Type", 
                "Authorization", 
                "Accept", 
                "Origin", 
                "X-Requested-With",
                "Content-Length"
            ],
            credentials: true,
            maxAge: 86400,
        });

        // Set global prefix for API routes
        app.setGlobalPrefix("api");

        // Configure global validation with transformation
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
                transformOptions: {
                    enableImplicitConversion: true,
                },
                validationError: {
                    target: false,
                    value: false,
                },
            }),
        );

        // Add request timeout middleware
        app.use((req: Request, res: Response, next: NextFunction) => {
            if (["POST", "PATCH", "PUT"].includes(req.method)) {
                req.setTimeout(120000); // 2 minutes
                res.setTimeout(120000);
            } else {
                req.setTimeout(30000); // 30 seconds
                res.setTimeout(30000);
            }
            next();
        });

        // Add request logging middleware
        app.use((req: Request, res: Response, next: NextFunction) => {
            const start = Date.now();
            
            res.on("finish", () => {
                const duration = Date.now() - start;
                const contentLength = req.get("content-length");
                
                if (contentLength && parseInt(contentLength) > 1024 * 1024) {
                    console.log(`📊 ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - ${Math.round(parseInt(contentLength) / 1024)}KB`);
                }
            });
            
            next();
        });

        // IMPROVED: Add enhanced health endpoint at root level
        app.getHttpAdapter().get("/health", (req: Request, res: Response) => {
            res.json({
                status: "OK",
                timestamp: new Date().toISOString(),
                service: "AITHENA Backend",
                environment: nodeEnv,
                version: process.env.npm_package_version || "1.0.0",
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                node_version: process.version,
                database: "PostgreSQL", // Add database info
            });
        });

        // Setup Swagger API documentation (disable in production for security)
        if (nodeEnv !== "production") {
            const config = new DocumentBuilder()
                .setTitle("AITHENA API")
                .setDescription(`
                    The AITHENA API documentation including Blog, Contact, and Admin modules.
                    
                    📸 Image Upload Support:
                    - Maximum file size: 10MB (original)
                    - Supported formats: JPEG, PNG, GIF, WebP
                    - Automatic compression applied on frontend
                    - Images stored as base64 in database
                    
                    📋 Blog Features:
                    - Rich text editor with image support
                    - SEO-friendly slugs
                    - View tracking
                    - Search functionality
                    - Featured/published status
                `)
                .setVersion("1.0")
                .addBearerAuth(
                    {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                        name: "JWT",
                        description: "Enter JWT token",
                        in: "header",
                    },
                    "JWT-auth",
                )
                .addTag("Blog", "Blog post management with image upload support")
                .addTag("Admin", "Administrative functions")
                .addTag("Health", "System health checks")
                .build();

            const document = SwaggerModule.createDocument(app, config);
            SwaggerModule.setup("api/docs", app, document);
        }

        const port = configService.get<number>("PORT") || 3001;

        await app.listen(port);

        console.log("\n🎉 ================================");
        console.log(`🚀 Server running: http://localhost:${port}`);
        if (nodeEnv !== "production") {
            console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
        }
        console.log(`🌍 Environment: ${nodeEnv}`);
        console.log(`🔗 CORS enabled for: ${allowedOrigins.join(", ")}`);
        console.log(`📸 Image upload: 10MB max payload size`);
        console.log(`⏱️  Upload timeout: 2 minutes`);
        
        if (nodeEnv === "production") {
            console.log(`\n🔒 Production mode: Swagger disabled for security`);
            console.log(`🌐 Frontend URL: ${frontendUrl}`);
        }
        
        console.log("🎉 ================================\n");

    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

bootstrap();