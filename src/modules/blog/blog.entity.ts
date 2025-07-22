import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from "typeorm";

import { Administrator } from "../admin/admin.entity";

export enum BlogCategory {
    NEWSROOM = "newsroom",
    THOUGHT_PIECES = "thought-pieces", 
    ACHIEVEMENTS = "achievements",
    AWARDS_RECOGNITION = "awards-recognition"
}

@Entity('blog_posts')
export class BlogPost {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "varchar", length: 200 })
    title: string;

    @Column({ unique: true, type: "varchar", length: 255 })
    slug: string;

    @Column("text")
    content: string;

    @Column({ nullable: true, type: "varchar", length: 500 })
    excerpt: string | null;

    @Column({ nullable: true, type: "varchar", length: 2048 })
    featured_image: string | null;

    @Column({ nullable: true, type: "text" })
    uploaded_image: string | null;

    @Column({ nullable: true, type: "varchar", length: 255 })
    uploaded_image_filename: string | null;

    @Column({ nullable: true, type: "varchar", length: 100 })
    uploaded_image_content_type: string | null;

    @Column({ default: false, type: "boolean" })
    is_published: boolean;

    @Column({ default: false, type: "boolean" })
    is_featured: boolean;

    @Column({ default: 0, type: "integer" })
    view_count: number;

    // JSON column for categories - works with PostgreSQL JSON arrays
    @Column({ 
        type: "json",
        nullable: false,
        default: '["newsroom"]'
    })
    categories: BlogCategory[];

    @Column({ type: "uuid" })
    author_id: string;

    @ManyToOne(() => Administrator, { eager: false })
    @JoinColumn({ name: "author_id" })
    author: Administrator;

    @CreateDateColumn({ name: "created_at", type: "timestamp" })
    created_at: Date;

    @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
    updated_at: Date;

    @Column({ name: "published_at", nullable: true, type: "timestamp" })
    published_at: Date | null;

    @BeforeInsert()
    @BeforeUpdate()
    updatePublishedAt(): void {
        if (this.is_published && !this.published_at) {
            this.published_at = new Date();
        } else if (!this.is_published) {
            this.published_at = null;
        }
    }

    @BeforeInsert()
    @BeforeUpdate()
    validateCategories(): void {
        console.log('🔧 Entity validateCategories - Input:', this.categories, typeof this.categories);
        
        // Ensure categories is always an array and contains at least one valid category
        if (!this.categories || !Array.isArray(this.categories) || this.categories.length === 0) {
            console.log('⚠️ Entity: Categories invalid, setting to default NEWSROOM');
            this.categories = [BlogCategory.NEWSROOM];
            return;
        }

        // Remove duplicates and validate enum values
        const validCategories = Object.values(BlogCategory);
        const uniqueCategories = [...new Set(this.categories)].filter(category => 
            validCategories.includes(category)
        );

        console.log('🔍 Entity: Valid categories after filtering:', uniqueCategories);

        // Ensure at least one category remains
        if (uniqueCategories.length === 0) {
            console.log('⚠️ Entity: No valid categories found, setting to default NEWSROOM');
            this.categories = [BlogCategory.NEWSROOM];
        } else {
            this.categories = uniqueCategories;
            console.log('✅ Entity: Categories set to:', this.categories);
        }
    }

    static generateSlug(title: string): string {
        if (!title || typeof title !== "string") {
            throw new Error("Title is required to generate slug");
        }
        
        return title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    }
    
    @BeforeInsert()
    @BeforeUpdate()
    generateSlugFromTitle(): void {
        if (this.title && !this.slug) {
            this.slug = BlogPost.generateSlug(this.title);
        }
    }

    toResponseObject(): {
        id: string;
        title: string;
        slug: string;
        content: string;
        excerpt: string | null;
        featured_image: string | null;
        uploaded_image: string | null;
        uploaded_image_filename: string | null;
        uploaded_image_content_type: string | null;
        is_published: boolean;
        is_featured: boolean;
        view_count: number;
        categories: BlogCategory[];
        created_at: Date;
        updated_at: Date;
        published_at: Date | null;
        author: {
            id: string;
            first_name: string;
            last_name: string;
            email: string;
        } | null;
    } {
        // Simple category processing - PostgreSQL returns JSON as arrays automatically
        let processedCategories: BlogCategory[] = this.categories;

        // Safety check
        if (!Array.isArray(processedCategories) || processedCategories.length === 0) {
            console.warn(`⚠️ ResponseObject: Post ${this.id} has invalid categories, using default`);
            processedCategories = [BlogCategory.NEWSROOM];
        }

        // Validate each category
        const validCategories = processedCategories.filter(cat => 
            Object.values(BlogCategory).includes(cat)
        );

        if (validCategories.length === 0) {
            validCategories.push(BlogCategory.NEWSROOM);
        }

        console.log(`📄 ResponseObject: Post ${this.id} final categories:`, validCategories);

        return {
            id: this.id,
            title: this.title,
            slug: this.slug,
            content: this.content,
            excerpt: this.excerpt,
            featured_image: this.featured_image,
            uploaded_image: this.uploaded_image,
            uploaded_image_filename: this.uploaded_image_filename,
            uploaded_image_content_type: this.uploaded_image_content_type,
            is_published: this.is_published,
            is_featured: this.is_featured,
            view_count: this.view_count,
            categories: validCategories,
            created_at: this.created_at,
            updated_at: this.updated_at,
            published_at: this.published_at,
            author: this.author ? {
                id: this.author.id,
                first_name: this.author.first_name,
                last_name: this.author.last_name,
                email: this.author.email,
            } : null
        };
    }
}