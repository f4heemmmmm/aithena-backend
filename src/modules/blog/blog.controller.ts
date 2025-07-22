import { JWTAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus, HttpCode, ValidationPipe, ParseUUIDPipe, UsePipes, UseInterceptors, ClassSerializerInterceptor, UseGuards, Request, Query, Logger, BadRequestException } from "@nestjs/common";

import { BlogPostService, BlogPostQuery } from "./blog.service";
import { CreateBlogPostDTO, UpdateBlogPostDTO, BlogPostListResponseDTO, BlogPostSingleResponseDTO, BlogCategory } from "./blog.dto";

interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        sub: string;
        email: string;
        first_name: string;
        last_name: string;
        iat: number;
        exp: number;
    };
}

@ApiTags("Blog Posts")
@Controller("blog")
@UseInterceptors(ClassSerializerInterceptor)
export class BlogPostController {
    private readonly logger = new Logger(BlogPostController.name);

    constructor(
        private readonly blogPostService: BlogPostService
    ) {
        this.logger.log("BlogPostController initialized");
    }

    @Post()
    @UseGuards(JWTAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true
    }))
    @ApiOperation({ summary: "Create a new blog post" })
    @ApiBody({ type: CreateBlogPostDTO })
    @ApiResponse({
        status: 201,
        description: "Blog post created successfully",
        type: BlogPostSingleResponseDTO
    })
    @ApiResponse({ status: 400, description: "Bad request" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async create(
        @Body() createBlogPostDTO: CreateBlogPostDTO,
        @Request() req: AuthenticatedRequest
    ): Promise<BlogPostSingleResponseDTO> {
        try {
            const authorId = req.user?.id || req.user?.sub;

            if (!authorId) {
                this.logger.error("No author ID found in JWT token", { user: req.user });
                throw new BadRequestException("Author ID is required - authentication issue");
            }

            this.logger.log(`Creating blog post for author: ${authorId}`, {
                title: createBlogPostDTO.title,
                isPublished: createBlogPostDTO.is_published,
                categories: createBlogPostDTO.categories,
                categoriesType: typeof createBlogPostDTO.categories,
                categoriesLength: createBlogPostDTO.categories?.length,
                categoriesArray: Array.isArray(createBlogPostDTO.categories)
            });

            if (createBlogPostDTO.categories && !Array.isArray(createBlogPostDTO.categories)) {
                this.logger.warn("Categories is not an array, converting:", createBlogPostDTO.categories);
                createBlogPostDTO.categories = [createBlogPostDTO.categories].filter(Boolean);
            }

            const post = await this.blogPostService.create(createBlogPostDTO, authorId);

            this.logger.log(`Blog post created successfully with ID: ${post.id}`, {
                finalCategories: post.categories,
                categoriesCount: post.categories?.length
            });

            return {
                status_code: HttpStatus.CREATED,
                message: "Blog post created successfully",
                data: post,
            };
        } catch (error) {
            this.logger.error(`Error creating blog post: ${error.message}`, {
                error: error.stack,
                body: createBlogPostDTO,
                user: req.user,
                categories: createBlogPostDTO.categories
            });
            throw error;
        }
    }

    @Get()
    @UseGuards(JWTAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get all blog posts (Admin only)" })
    @ApiQuery({ name: "page", required: false, type: Number, description: "Page number" })
    @ApiQuery({ name: "limit", required: false, type: Number, description: "Items per page" })
    @ApiQuery({ name: "search", required: false, type: String, description: "Search term" })
    @ApiQuery({ name: "isPublished", required: false, type: Boolean, description: "Filter by published status" })
    @ApiQuery({ name: "isFeatured", required: false, type: Boolean, description: "Filter by featured status" })
    @ApiQuery({ name: "categories", required: false, isArray: true, enum: BlogCategory, description: "Filter by categories" })
    @ApiResponse({
        status: 200,
        description: "Blog posts retrieved successfully",
        type: BlogPostListResponseDTO
    })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async findAll(
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @Query("search") search?: string,
        @Query("is_published") is_published?: boolean,
        @Query("is_featured") is_featured?: boolean,
        @Query("categories") categories?: BlogCategory[],
    ): Promise<BlogPostListResponseDTO> {
        try {
            const query: BlogPostQuery = {
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 10,
                search,
                is_published,
                is_featured,
                categories,
            };

            this.logger.log("Fetching all blog posts", { query });

            const result = await this.blogPostService.findAll(query);

            return {
                status_code: HttpStatus.OK,
                message: "Blog posts retrieved successfully",
                data: result.data,
                count: result.total,
            };
        } catch (error) {
            this.logger.error(`Error retrieving blog posts: ${error.message}`, error.stack);
            throw error;
        }
    }

    // PUBLIC ENDPOINTS (No auth required)
    @Get("published")
    @ApiOperation({ summary: "Get all published blog posts (Public)" })
    @ApiResponse({
        status: 200,
        description: "Published blog posts retrieved successfully",
        type: BlogPostListResponseDTO
    })
    async findPublished(): Promise<BlogPostListResponseDTO> {
        try {
            this.logger.log("Fetching published blog posts");

            const posts = await this.blogPostService.findPublished();
            const count = await this.blogPostService.countPublished();

            return {
                status_code: HttpStatus.OK,
                message: "Published blog posts retrieved successfully",
                data: posts,
                count,
            };
        } catch (error) {
            this.logger.error(`Error retrieving published posts: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get("featured")
    @ApiOperation({ summary: "Get featured blog posts (Public)" })
    @ApiQuery({ name: "limit", required: false, type: Number, description: "Number of posts to return" })
    @ApiResponse({
        status: 200,
        description: "Featured blog posts retrieved successfully",
        type: BlogPostListResponseDTO
    })
    async findFeatured(
        @Query("limit") limit?: number
    ): Promise<BlogPostListResponseDTO> {
        try {
            const posts = await this.blogPostService.findFeatured(limit ? Number(limit) : 3);

            return {
                status_code: HttpStatus.OK,
                message: "Featured blog posts retrieved successfully",
                data: posts,
            };
        } catch (error) {
            this.logger.error(`Error retrieving featured posts: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get("recent")
    @ApiOperation({ summary: "Get recent blog posts (Public)" })
    @ApiQuery({ name: "limit", required: false, type: Number, description: "Number of posts to return" })
    @ApiResponse({
        status: 200,
        description: "Recent blog posts retrieved successfully",
        type: BlogPostListResponseDTO
    })
    async findRecent(
        @Query("limit") limit?: number
    ): Promise<BlogPostListResponseDTO> {
        try {
            this.logger.log("Fetching recent blog posts");
            const posts = await this.blogPostService.findRecent(limit ? Number(limit) : 5);

            return {
                status_code: HttpStatus.OK,
                message: "Recent blog posts retrieved successfully",
                data: posts,
            };
        } catch (error) {
            this.logger.error(`Error retrieving recent posts: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get("category/:category")
    @ApiOperation({ summary: "Get blog posts by category (Public)" })
    @ApiParam({ name: "category", enum: BlogCategory, description: "Blog post category" })
    @ApiResponse({
        status: 200,
        description: "Blog posts retrieved successfully",
        type: BlogPostListResponseDTO
    })
    @ApiResponse({ status: 400, description: "Invalid category" })
    async findByCategory(
        @Param("category") category: BlogCategory
    ): Promise<BlogPostListResponseDTO> {
        try {
            this.logger.log(`Fetching blog posts for category: ${category}`);

            const posts = await this.blogPostService.findByCategory(category, true);

            return {
                status_code: HttpStatus.OK,
                message: `Blog posts for ${category} retrieved successfully`,
                data: posts,
                count: posts.length,
            };
        } catch (error) {
            this.logger.error(`Error retrieving posts by category: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get("search")
    @ApiOperation({ summary: "Search blog posts (Public)" })
    @ApiQuery({ name: "q", required: true, type: String, description: "Search query" })
    @ApiQuery({ name: "published", required: false, type: Boolean, description: "Only search published posts" })
    @ApiResponse({
        status: 200,
        description: "Search results retrieved successfully",
        type: BlogPostListResponseDTO
    })
    async searchPosts(
        @Query("q") searchTerm: string,
        @Query("published") onlyPublished?: boolean
    ): Promise<BlogPostListResponseDTO> {
        try {
            if (!searchTerm || searchTerm.trim().length < 2) {
                return {
                    status_code: HttpStatus.OK,
                    message: "Search term too short",
                    data: [],
                    count: 0,
                };
            }

            const posts = await this.blogPostService.searchPosts(
                searchTerm.trim(),
                onlyPublished !== false
            );

            return {
                status_code: HttpStatus.OK,
                message: "Search results retrieved successfully",
                data: posts,
                count: posts.length,
            };
        } catch (error) {
            this.logger.error(`Error searching posts: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get("statistics")
    @UseGuards(JWTAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get blog statistics (Admin only)" })
    @ApiResponse({ status: 200, description: "Statistics retrieved successfully" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async getStatistics() {
        try {
            this.logger.log("Fetching blog statistics");

            const stats = await this.blogPostService.getStatistics();

            return {
                status_code: HttpStatus.OK,
                message: "Statistics retrieved successfully",
                data: stats,
            };
        } catch (error) {
            this.logger.error(`Error retrieving statistics: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get("slug/:slug")
    @ApiOperation({ summary: "Get blog post by slug (Public)" })
    @ApiParam({ name: "slug", type: String, description: "Blog post slug" })
    @ApiResponse({
        status: 200,
        description: "Blog post retrieved successfully",
        type: BlogPostSingleResponseDTO
    })
    @ApiResponse({ status: 404, description: "Blog post not found" })
    async findBySlug(
        @Param("slug") slug: string
    ): Promise<BlogPostSingleResponseDTO> {
        try {
            const post = await this.blogPostService.findBySlug(slug);

            return {
                status_code: HttpStatus.OK,
                message: "Blog post retrieved successfully",
                data: post,
            };
        } catch (error) {
            this.logger.error(`Error retrieving post by slug: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Post("slug/:slug/view")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Increment view count for blog post by slug (Public)" })
    @ApiParam({ name: "slug", type: String, description: "Blog post slug" })
    @ApiResponse({
        status: 200,
        description: "View count incremented successfully"
    })
    @ApiResponse({ status: 404, description: "Blog post not found" })
    async incrementViewBySlug(
        @Param("slug") slug: string
    ): Promise<{ status_code: number; message: string; view_count: number }> {
        try {
            const viewCount = await this.blogPostService.incrementViewBySlug(slug);

            return {
                status_code: HttpStatus.OK,
                message: "View count incremented successfully",
                view_count: viewCount,
            };
        } catch (error) {
            this.logger.error(`Error incrementing view count: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Get(":id")
    @ApiOperation({ summary: "Get blog post by ID" })
    @ApiParam({ name: "id", type: String, description: "Blog post UUID" })
    @ApiResponse({
        status: 200,
        description: "Blog post retrieved successfully",
        type: BlogPostSingleResponseDTO
    })
    @ApiResponse({ status: 404, description: "Blog post not found" })
    async findOne(
        @Param("id", ParseUUIDPipe) id: string
    ): Promise<BlogPostSingleResponseDTO> {
        try {
            const post = await this.blogPostService.findOne(id);

            return {
                status_code: HttpStatus.OK,
                message: "Blog post retrieved successfully",
                data: post,
            };
        } catch (error) {
            this.logger.error(`Error retrieving post by ID: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Patch(":id")
    @UseGuards(JWTAuthGuard)
    @ApiBearerAuth()
    @UsePipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true
    }))
    @ApiOperation({ summary: "Update blog post" })
    @ApiParam({ name: "id", type: String, description: "Blog post UUID" })
    @ApiBody({ type: UpdateBlogPostDTO })
    @ApiResponse({
        status: 200,
        description: "Blog post updated successfully",
        type: BlogPostSingleResponseDTO
    })
    @ApiResponse({ status: 400, description: "Bad request" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 404, description: "Blog post not found" })
    async update(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() updateBlogPostDTO: UpdateBlogPostDTO,
        @Request() req: AuthenticatedRequest
    ): Promise<BlogPostSingleResponseDTO> {
        try {
            this.logger.log(`Updating blog post ${id}`, {
                updates: updateBlogPostDTO,
                userId: req.user?.id || req.user?.sub
            });

            const post = await this.blogPostService.update(id, updateBlogPostDTO);

            this.logger.log(`Blog post updated successfully with ID: ${id}`);

            return {
                status_code: HttpStatus.OK,
                message: "Blog post updated successfully",
                data: post,
            };
        } catch (error) {
            this.logger.error(`Error updating post: ${error.message}`, error.stack);
            throw error;
        }
    }

    @Delete(":id")
    @UseGuards(JWTAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Delete blog post" })
    @ApiParam({ name: "id", type: String, description: "Blog post UUID" })
    @ApiResponse({ status: 200, description: "Blog post deleted successfully" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 404, description: "Blog post not found" })
    async remove(
        @Param("id", ParseUUIDPipe) id: string,
        @Request() req: AuthenticatedRequest
    ): Promise<{ status_code: number; message: string }> {
        try {
            this.logger.log(`Deleting blog post ${id}`, {
                userId: req.user?.id || req.user?.sub
            });

            const result = await this.blogPostService.remove(id);

            this.logger.log(`Blog post deleted successfully with ID: ${id}`);

            return {
                status_code: HttpStatus.OK,
                message: result.message,
            };
        } catch (error) {
            this.logger.error(`Error deleting post: ${error.message}`, error.stack);
            throw error;
        }
    }
}