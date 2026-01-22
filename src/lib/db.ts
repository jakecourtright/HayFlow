import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is not defined');
}

// Use the serverless HTTP driver for Vercel
const sql = neon(process.env.DATABASE_URL!);

// Create a pool-like interface for compatibility with existing code
const pool = {
    query: async (text: string, params?: any[]) => {
        // neon() function with raw query method
        const rows = await sql.call(null, [text] as unknown as TemplateStringsArray, ...(params || []));
        return { rows: Array.isArray(rows) ? rows : [] };
    },
    connect: async () => {
        return {
            query: async (text: string, params?: any[]) => {
                const rows = await sql.call(null, [text] as unknown as TemplateStringsArray, ...(params || []));
                return { rows: Array.isArray(rows) ? rows : [] };
            },
            release: () => { /* no-op for serverless */ }
        };
    }
};

export default pool;
