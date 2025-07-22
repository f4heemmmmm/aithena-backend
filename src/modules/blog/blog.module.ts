import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { BlogPost } from "./blog.entity";
import { BlogPostService } from "./blog.service";
import { BlogPostController } from "./blog.controller";

@Module({
    imports: [
        TypeOrmModule.forFeature([BlogPost])
    ],
    controllers: [BlogPostController],
    providers: [BlogPostService],
    exports: [BlogPostService, TypeOrmModule]
})

export class BlogPostModule {}