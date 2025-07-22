import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Administrator } from "./admin.entity";
import { AdministratorService } from "./admin.service";
import { AdministratorController } from "./admin.controller";

@Module({
    imports: [TypeOrmModule.forFeature([Administrator])],
    controllers: [AdministratorController],
    providers: [AdministratorService],
    exports: [AdministratorService],
})
export class AdministratorModule {};