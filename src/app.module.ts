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

        // Database Configuration
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: "postgres",
                host: configService.get("DATABASE_HOST"),
                port: configService.get("DATABASE_PORT"),
                username: configService.get("DATABASE_USERNAME"),
                password: configService.get("DATABASE_PASSWORD"),
                database: configService.get("DATABASE_NAME"),
                entities: [__dirname + "/**/*.entity{.ts,.js}"],
                synchronize: configService.get("NODE_ENV") === "development",       // Enable for development
                migrations: [__dirname + "/migrations/*{.ts,.js}"],
                migrationsRun: configService.get("NODE_ENV") !== "development",     // Run migrations in production
                logging: configService.get("NODE_ENV") === "development",           // Enable logging in development
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
        console.log(`🗄️  Database: ${this.configService.get("DATABASE_NAME")}`);
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