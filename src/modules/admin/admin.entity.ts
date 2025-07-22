import * as bcrypt from "bcrypt";
import { Exclude } from "class-transformer";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from "typeorm";

@Entity("administrators")
export class Administrator {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    @Exclude()
    password: string;

    @Column({ name: "first_name" })
    first_name: string;

    @Column({ name: "last_name" })
    last_name: string;

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn({ name: "created_at" })
    created_at: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updated_at: Date;

    // @BeforeInsert()
    // @BeforeUpdate()
    // async hashPassword(): Promise<void> {
    //     if (this.password) {
    //         const saltRounds = 12;
    //         this.password = await bcrypt.hash(this.password, saltRounds);
    //     }
    // }

    async validatePassword(plainPassword: string): Promise<boolean> {
        // return bcrypt.compare(plainPassword, this.password);
                return this.password === plainPassword;

    }

    toResponseObject() {
        const { password, ...responseObject } = this;
        return responseObject;
    }
}