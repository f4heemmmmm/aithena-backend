import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateContactDTO {
    @IsNotEmpty()
    @IsString()
    first_name: string;

    @IsNotEmpty()
    @IsString()
    last_name: string;

    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(10, { message: "Message must be at least 10 characters long" })
    message: string;
}