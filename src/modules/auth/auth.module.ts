import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AdministratorModule } from "../admin/admin.module";
import { JWTStrategy } from "src/auth/strategy/jwt.strategy";

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: "jwt" }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const secret = configService.get<string>("JWT_SECRET");
                const expiresIn = configService.get<string>("JWT_EXPIRES_IN") || "24h";

                if (!secret) {
                    throw new Error("JWT_SECRET environment variable is required");
                }

                return {
                    secret,
                    signOptions: {
                        expiresIn,
                    }
                };
            },
            inject: [ConfigService],
        }),
        AdministratorModule, // This is important for JWTStrategy to access AdministratorService
    ],
    controllers: [AuthController],
    providers: [AuthService, JWTStrategy],
    exports: [AuthService, PassportModule, JwtModule] // Export JwtModule for other modules
})

export class AuthModule {}