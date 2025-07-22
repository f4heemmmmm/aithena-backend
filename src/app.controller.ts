import { Controller, Get } from "@nestjs/common";

import { AppService } from "./app.service";

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService
    ) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    // Root health endpoint (no /api prefix)
    @Get("health")
    getHealth(): { status: string; timestamp: string; service: string } {
        return {
            status: "OK",
            timestamp: new Date().toISOString(),
            service: "AITHENA Backend"
        };
    }

    // API health endpoint (with /api prefix)
    @Get("api/health")
    getAPIHealth(): { status: string; timestamp: string; service: string } {
        return {
            status: "OK",
            timestamp: new Date().toISOString(),
            service: "AITHENA Backend API"
        };
    }
}