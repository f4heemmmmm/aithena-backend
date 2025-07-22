import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

@Injectable()
export class HealthService {
    constructor(
        @InjectDataSource()
        private dataSource: DataSource
    ) {}

    async getSystemHealth() {
        const uptime = process.uptime();
        const memory = process.memoryUsage();
        const timestamp = new Date().toISOString();

        const dbHealth = await this.getDatabaseHealth();

        return {
            status: "OK",
            timestamp,
            uptime: `${Math.floor(uptime / 60)} minutes`,
            memory: {
                used: Math.round(memory.heapUsed / 1024 / 1024) + " MB",
                total: Math.round(memory.heapTotal / 1024 / 1024) + " MB",
                rss: Math.round(memory.rss / 1024 / 1024) + " MB"
            },
            version: process.version,
            database: dbHealth,
            service: "AITHENA Backend"
        };
    }

    async getDatabaseHealth() {
        try {
            // Test database connection
            await this.dataSource.query("SELECT 1");
            
            return {
                status: "connected",
                type: this.dataSource.options.type,
                database: this.dataSource.options.database,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: "disconnected",
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async getBlogHealth() {
        try {
            // Test blog-related database queries
            const blogPostCount = await this.dataSource.query(
                "SELECT COUNT(*) as count FROM blog_posts"
            );
            
            const publishedCount = await this.dataSource.query(
                "SELECT COUNT(*) as count FROM blog_posts WHERE is_published = true"
            );

            return {
                status: "OK",
                totalPosts: parseInt(blogPostCount[0].count),
                publishedPosts: parseInt(publishedCount[0].count),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: "error",
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}