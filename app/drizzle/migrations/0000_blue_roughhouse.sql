CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY NOT NULL,
	"role" varchar NOT NULL,
	"content" jsonb NOT NULL,
	"toolName" varchar,
	"toolArgs" jsonb,
	"toolResult" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
