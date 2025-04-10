import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: "app/drizzle/schema.ts",
	out: "app/drizzle/migrations",
});
