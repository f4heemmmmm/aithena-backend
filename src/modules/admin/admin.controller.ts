import { JWTAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus, HttpCode, ValidationPipe, ParseUUIDPipe, UsePipes, UseInterceptors, ClassSerializerInterceptor, UseGuards } from "@nestjs/common";

import { AdministratorService } from "./admin.service";
import { CreateAdministratorDTO, UpdateAdministratorDTO } from "./admin.dto";

@Controller("administrators")
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JWTAuthGuard)
export class AdministratorController {
    constructor(
        private readonly administratorService: AdministratorService
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async create(@Body() createAdministratorDTO: CreateAdministratorDTO) {
        const administrator = await this.administratorService.create(createAdministratorDTO)
        return {
            statusCode: HttpStatus.CREATED,
            message: "Administrator created successfully",
            data: administrator,
        };
    }

    @Get()
    async findAll() {
        const administrators = await this.administratorService.findAll();
        const count = await this.administratorService.count();
        return {
            statusCode: HttpStatus.OK,
            message: "Administrators retrieved successfully",
            data: administrators,
            count,
        };
    }

    @Get(":id")
    async findOne(@Param("id", ParseUUIDPipe) id: string) {
        const administrator = await this.administratorService.findOne(id);
        return {
            statusCode: HttpStatus.OK,
            message: "Administrator retrieved successfully",
            data: administrator
        };
    }

    @Patch(":id")
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async update(@Param("id", ParseUUIDPipe) id: string, @Body() updateAdministratorDTO: UpdateAdministratorDTO) {
        const administrator = await this.administratorService.update(id, updateAdministratorDTO);
        return {
            statusCode: HttpStatus.OK,
            message: "Administrator updated successfully",
            data: administrator
        };
    }

    @Delete(":id")
    async remove(@Param("id", ParseUUIDPipe) id: string) {
        const result = await this.administratorService.remove(id);
        return {
            statusCode: HttpStatus.OK,
            message: result.message
        };
    }

    @Get("profile/:id")
    async getProfile(@Param("id", ParseUUIDPipe) id: string) {
        const administrator = await this.administratorService.findOne(id);
        return {
            statusCode: HttpStatus.OK,
            message: "Administrator profile received successfully",
            data: administrator,
        };
    }
}