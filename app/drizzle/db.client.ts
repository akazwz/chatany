import { IdbFs, PGlite } from "@electric-sql/pglite";
import wasm from "node_modules/@electric-sql/pglite/dist/postgres.wasm?url";
import wasmData from "node_modules/@electric-sql/pglite/dist/postgres.data?url";
import { drizzle } from "drizzle-orm/pglite";
import * as s from "~/drizzle/schema";

// Open IndexedDB for storing WASM modules
const dbPromise = indexedDB.open("localchat-wasm", 1);

dbPromise.onupgradeneeded = (event: IDBVersionChangeEvent) => {
	const db = (event.target as IDBOpenDBRequest).result;
	if (!db.objectStoreNames.contains("wasm-store")) {
		db.createObjectStore("wasm-store");
	}
};

// Helper function to store/retrieve from IndexedDB
async function getFromIDB(key: string): Promise<ArrayBuffer | null> {
	return new Promise<ArrayBuffer | null>((resolve, reject) => {
		if (!dbPromise.result) {
			reject("Database not available");
			return;
		}
		const transaction = dbPromise.result.transaction("wasm-store", "readonly");
		const store = transaction.objectStore("wasm-store");
		const request = store.get(key);

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function storeInIDB(key: string, value: ArrayBuffer): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		if (!dbPromise.result) {
			reject("Database not available");
			return;
		}
		const transaction = dbPromise.result.transaction("wasm-store", "readwrite");
		const store = transaction.objectStore("wasm-store");
		const request = store.put(value, key);

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

async function getWasm() {
	try {
		// Try to get from IndexedDB first
		const data = await getFromIDB("pg_wasm");
		if (data) {
			return await WebAssembly.compile(data);
		}

		// If not found, fetch and store
		const resp = await fetch(wasm);
		const arrayBuffer = await resp.arrayBuffer();
		await storeInIDB("pg_wasm", arrayBuffer);
		return await WebAssembly.compile(arrayBuffer);
	} catch (err) {
		console.error("Error loading WASM:", err);
		// Fallback to direct fetch if IndexedDB fails
		const resp = await fetch(wasm);
		return WebAssembly.compile(await resp.arrayBuffer());
	}
}

async function getWasmData() {
	try {
		// Try to get from IndexedDB first
		const data = await getFromIDB("pg_data");
		if (data) {
			return new Blob([data], { type: "application/octet-stream" });
		}

		// If not found, fetch and store
		const resp = await fetch(wasmData);
		const blob = await resp.blob();
		const arrayBuffer = await blob.arrayBuffer();
		await storeInIDB("pg_data", arrayBuffer);
		return blob;
	} catch (err) {
		console.error("Error loading WASM data:", err);
		// Fallback to direct fetch if IndexedDB fails
		const resp = await fetch(wasmData);
		return await resp.blob();
	}
}

const createTableSql = `
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
`;

// Wait for the database to be ready
await new Promise<void>((resolve) => {
	dbPromise.onsuccess = () => resolve();
	dbPromise.onerror = () => {
		console.error("Error opening IndexedDB:", dbPromise.error);
		resolve(); // Continue anyway, will use fallback
	};
});

export const client = new PGlite({
	wasmModule: await getWasm(),
	fsBundle: await getWasmData(),
	fs: new IdbFs("localchat"),
});

// Function to check if tables exist and initialize them if they don't
async function checkAndInitTables() {
	try {
		// Check if messages table exists
		const tableExistsQuery = `
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = 'messages'
			) as table_exists;
		`;
		const result = await client.query(tableExistsQuery);
		// PGlite may return boolean value as 't' (true) or 'f' (false) in text format
		// or as boolean true/false based on driver version
		const existsValue = result.rows[0]
			? Object.values(result.rows[0])[0]
			: null;
		const tableExists = existsValue === true || existsValue === "t";
		if (!tableExists) {
			console.log("Messages table does not exist. Creating...");
			await client.exec(createTableSql);
			console.log("Tables initialized successfully");
		} else {
			console.log("Tables already exist");
		}
	} catch (error) {
		console.error("Error checking/initializing tables:", error);
		// delete messages table
		const deleteTableQuery = `
			DROP TABLE IF EXISTS "messages";
		`;
		await client.exec(deleteTableQuery);
		// Even if there's an error, we'll try to continue with initialization
		// as a fallback in case the error was just in the checking part
		try {
			if (
				error instanceof Error &&
				error.message.includes("relation") &&
				error.message.includes("does not exist")
			) {
				console.log("Attempting fallback table creation...");
				await client.exec(createTableSql);
				console.log("Fallback table initialization completed");
			}
		} catch (fallbackError) {
			console.error("Fallback initialization also failed:", fallbackError);
		}
	}
}

// Check and initialize database tables
await checkAndInitTables();

export async function resetAllTables() {
	// delete messages table
	const deleteTableQuery = `
		DROP TABLE IF EXISTS "messages";
	`;
	await client.exec(deleteTableQuery);
	// create messages table
	await client.exec(createTableSql);
}

export const schema = s;
export const db = drizzle(client, {
	schema,
});
