import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ExtractJwt, Strategy, StrategyOptions } from "passport-jwt";

import { AdministratorService } from "src/modules/admin/admin.service";

export interface JWTPayload {
    sub: string;
    email: string;
    first_name: string;
    last_name: string;
    iat?: number;
    exp?: number;
}

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly administratorService: AdministratorService,
    ) {
        const JWTSecret = configService.get<string>("JWT_SECRET");

        if (!JWTSecret) {
            throw new Error("JWT_SECRET is not defined in the environment variables.");
        }

        const strategyOptions: StrategyOptions = {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: JWTSecret,
        };

        super(strategyOptions);
    }

    async validate(payload: JWTPayload) {
        const { sub: id, email } = payload;

        try {
            const administrator = await this.administratorService.findOne(id);

            if (!administrator) {
                throw new UnauthorizedException("Administrator not found");
            }

            return {
                id: administrator.id,
                sub: administrator.id,
                email: administrator.email,
                first_name: administrator.first_name,
                last_name: administrator.last_name,
            };
        } catch (error) {
            console.error("JWT validation error: ", error);
            throw new UnauthorizedException("Invalid token");
        }
    };
};