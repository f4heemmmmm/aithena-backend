import { Controller, Get, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    @ApiOperation({ summary: "Get overall system health" })
    @ApiResponse({ status: 200, description: "System health status" })
    async getHealth() {
        const health = await this.healthService.getSystemHealth();
        return {
            status_code: HttpStatus.OK,
            message: "System health check completed",
            data: health
        };
    }

    @Get("database")
    @ApiOperation({ summary: "Get database health" })
    @ApiResponse({ status: 200, description: "Database health status" })
    async getDatabaseHealth() {
        const dbHealth = await this.healthService.getDatabaseHealth();
        return {
            status_code: HttpStatus.OK,
            message: "Database health check completed",
            data: dbHealth
        };
    }

    @Get("blog")
    @ApiOperation({ summary: "Get blog service health" })
    @ApiResponse({ status: 200, description: "Blog service health status" })
    async getBlogHealth() {
        const blogHealth = await this.healthService.getBlogHealth();
        return {
            status_code: HttpStatus.OK,
            message: "Blog service health check completed",
            data: blogHealth
        };
    }
}