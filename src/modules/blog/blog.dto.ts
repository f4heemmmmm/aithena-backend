import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength, IsUrl, MinLength, Matches, IsArray, IsEnum, ArrayMinSize, ArrayMaxSize } from "class-validator";

export enum BlogCategory {
    NEWSROOM = "newsroom",
    THOUGHT_PIECES = "thought-pieces", 
    ACHIEVEMENTS = "achievements",
    AWARDS_RECOGNITION = "awards-recognition"
}

export class CreateBlogPostDTO {
    @ApiProperty({ description: "Title of blog post", maxLength: 200 })
    @IsString({ message: "Title must be a string" })
    @MaxLength(200, { message: "Title must less than 200 characters" })
    @MinLength(3, { message: "Title must be at least 3 character long" })
    @Transform(({ value }) => value?.trim())
    title: string;

    @ApiProperty({ description: "Content of blog post" })
    @IsString({ message: "Content must be a string" })
    @IsNotEmpty({ message: "Content is required" })
    @MinLength(10, { message: "Content must be at least 10 character long" })
    @Transform(({ value }) => value?.trim())
    content: string;

    @ApiPropertyOptional({ description: "Brief excerpt of blog post", maxLength: 500 })
    @IsOptional()
    @IsString({ message: "Excerpt must be a string" })
    @MaxLength(500, { message: "Excerpt must be less than 500 characters" })
    @Transform(({ value }) => value?.trim() || undefined)
    excerpt?: string;

    @ApiPropertyOptional({ description: "URL of featured image" })
    @IsString({ message: "Featured image must be a string" })
    @IsUrl({}, { message: "Featured image must be a valid URL" })
    @Matches(/\.(jpg|jpeg|png|gif|webp|svg)$/i, { message: 'Featured image must be a valid image URL' })
    @IsOptional()
    featured_image?: string;

    // New fields for uploaded image
    @ApiPropertyOptional({ description: "Base64 encoded uploaded image data" })
    @IsOptional()
    @IsString({ message: "Uploaded image must be a string" })
    uploaded_image?: string;

    @ApiPropertyOptional({ description: "Original filename of uploaded image" })
    @IsOptional()
    @IsString({ message: "Uploaded image filename must be a string" })
    @MaxLength(255, { message: "Filename must be less than 255 characters" })
    uploaded_image_filename?: string;

    @ApiPropertyOptional({ description: "Content type of uploaded image" })
    @IsOptional()
    @IsString({ message: "Content type must be a string" })
    @Matches(/^image\/(jpeg|jpg|png|gif|webp)$/i, { message: 'Content type must be a valid image MIME type' })
    uploaded_image_content_type?: string;

    @ApiPropertyOptional({ description: "Whether the post should be published immediately", default: false })
    @IsBoolean({ message: "Is published must be boolean" })
    @Type(() => Boolean)
    @IsOptional()
    is_published?: boolean;

    @ApiPropertyOptional({ description: "Whether the post should be featured", default: false })
    @IsBoolean({ message: "Is featured must be boolean" })
    @Type(() => Boolean)
    @IsOptional()
    is_featured?: boolean;

    @ApiPropertyOptional({ 
        description: "Categories where the blog post should appear",
        enum: BlogCategory,
        isArray: true,
        default: [BlogCategory.NEWSROOM]
    })
    @IsOptional()
    @IsArray({ message: "Categories must be an array" })
    @ArrayMinSize(1, { message: "At least one category must be selected" })
    @ArrayMaxSize(4, { message: "Maximum 4 categories allowed" })
    @IsEnum(BlogCategory, { each: true, message: "Each category must be a valid blog category" })
    categories?: BlogCategory[];
}

export class UpdateBlogPostDTO {
    @ApiPropertyOptional({ description: "Title of blog post", maxLength: 200 })
    @IsString({ message: "Title must be a string" })
    @MaxLength(200, { message: "Title must less than 200 characters" })
    @MinLength(3, { message: "Title must be at least 3 character long" })
    @Transform(({ value }) => value?.trim())
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({ description: "Content of blog post" })
    @IsString({ message: "Content must be a string" })
    @MinLength(10, { message: "Content must be at least 10 character long" })
    @Transform(({ value }) => value?.trim())
    @IsOptional()
    content?: string;

    @ApiPropertyOptional({ description: "Brief excerpt of blog post", maxLength: 500 })
    @IsOptional()
    @IsString({ message: "Excerpt must be a string" })
    @MaxLength(500, { message: "Excerpt must be less than 500 characters" })
    @Transform(({ value }) => value?.trim() || undefined)
    excerpt?: string;

    @ApiPropertyOptional({ description: "URL of featured image" })
    @IsString({ message: "Featured image must be a string" })
    @IsUrl({}, { message: "Featured image must be a valid URL" })
    @Matches(/\.(jpg|jpeg|png|gif|webp|svg)$/i, { message: 'Featured image must be a valid image URL' })
    @IsOptional()
    featured_image?: string;

    // New fields for uploaded image
    @ApiPropertyOptional({ description: "Base64 encoded uploaded image data" })
    @IsOptional()
    @IsString({ message: "Uploaded image must be a string" })
    uploaded_image?: string;

    @ApiPropertyOptional({ description: "Original filename of uploaded image" })
    @IsOptional()
    @IsString({ message: "Uploaded image filename must be a string" })
    @MaxLength(255, { message: "Filename must be less than 255 characters" })
    uploaded_image_filename?: string;

    @ApiPropertyOptional({ description: "Content type of uploaded image" })
    @IsOptional()
    @IsString({ message: "Content type must be a string" })
    @Matches(/^image\/(jpeg|jpg|png|gif|webp)$/i, { message: 'Content type must be a valid image MIME type' })
    uploaded_image_content_type?: string;

    @ApiPropertyOptional({ description: "Whether the post should be published immediately", default: false })
    @IsBoolean({ message: "Is published must be boolean" })
    @Type(() => Boolean)
    @IsOptional()
    is_published?: boolean;

    @ApiPropertyOptional({ description: "Whether the post should be featured", default: false })
    @IsBoolean({ message: "Is featured must be boolean" })
    @Type(() => Boolean)
    @IsOptional()
    is_featured?: boolean;

    @ApiPropertyOptional({ 
        description: "Categories where the blog post should appear",
        enum: BlogCategory,
        isArray: true
    })
    @IsOptional()
    @IsArray({ message: "Categories must be an array" })
    @ArrayMinSize(1, { message: "At least one category must be selected" })
    @ArrayMaxSize(4, { message: "Maximum 4 categories allowed" })
    @IsEnum(BlogCategory, { each: true, message: "Each category must be a valid blog category" })
    categories?: BlogCategory[];
}

export class BlogAuthorResponseDTO {
    @ApiProperty({ description: "Author ID" })
    id: string;

    @ApiProperty({ description: "Author first name" })
    first_name: string;

    @ApiProperty({ description: "Author last name" })
    last_name: string;

    @ApiProperty({ description: "Author email" })
    email: string;
}

export class BlogPostResponseDTO {
    @ApiProperty({ description: "Blog post ID" })
    id: string;

    @ApiProperty({ description: "Blog post title" })
    title: string;

    @ApiProperty({ description: "Blog post slug" })
    slug: string;

    @ApiProperty({ description: "Blog post content" })
    content: string;

    @ApiProperty({ description: "Blog post excerpt", nullable: true })
    excerpt?: string;

    @ApiProperty({ description: "Featured image URL", nullable: true })
    featured_image?: string;

    @ApiProperty({ description: "Uploaded image as base64", nullable: true })
    uploaded_image?: string;

    @ApiProperty({ description: "Uploaded image filename", nullable: true })
    uploaded_image_filename?: string;

    @ApiProperty({ description: "Uploaded image content type", nullable: true })
    uploaded_image_content_type?: string;

    @ApiProperty({ description: "Published status" })
    is_published: boolean;

    @ApiProperty({ description: "Featured status" })
    is_featured: boolean;

    @ApiProperty({ description: "View count", default: 0 })
    view_count: number;

    @ApiProperty({ 
        description: "Blog post categories", 
        enum: BlogCategory,
        isArray: true,
        default: [BlogCategory.NEWSROOM]
    })
    categories: BlogCategory[];

    @ApiProperty({ description: "Post author", type: BlogAuthorResponseDTO })
    author: BlogAuthorResponseDTO;

    @ApiProperty({ description: "Created date" })
    created_at: Date;

    @ApiProperty({ description: "Updated date" })
    updated_at: Date;

    @ApiProperty({ description: "Published date", nullable: true })
    published_at: Date;
}

export class BlogPostListResponseDTO {
    @ApiProperty({ description: "HTTP status code" })
    status_code: number;

    @ApiProperty({ description: "Response message" })
    message: string;

    @ApiProperty({ description: "Blog posts array", type: [BlogPostResponseDTO] })
    data: BlogPostResponseDTO[];

    @ApiProperty({ description: "Total count", required: false })
    count?: number;
}

export class BlogPostSingleResponseDTO {
    @ApiProperty({ description: "HTTP status code" })
    status_code: number;

    @ApiProperty({ description: "Response message" })
    message: string;

    @ApiProperty({ description: "Blog post data", type: BlogPostResponseDTO })
    data: BlogPostResponseDTO;
}