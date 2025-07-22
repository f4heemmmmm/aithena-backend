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

        // Database Configuration - UPDATED FOR RAILWAY
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const isProduction = configService.get("NODE_ENV") === "production";
                
                // Log database configuration for debugging
                console.log("🗄️  Database Configuration:");
                console.log(`   Host: ${configService.get("DATABASE_HOST") || configService.get("PGHOST")}`);
                console.log(`   Port: ${configService.get("DATABASE_PORT") || configService.get("PGPORT")}`);
                console.log(`   Database: ${configService.get("DATABASE_NAME") || configService.get("PGDATABASE")}`);
                console.log(`   Username: ${configService.get("DATABASE_USERNAME") || configService.get("PGUSER")}`);
                console.log(`   Production: ${isProduction}`);

                return {
                    type: "postgres",
                    host: configService.get("DATABASE_HOST") || configService.get("PGHOST"),
                    port: parseInt(configService.get("DATABASE_PORT") || configService.get("PGPORT") || "5432"),
                    username: configService.get("DATABASE_USERNAME") || configService.get("PGUSER"),
                    password: configService.get("DATABASE_PASSWORD") || configService.get("PGPASSWORD"),
                    database: configService.get("DATABASE_NAME") || configService.get("PGDATABASE"),
                    entities: [__dirname + "/**/*.entity{.ts,.js}"],
                    synchronize: !isProduction, // Only sync in development
                    migrations: [__dirname + "/migrations/*{.ts,.js}"],
                    migrationsRun: isProduction, // Run migrations in production
                    logging: !isProduction, // Enable logging in development only
                    ssl: isProduction ? { rejectUnauthorized: false } : false, // SSL for production
                    extra: isProduction ? {
                        ssl: {
                            rejectUnauthorized: false
                        }
                    } : {}
                };
            },
            inject: [ConfigService]
        }),

        // Rate Limiting Module - PRODUCTION OPTIMIZED
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const isProduction = configService.get("NODE_ENV") === "production";
                
                return [
                    {
                        name: "short",
                        ttl: parseInt(configService.get("RATE_LIMIT_SHORT_TTL") || "60000"),
                        limit: parseInt(configService.get("RATE_LIMIT_SHORT_LIMIT") || (isProduction ? "5" : "10")),
                    },
                    {
                        name: "medium",
                        ttl: parseInt(configService.get("RATE_LIMIT_MEDIUM_TTL") || "600000"),
                        limit: parseInt(configService.get("RATE_LIMIT_MEDIUM_LIMIT") || (isProduction ? "25" : "50")),
                    },
                    {
                        name: "long",
                        ttl: parseInt(configService.get("RATE_LIMIT_LONG_TTL") || "3600000"),
                        limit: parseInt(configService.get("RATE_LIMIT_LONG_LIMIT") || (isProduction ? "50" : "100")),
                    },
                ];
            },
            inject: [ConfigService]
        }),

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
        // Enhanced startup logging
        console.log("🚀 ================================");
        console.log("🚀 AITHENA Backend Starting...");
        console.log("🚀 ================================");
        console.log(`📊 Environment: ${this.configService.get("NODE_ENV")}`);
        console.log(`🗄️  Database: ${this.configService.get("DATABASE_NAME") || this.configService.get("PGDATABASE")}`);
        console.log(`🗄️  Database Host: ${this.configService.get("DATABASE_HOST") || this.configService.get("PGHOST")}`);
        console.log(`🌐 Port: ${this.configService.get("PORT")}`);
        console.log(`🔗 Frontend URL: ${this.configService.get("FRONTEND_URL")}`);
        console.log(`🔐 JWT Secret Set: ${this.configService.get("JWT_SECRET") ? "✅" : "❌"}`);
        console.log(`🔐 JWT Refresh Secret Set: ${this.configService.get("JWT_REFRESH_SECRET") ? "✅" : "❌"}`);
        console.log("📦 Loaded Modules:");
        console.log("   ✅ HealthModule");
        console.log("   ✅ ContactModule");
        console.log("   ✅ AdministratorModule");
        console.log("   ✅ AuthModule");
        console.log("   ✅ BlogPostModule");
        console.log("🚀 ================================");
    }
};