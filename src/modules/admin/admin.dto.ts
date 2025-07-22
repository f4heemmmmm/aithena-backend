import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional } from "class-validator";

export class CreateAdministratorDTO {
    @IsEmail({}, { message: "Please provide a valid email address" })
    @IsNotEmpty({ message: "Email address is required" })
    email: string;

    @IsString({ message: "Password must be a string" })
    @MinLength(8, { message: "Password must be at least 8 characters long" })
    @IsNotEmpty({ message: "Password is required" })
    password: string;

    @IsString({ message: "First name must be a string" })
    @IsNotEmpty({ message: "First name is required" })
    first_name: string;

    @IsString({ message: "Last name must be a string" })
    @IsNotEmpty({ message: "Last name is required" })
    last_name: string;
}

export class UpdateAdministratorDTO {
    @IsOptional()
    @IsEmail({}, { message: "Please provide a valid email address" })
    email?: string;

    @IsOptional()
    @IsString({ message: "Password must be a string" })
    @MinLength(8, { message: "Password must be at least 8 characters long" })
    password?: string;

    @IsOptional()
    @IsString({ message: "First name must be a string" })
    first_name?: string;

    @IsOptional()
    @IsString({ message: "Last name must be a string" })
    last_name?: string;
}

export class LoginAdministratorDTO {
    @IsEmail({}, { message: "Please provide a valid email address" })
    @IsNotEmpty({ message: "Email address is required" })
    email: string;

    @IsString({ message: "Password must be a string" })
    @IsNotEmpty({ message: "Password is required" })
    password: string;
}

export class AdministratorResponseDTO {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at: Date;
    updated_at: Date;
}