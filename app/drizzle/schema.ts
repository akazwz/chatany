import { pgTable, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
	id: varchar()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	role: varchar({ enum: ["user", "assistant", "tool"] }).notNull(),
	content: jsonb().notNull(),
	toolName: varchar(),
	toolArgs: jsonb(),
	toolResult: jsonb(),
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp()
		.defaultNow()
		.notNull()
		.$onUpdateFn(() => new Date()),
});

export type DBMessage = typeof messages.$inferSelect;
export type NewDBMessage = typeof messages.$inferInsert;
