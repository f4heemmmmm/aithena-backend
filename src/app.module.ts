import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AppService } from "./app.service";
import { AppController } from "./app.controller";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BlogPostModule } from "./modules/blog/blog.module";
import { ContactModule } from "./modules/contact/contact.module";
import { AdministratorModule } from "./modules/admin/admin.module";

@Module({
    imports: [
        // Global Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ".env",
            cache: true,
        }),

        // Database Configuration - FIXED VERSION
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: "postgres",
                url: configService.get("DATABASE_URL"), // Use DATABASE_URL instead of individual params
                ssl: configService.get("NODE_ENV") === "production" ? { rejectUnauthorized: false } : false,
                entities: [__dirname + "/**/*.entity{.ts,.js}"],
                synchronize: true, // TEMPORARILY enable to create tables
                autoLoadEntities: true,
                logging: configService.get("NODE_ENV") === "development",
            }),
            inject: [ConfigService]
        }),

        // Rate Limiting Module
        ThrottlerModule.forRoot([
            {
                name: "short",
                ttl: 60000,
                limit: 10,
            },
            {
                name: "medium", 
                ttl: 600000,
                limit: 50,
            },
            {
                name: "long",
                ttl: 3600000,
                limit: 100,
            },
        ]),

        HealthModule,
        ContactModule,
        AdministratorModule,
        AuthModule,
        BlogPostModule,
    ],
    controllers: [AppController],
    providers: [AppService]
})

export class AppModule {
    constructor(private configService: ConfigService) {
        // Log important configuration on startup
        console.log("🚀 ================================");
        console.log("🚀 AITHENA Backend Starting...");
        console.log("🚀 ================================");
        console.log(`📊 Environment: ${this.configService.get("NODE_ENV")}`);
        console.log(`🗄️  Database URL: ${this.configService.get("DATABASE_URL")}`);
        console.log(`🌐 Port: ${this.configService.get("PORT")}`);
        console.log(`🔗 Frontend URL: ${this.configService.get("FRONTEND_URL")}`);
        console.log("📦 Loaded Modules:");
        console.log("   ✅ HealthModule (debugging)");
        console.log("   ✅ ContactModule");
        console.log("   ✅ AdministratorModule");
        console.log("   ✅ AuthModule");
        console.log("   ✅ BlogPostModule (new)");
        console.log("🚀 ================================");
    }
};