import { defineConfig } from "drizzle-kit";

// Use DATABASE_PUBLIC_URL instead of DATABASE_URL
if (!process.env.DATABASE_PUBLIC_URL) {
  throw new Error("DATABASE_PUBLIC_URL is required, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_PUBLIC_URL,
  },
});