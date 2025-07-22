import { JWTAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { AuthService, LoginResult, RefreshResult } from "./auth.service";
import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe, UseGuards, Get, Request, OnModuleInit } from "@nestjs/common";

import { LoginAdministratorDTO } from "../admin/admin.dto";

export interface ApiResponse<T> {
    statusCode: number;
    message: string;
    data: T;
}

export interface RefreshTokenDTO {
    refresh_token: string;
}

@Controller("auth")
export class AuthController implements OnModuleInit {
    constructor(
        private readonly authService: AuthService
    ) {}

    onModuleInit() {
        console.log("AuthController loaded successfully");
        console.log("Available routes:");
        console.log(" - POST /api/auth/login");
        console.log(" - POST /api/auth/refresh");
        console.log(" - GET /api/auth/profile");
        console.log(" - GET /api/auth/verify");
    }

    @Post("login")
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async login (@Body() loginDTO: LoginAdministratorDTO): Promise<ApiResponse<LoginResult>> {
        console.log("Login attempt for: ", loginDTO.email);
        const result = await this.authService.login(loginDTO);
        return {
            statusCode: HttpStatus.OK,
            message: "Login successful",
            data: result,
        };
    }

    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async refreshToken(@Body() refreshDTO: RefreshTokenDTO): Promise<ApiResponse<RefreshResult>> {
        const result = await this.authService.refreshToken(refreshDTO.refresh_token);
        return {
            statusCode: HttpStatus.OK,
            message: "Token refreshed successfully",
            data: result,
        };
    }

    @Get("profile")
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.OK)
    async getProfile(@Request() req: any): Promise<ApiResponse<any>> {
        return {
            statusCode: HttpStatus.OK,
            message: "Profile retrieved successfully",
            data: req.user,
        };
    }

    @Get("verify")
    @UseGuards(JWTAuthGuard)
    @HttpCode(HttpStatus.OK)
    async verifyToken(@Request() req: any): Promise<ApiResponse<any>> {
        return {
            statusCode: HttpStatus.OK,
            message: "Token is valid",
            data: {
                user: req.user,
                isValid: true,
            }
        };
    }
};