import { Repository, MoreThan, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, InternalServerErrorException } from '@nestjs/common';

import { BlogPost, BlogCategory } from './blog.entity';
import { CreateBlogPostDTO, UpdateBlogPostDTO, BlogPostResponseDTO } from './blog.dto';

export interface BlogPostQuery {
    page?: number;
    limit?: number;
    search?: string;
    is_published?: boolean;
    is_featured?: boolean;
    author_id?: string;
    categories?: BlogCategory[];
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface BlogStatistics {
    total: number;
    published: number;
    drafts: number;
    featured: number;
    recently_published: number;
    total_views: number;
    by_category: Record<BlogCategory, number>;
}

@Injectable()
export class BlogPostService {
    private readonly logger = new Logger(BlogPostService.name);

    constructor(
        @InjectRepository(BlogPost)
        private readonly blogPostRepository: Repository<BlogPost>,
    ) {}

    private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
        try {
            let baseSlug = BlogPost.generateSlug(title);
            let slug = baseSlug;
            let counter = 1;

            while (await this.isSlugTaken(slug, excludeId)) {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            return slug;
        } catch (error) {
            this.logger.error(`Error generating unique slug: ${error.message}`, error.stack);
            throw new BadRequestException('Failed to generate unique slug');
        }
    }

    private async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
        try {
            const queryBuilder = this.blogPostRepository
                .createQueryBuilder('post')
                .where('post.slug = :slug', { slug });

            if (excludeId) {
                queryBuilder.andWhere('post.id != :excludeId', { excludeId });
            }

            const existingPost = await queryBuilder.getOne();
            return !!existingPost;
        } catch (error) {
            this.logger.error(`Error checking slug availability: ${error.message}`, error.stack);
            return false;
        }
    }

    private validateAuthor(author_id: string): void {
        if (!author_id) {
            throw new BadRequestException('Author ID is required');
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(author_id)) {
            throw new BadRequestException('Invalid author ID format');
        }
    }

    private validateCategories(categories: BlogCategory[]): BlogCategory[] {
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return [BlogCategory.NEWSROOM];
        }

        const validCategories = Object.values(BlogCategory);
        const uniqueCategories = [...new Set(categories)].filter(category => 
            validCategories.includes(category)
        );

        return uniqueCategories.length > 0 ? uniqueCategories : [BlogCategory.NEWSROOM];
    }

    async create(createBlogPostDTO: CreateBlogPostDTO, author_id: string): Promise<BlogPostResponseDTO> {
        try {
            this.validateAuthor(author_id);

            const { 
                title, 
                content, 
                excerpt, 
                featured_image, 
                uploaded_image,
                uploaded_image_filename,
                uploaded_image_content_type,
                is_published, 
                is_featured,
                categories 
            } = createBlogPostDTO;

            const slug = await this.generateUniqueSlug(title);
            const validatedCategories = this.validateCategories(categories || [BlogCategory.NEWSROOM]);

            this.logger.log(`🚀 Creating blog post with categories: ${validatedCategories.join(', ')}`);

            const blogPost = this.blogPostRepository.create({
                title: title.trim(),
                slug,
                content: content.trim(),
                excerpt: excerpt?.trim() || null,
                featured_image: featured_image || null,
                uploaded_image: uploaded_image || null,
                uploaded_image_filename: uploaded_image_filename || null,
                uploaded_image_content_type: uploaded_image_content_type || null,
                is_published: is_published || false,
                is_featured: is_featured || false,
                view_count: 0,
                categories: validatedCategories,
                author_id: author_id,
                published_at: is_published ? new Date() : null,
            });

            const savedPost = await this.blogPostRepository.save(blogPost);
            this.logger.log(`✅ Blog post created with ID: ${savedPost.id}, categories: ${savedPost.categories.join(', ')}`);

            return await this.findOne(savedPost.id);
        } catch (error) {
            this.logger.error(`❌ Error creating blog post: ${error.message}`, error.stack);

            if (error instanceof BadRequestException || error instanceof ConflictException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to create blog post');
        }
    }

    async findAll(query: BlogPostQuery = {}): Promise<PaginatedResult<BlogPostResponseDTO>> {
        try {
            const { page = 1, limit = 10, search, is_published, is_featured, categories, author_id } = query;
            const skip = (page - 1) * limit;

            const queryBuilder = this.blogPostRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .orderBy('post.created_at', 'DESC');

            // Apply search filter
            if (search && search.trim()) {
                queryBuilder.andWhere(
                    '(post.title ILIKE :search OR post.content ILIKE :search OR post.excerpt ILIKE :search)',
                    { search: `%${search.trim()}%` }
                );
            }

            // Apply status filters
            if (is_published !== undefined) {
                queryBuilder.andWhere('post.is_published = :is_published', { is_published });
            }

            if (is_featured !== undefined) {
                queryBuilder.andWhere('post.is_featured = :is_featured', { is_featured });
            }

            if (author_id) {
                this.validateAuthor(author_id);
                queryBuilder.andWhere('post.author_id = :author_id', { author_id });
            }

            // Apply category filter using LIKE with JSON text
            if (categories && categories.length > 0) {
                const validCategories = this.validateCategories(categories);
                this.logger.log(`🔍 Filtering by categories: ${validCategories.join(', ')}`);
                
                // Build OR conditions for each category using LIKE
                const categoryConditions = validCategories.map((cat, index) => 
                    `post.categories::text LIKE :categoryPattern${index}`
                ).join(' OR ');
                
                const categoryParams = validCategories.reduce((params, category, index) => {
                    params[`categoryPattern${index}`] = `%"${category}"%`;
                    return params;
                }, {} as Record<string, string>);

                queryBuilder.andWhere(`(${categoryConditions})`, categoryParams);
            }

            const total = await queryBuilder.getCount();
            const posts = await queryBuilder.skip(skip).take(limit).getMany();

            const data = posts.map(post => post.toResponseObject() as BlogPostResponseDTO);

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            this.logger.error(`Error finding blog posts: ${error.message}`, error.stack);

            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to retrieve blog posts');
        }
    }

    async findByCategory(category: BlogCategory, published: boolean = true): Promise<BlogPostResponseDTO[]> {
        try {
            if (!Object.values(BlogCategory).includes(category)) {
                throw new BadRequestException('Invalid category');
            }

            this.logger.log(`🔍 Finding posts by category: ${category}, published: ${published}`);

            const queryBuilder = this.blogPostRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .orderBy('post.published_at', 'DESC');

            if (published) {
                queryBuilder.andWhere('post.is_published = :is_published', { is_published: true });
            }

            // WORKING SOLUTION: Use LIKE with JSON text representation
            // This works reliably across all PostgreSQL versions
            queryBuilder.andWhere(
                'post.categories::text LIKE :categoryPattern',
                { categoryPattern: `%"${category}"%` }
            );

            const posts = await queryBuilder.getMany();
            
            this.logger.log(`📊 Database query returned ${posts.length} posts for category ${category}`);

            // Additional application-level filtering for extra safety
            const filteredPosts = posts.filter(post => {
                if (!post.categories) {
                    this.logger.warn(`⚠️ Post ${post.id} has no categories`);
                    return false;
                }

                // Categories should be an array from PostgreSQL JSON column
                const postCategories = Array.isArray(post.categories) 
                    ? post.categories 
                    : [post.categories].filter(Boolean);

                const hasCategory = postCategories.includes(category);
                
                this.logger.debug(`📝 Post ${post.id} "${post.title}": categories=[${postCategories.join(', ')}], has ${category}: ${hasCategory}`);
                
                return hasCategory;
            });

            this.logger.log(`✅ Final result: ${filteredPosts.length} posts for category ${category}`);
            
            return filteredPosts.map(post => post.toResponseObject() as BlogPostResponseDTO);
        } catch (error) {
            this.logger.error(`❌ Error finding posts by category: ${error.message}`, error.stack);

            if (error instanceof BadRequestException) {
                throw error;
            }

            // Return empty array instead of throwing to prevent breaking the UI
            this.logger.warn(`Returning empty array for category ${category} due to error`);
            return [];
        }
    }

    async findPublished(): Promise<BlogPostResponseDTO[]> {
        try {
            const posts = await this.blogPostRepository.find({
                where: { is_published: true },
                relations: ['author'],
                order: { published_at: 'DESC' },
            });

            return posts.map(post => post.toResponseObject() as BlogPostResponseDTO);
        } catch (error) {
            this.logger.error(`Error finding published posts: ${error.message}`, error.stack);
            return [];
        }
    }

    async findFeatured(limit: number = 3): Promise<BlogPostResponseDTO[]> {
        try {
            const posts = await this.blogPostRepository.find({
                where: {
                    is_published: true,
                    is_featured: true
                },
                relations: ['author'],
                order: { published_at: 'DESC' },
                take: Math.max(1, Math.min(limit, 50)), // Constrain between 1 and 50
            });

            return posts.map(post => post.toResponseObject() as BlogPostResponseDTO);
        } catch (error) {
            this.logger.error(`Error finding featured posts: ${error.message}`, error.stack);
            return [];
        }
    }

    async findRecent(limit: number = 5): Promise<BlogPostResponseDTO[]> {
        try {
            const posts = await this.blogPostRepository.find({
                where: { is_published: true },
                relations: ['author'],
                order: { published_at: 'DESC' },
                take: Math.max(1, Math.min(limit, 50)), // Constrain between 1 and 50
            });

            return posts.map(post => post.toResponseObject() as BlogPostResponseDTO);
        } catch (error) {
            this.logger.error(`Error finding recent posts: ${error.message}`, error.stack);
            return [];
        }
    }

    async findOne(id: string): Promise<BlogPostResponseDTO> {
        try {
            this.validateAuthor(id);

            const post = await this.blogPostRepository.findOne({
                where: { id },
                relations: ['author'],
            });

            if (!post) {
                throw new NotFoundException(`Blog post with ID ${id} not found`);
            }

            return post.toResponseObject() as BlogPostResponseDTO;
        } catch (error) {
            this.logger.error(`Error finding blog post: ${error.message}`, error.stack);

            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to retrieve blog post');
        }
    }

    async findBySlug(slug: string): Promise<BlogPostResponseDTO> {
        try {
            if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
                throw new BadRequestException('Valid slug is required');
            }

            const post = await this.blogPostRepository.findOne({
                where: { slug: slug.trim(), is_published: true },
                relations: ['author'],
            });

            if (!post) {
                throw new NotFoundException(`Published blog post with slug "${slug}" not found`);
            }

            return post.toResponseObject() as BlogPostResponseDTO;
        } catch (error) {
            this.logger.error(`Error finding blog post by slug: ${error.message}`, error.stack);

            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to retrieve blog post');
        }
    }

    async incrementViewBySlug(slug: string): Promise<number> {
        try {
            if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
                throw new BadRequestException('Valid slug is required');
            }

            const post = await this.blogPostRepository.findOne({
                where: { slug: slug.trim(), is_published: true },
            });

            if (!post) {
                throw new NotFoundException(`Published blog post with slug "${slug}" not found`);
            }

            // Increment view count
            await this.blogPostRepository.increment({ id: post.id }, 'view_count', 1);

            // Return the new view count
            const updatedPost = await this.blogPostRepository.findOne({
                where: { id: post.id },
                select: ['view_count']
            });

            this.logger.log(`View count incremented for post ${post.id}, new count: ${updatedPost?.view_count || post.view_count + 1}`);

            return updatedPost?.view_count || post.view_count + 1;
        } catch (error) {
            this.logger.error(`Error incrementing view count: ${error.message}`, error.stack);

            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to increment view count');
        }
    }

    async update(id: string, updateBlogPostDTO: UpdateBlogPostDTO): Promise<BlogPostResponseDTO> {
        try {
            this.validateAuthor(id);

            const post = await this.blogPostRepository.findOne({
                where: { id },
            });

            if (!post) {
                throw new NotFoundException(`Blog post with ID ${id} not found`);
            }

            // Update slug if title changed
            if (updateBlogPostDTO.title && updateBlogPostDTO.title !== post.title) {
                const newSlug = await this.generateUniqueSlug(updateBlogPostDTO.title, id);
                (updateBlogPostDTO as any).slug = newSlug;
            }

            // Validate and update categories
            if (updateBlogPostDTO.categories) {
                const validatedCategories = this.validateCategories(updateBlogPostDTO.categories);
                updateBlogPostDTO.categories = validatedCategories;
                this.logger.log(`📝 Updating categories for post ${id}: ${validatedCategories.join(', ')}`);
            }

            // Handle publishing status changes
            if (updateBlogPostDTO.is_published !== undefined) {
                if (updateBlogPostDTO.is_published && !post.is_published) {
                    // Publishing for the first time
                    (updateBlogPostDTO as any).published_at = new Date();
                } else if (!updateBlogPostDTO.is_published && post.is_published) {
                    // Unpublishing - remove publish date and featured status
                    (updateBlogPostDTO as any).published_at = null;
                    (updateBlogPostDTO as any).is_featured = false;
                }
            }

            // Validate featured status - can't feature unpublished posts
            if (updateBlogPostDTO.is_featured &&
                (updateBlogPostDTO.is_published === false ||
                    (!updateBlogPostDTO.is_published && !post.is_published))) {
                throw new BadRequestException('Cannot feature an unpublished post');
            }

            Object.assign(post, updateBlogPostDTO);

            const updatedPost = await this.blogPostRepository.save(post);
            this.logger.log(`✅ Blog post updated with ID: ${updatedPost.id}, categories: ${updatedPost.categories?.join(', ') || 'none'}`);

            return await this.findOne(updatedPost.id);
        } catch (error) {
            this.logger.error(`Error updating blog post: ${error.message}`, error.stack);

            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to update blog post');
        }
    }

    async remove(id: string): Promise<{ message: string }> {
        try {
            this.validateAuthor(id);

            const post = await this.blogPostRepository.findOne({
                where: { id },
            });

            if (!post) {
                throw new NotFoundException(`Blog post with ID ${id} not found`);
            }

            await this.blogPostRepository.remove(post);
            this.logger.log(`Blog post deleted with ID: ${id}`);

            return { message: 'Blog post deleted successfully' };
        } catch (error) {
            this.logger.error(`Error deleting blog post: ${error.message}`, error.stack);

            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to delete blog post');
        }
    }

    async count(): Promise<number> {
        try {
            return await this.blogPostRepository.count();
        } catch (error) {
            this.logger.error(`Error counting blog posts: ${error.message}`, error.stack);
            return 0;
        }
    }

    async countPublished(): Promise<number> {
        try {
            return await this.blogPostRepository.count({
                where: { is_published: true },
            });
        } catch (error) {
            this.logger.error(`Error counting published posts: ${error.message}`, error.stack);
            return 0;
        }
    }

    async countFeatured(): Promise<number> {
        try {
            return await this.blogPostRepository.count({
                where: {
                    is_published: true,
                    is_featured: true
                },
            });
        } catch (error) {
            this.logger.error(`Error counting featured posts: ${error.message}`, error.stack);
            return 0;
        }
    }

    async countDrafts(): Promise<number> {
        try {
            return await this.blogPostRepository.count({
                where: { is_published: false },
            });
        } catch (error) {
            this.logger.error(`Error counting draft posts: ${error.message}`, error.stack);
            return 0;
        }
    }

    async countby_category(category: BlogCategory): Promise<number> {
        try {
            const count = await this.blogPostRepository
                .createQueryBuilder('post')
                .where('post.is_published = :is_published', { is_published: true })
                .andWhere('post.categories::text LIKE :categoryPattern', { 
                    categoryPattern: `%"${category}"%` 
                })
                .getCount();

            this.logger.log(`📊 Count for category ${category}: ${count}`);
            return count;
        } catch (error) {
            this.logger.error(`Error counting posts by category: ${error.message}`, error.stack);
            return 0;
        }
    }

    async gettotal_views(): Promise<number> {
        try {
            const result = await this.blogPostRepository
                .createQueryBuilder('post')
                .select('SUM(post.view_count)', 'total')
                .where('post.is_published = :is_published', { is_published: true })
                .getRawOne();

            return parseInt(result?.total || '0', 10);
        } catch (error) {
            this.logger.error(`Error counting total views: ${error.message}`, error.stack);
            return 0;
        }
    }

    async findByAuthor(author_id: string, includeUnpublished: boolean = false): Promise<BlogPostResponseDTO[]> {
        try {
            this.validateAuthor(author_id);

            const whereCondition: any = { author_id: author_id };

            if (!includeUnpublished) {
                whereCondition.is_published = true;
            }

            const posts = await this.blogPostRepository.find({
                where: whereCondition,
                relations: ['author'],
                order: { created_at: 'DESC' },
            });

            return posts.map(post => post.toResponseObject() as BlogPostResponseDTO);
        } catch (error) {
            this.logger.error(`Error finding posts by author: ${error.message}`, error.stack);

            if (error instanceof BadRequestException) {
                throw error;
            }

            return [];
        }
    }

    async searchPosts(searchTerm: string, onlyPublished: boolean = true): Promise<BlogPostResponseDTO[]> {
        try {
            if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length < 2) {
                return [];
            }

            const cleanSearchTerm = searchTerm.trim();

            const queryBuilder = this.blogPostRepository
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.author', 'author')
                .where('(post.title ILIKE :search OR post.content ILIKE :search OR post.excerpt ILIKE :search)',
                    { search: `%${cleanSearchTerm}%` })
                .orderBy('post.published_at', 'DESC');

            if (onlyPublished) {
                queryBuilder.andWhere('post.is_published = :is_published', { is_published: true });
            }

            const posts = await queryBuilder.take(50).getMany(); // Limit search results
            return posts.map(post => post.toResponseObject() as BlogPostResponseDTO);
        } catch (error) {
            this.logger.error(`Error searching posts: ${error.message}`, error.stack);
            return [];
        }
    }

    async getStatistics(): Promise<BlogStatistics> {
        try {
            const [total, published, drafts, featured, total_views] = await Promise.all([
                this.count(),
                this.countPublished(),
                this.countDrafts(),
                this.countFeatured(),
                this.gettotal_views(),
            ]);

            // Count posts published in the last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recently_published = await this.blogPostRepository.count({
                where: {
                    is_published: true,
                    published_at: MoreThan(sevenDaysAgo),
                },
            });

            // Count by category
            const by_category: Record<BlogCategory, number> = {} as Record<BlogCategory, number>;
            for (const category of Object.values(BlogCategory)) {
                by_category[category] = await this.countby_category(category);
            }

            return {
                total,
                published,
                drafts,
                featured,
                recently_published,
                total_views,
                by_category,
            };
        } catch (error) {
            this.logger.error(`Error getting statistics: ${error.message}`, error.stack);
            return {
                total: 0,
                published: 0,
                drafts: 0,
                featured: 0,
                recently_published: 0,
                total_views: 0,
                by_category: {
                    [BlogCategory.NEWSROOM]: 0,
                    [BlogCategory.THOUGHT_PIECES]: 0,
                    [BlogCategory.ACHIEVEMENTS]: 0,
                    [BlogCategory.AWARDS_RECOGNITION]: 0,
                },
            };
        }
    }

    // Enhanced method to get category counts for debugging
    async getCategoryDebugInfo(): Promise<Record<string, any>> {
        try {
            const debugInfo: Record<string, any> = {};
            
            // Get all posts with their categories
            const allPosts = await this.blogPostRepository.find({
                select: ['id', 'title', 'categories', 'is_published']
            });

            debugInfo.totalPosts = allPosts.length;
            debugInfo.publishedPosts = allPosts.filter(p => p.is_published).length;
            
            const categoryDistribution: Record<string, number> = {};

            allPosts.forEach(post => {
                if (Array.isArray(post.categories)) {
                    post.categories.forEach(cat => {
                        categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
                    });
                } else {
                    debugInfo.invalidCategoryFormat = (debugInfo.invalidCategoryFormat || 0) + 1;
                }
            });

            debugInfo.categoryDistribution = categoryDistribution;

            // Test each category
            for (const category of Object.values(BlogCategory)) {
                const posts = await this.findByCategory(category, true);
                debugInfo[`category_${category}`] = posts.length;
            }

            return debugInfo;
        } catch (error) {
            this.logger.error('Error getting category debug info:', error);
            return { error: error.message };
        }
    }
}