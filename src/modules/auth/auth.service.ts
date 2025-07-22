import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";

import { LoginAdministratorDTO } from "../admin/admin.dto";
import { AdministratorService } from "../admin/admin.service";

export interface JWTPayload {
    sub: string;
    email: string;
    first_name: string;
    last_name: string;
    iat?: number;
    exp?: number;
}

export interface LoginResult {
    access_token: string;
    refresh_token: string;
    administrator: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
    };
}

export interface RefreshResult {
    access_token: string;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly administratorService: AdministratorService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async login(loginDTO: LoginAdministratorDTO): Promise<LoginResult> {
        try {
            this.logger.log(`Login attempt for email: ${loginDTO.email}`);

            const administrator = await this.administratorService.validateLogin(
                loginDTO.email,
                loginDTO.password
            );

            this.logger.log(`Administrator validated: ${administrator.email}`);

            const payload: Omit<JWTPayload, "iat" | "exp"> = {
                sub: administrator.id,
                email: administrator.email,
                first_name: administrator.first_name,
                last_name: administrator.last_name,
            };

            const jwtSecret = this.configService.get<string>("JWT_SECRET");
            const jwtRefreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET");
            const jwtExpiresIn = this.configService.get<string>("JWT_EXPIRES_IN") || "24h";
            const jwtRefreshExpiresIn = this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") || "7d";

            if (!jwtSecret || !jwtRefreshSecret) {
                this.logger.error("JWT secrets are not configured properly");
                throw new Error("JWT secrets are not configured properly");
            }

            const accessToken = this.jwtService.sign(payload, {
                secret: jwtSecret,
                expiresIn: jwtExpiresIn,
            });

            const refreshToken = this.jwtService.sign(payload, {
                secret: jwtRefreshSecret,
                expiresIn: jwtRefreshExpiresIn,
            });

            this.logger.log(`Tokens generated for user: ${administrator.email}`);

            return {
                access_token: accessToken,
                refresh_token: refreshToken,
                administrator: {
                    id: administrator.id,
                    email: administrator.email,
                    first_name: administrator.first_name,
                    last_name: administrator.last_name,
                }
            };
        } catch (error) {
            this.logger.error(`Login failed for email: ${loginDTO.email}`, error);
            throw error;
        }
    }

    async refreshToken(refreshToken: string): Promise<RefreshResult> {
        try {
            const jwtSecret = this.configService.get<string>("JWT_SECRET");
            const jwtRefreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET");
            const jwtExpiresIn = this.configService.get<string>("JWT_EXPIRES_IN") || "24h";

            if (!jwtRefreshSecret || !jwtSecret) {
                throw new UnauthorizedException("JWT configuration error");
            }

            const payload = this.jwtService.verify<JWTPayload>(refreshToken, {
                secret: jwtRefreshSecret,
            });

            const administrator = await this.administratorService.findOne(payload.sub);

            if (!administrator) {
                throw new UnauthorizedException("Administrator not found");
            }

            const newPayload: Omit<JWTPayload, "iat" | "exp"> = {
                sub: administrator.id,
                email: administrator.email,
                first_name: administrator.first_name,
                last_name: administrator.last_name,
            };

            const newAccessToken = this.jwtService.sign(newPayload, {
                secret: jwtSecret,
                expiresIn: jwtExpiresIn,
            });

            return {
                access_token: newAccessToken,
            };
        } catch (error) {
            this.logger.error("Token refresh failed", error);
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    async validateUser(email: string, password: string) {
        try {
            const administrator = await this.administratorService.validateLogin(email, password);
            return administrator;
        } catch (error) {
            return null;
        }
    }
}