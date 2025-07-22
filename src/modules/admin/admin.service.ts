import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, ConflictException, NotFoundException, UnauthorizedException, Logger } from "@nestjs/common";

import { Administrator } from "./admin.entity";
import { CreateAdministratorDTO, UpdateAdministratorDTO } from "./admin.dto";

@Injectable()
export class AdministratorService {
    private readonly logger = new Logger(AdministratorService.name);

    constructor(
        @InjectRepository(Administrator)
        private readonly administratorRepository: Repository<Administrator>,
    ) {}

    async create(createAdministratorDTO: CreateAdministratorDTO): Promise<Administrator> {
        const { email, password, first_name, last_name } = createAdministratorDTO;

        const existingAdmin = await this.administratorRepository.findOne({
            where: { email } 
        });

        if (existingAdmin) {
            throw new ConflictException("Administrator with this email already exists");
        }

        const administrator = this.administratorRepository.create({
            email,
            password, // No hashing - direct storage for now
            first_name,
            last_name
        });
        
        const savedAdmin = await this.administratorRepository.save(administrator);
        return savedAdmin.toResponseObject() as Administrator;
    }

    async findAll(): Promise<Administrator[]> {
        const administrators = await this.administratorRepository.find({
            where: { is_active: true },
            order: { created_at: "DESC" }
        });
        return administrators.map((administrator) => administrator.toResponseObject() as Administrator);
    }

    async findOne(id: string): Promise<Administrator> {
        const administrator = await this.administratorRepository.findOne({
            where: { id, is_active: true }
        });
        if (!administrator) {
            throw new NotFoundException("Administrator not found!");
        }
        return administrator.toResponseObject() as Administrator;
    }

    async findByEmail(email: string): Promise<Administrator | null> {
        return await this.administratorRepository.findOne({
            where: { email, is_active: true }
        });
    }

    async update(id: string, updateAdministratorDTO: UpdateAdministratorDTO): Promise<Administrator> {
        const administrator = await this.administratorRepository.findOne({
            where: { id, is_active: true },
        });

        if (!administrator) {
            throw new NotFoundException("Administrator not found");
        }

        if (updateAdministratorDTO.email && updateAdministratorDTO.email !== administrator.email) {
            const existingAdmin = await this.administratorRepository.findOne({
                where: { email: updateAdministratorDTO.email }
            });
            if (existingAdmin) {
                throw new ConflictException("Administrator with this email already exists");
            }
        }
        Object.assign(administrator, updateAdministratorDTO);
        const updatedAdministrator = await this.administratorRepository.save(administrator);
        return updatedAdministrator.toResponseObject() as Administrator;
    }

    async remove(id: string): Promise<{ message: string }>{
        const administrator = await this.administratorRepository.findOne({
            where: { id, is_active: true }
        });
        if (!administrator) {
            throw new NotFoundException("Administrator not found");
        }
        await this.administratorRepository.update(id, { is_active: false });
        return { message: "Administrator deleted successfully" };
    }

    async validateLogin(email: string, password: string): Promise<Administrator> {
        try {
            this.logger.log(`🔍 Attempting login for email: ${email}`);
            this.logger.log(`🔍 Password provided: ${password}`);
            
            const administrator = await this.administratorRepository.findOne({
                where: { email, is_active: true },
                select: ["id", "email", "password", "first_name", "last_name", "is_active"],
            });

            if (!administrator) {
                this.logger.warn(`❌ Administrator not found for email: ${email}`);
                throw new UnauthorizedException("Invalid credentials");
            }

            this.logger.log(`✅ Administrator found: ${administrator.email}`);
            this.logger.log(`🔍 Stored password: ${administrator.password}`);

            const isPasswordValid = await administrator.validatePassword(password);
            
            if (!isPasswordValid) {
                this.logger.warn(`❌ Password validation failed for email: ${email}`);
                this.logger.warn(`Input: "${password}" vs Stored: "${administrator.password}"`);
                throw new UnauthorizedException("Invalid credentials");
            }

            this.logger.log(`✅ Password validation successful for email: ${email}`);
            return administrator.toResponseObject() as Administrator;
        } catch (error) {
            this.logger.error(`❌ Login error for email: ${email}`, error);
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException("Invalid credentials");
        }
    }

    async count(): Promise<number> {
        return await this.administratorRepository.count({
            where: { is_active: true }
        });
    }
}