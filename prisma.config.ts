import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    // @ts-ignore - Prisma 7 might need this specifically in migrations object or here
    directUrl: process.env["DIRECT_URL"],
  },
});
