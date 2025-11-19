import { config } from "dotenv";
import fs from "fs";
import path from "path";

// Load .env manually since we are running a standalone script
const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found!");
    process.exit(1);
}

const result = config({ path: envPath });
if (result.error) {
    console.error("❌ Error parsing .env file:", result.error);
    process.exit(1);
}

const env = process.env;
const errors: string[] = [];
const warnings: string[] = [];

console.log("🔍 Verifying .env configuration...\n");

// Critical Keys
const requiredKeys = [
    "DATABASE_URL",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "OPENAI_API_KEY",
    "CRON_SECRET",
];

requiredKeys.forEach((key) => {
    if (!env[key]) {
        errors.push(`Missing required key: ${key}`);
    } else if (env[key]?.includes("your_") || env[key]?.includes("set_a_long")) {
        warnings.push(`Key ${key} appears to have a placeholder value: "${env[key]?.substring(0, 15)}..."`);
    }
});

// Specific Validations
if (env.CRON_SECRET && env.CRON_SECRET.length < 32) {
    errors.push(`CRON_SECRET is too short (${env.CRON_SECRET.length} chars). Must be at least 32 characters.`);
}

// AI Provider Logic
const provider = env.AI_PROVIDER || "anthropic";
console.log(`ℹ️  AI Provider set to: ${provider}`);

if (provider === "anthropic" && !env.ANTHROPIC_API_KEY) {
    errors.push("Missing ANTHROPIC_API_KEY (required when AI_PROVIDER is 'anthropic')");
}
if (provider === "openai" && !env.OPENAI_API_KEY) {
    errors.push("Missing OPENAI_API_KEY (required when AI_PROVIDER is 'openai')");
}
if (provider === "google" && !env.GOOGLE_API_KEY) {
    errors.push("Missing GOOGLE_API_KEY (required when AI_PROVIDER is 'google')");
}

// Local Dev Defaults
if (!env.DATABASE_URL && !env.PRODUCTION) {
    // It's okay if missing in local if we rely on defaults, but env.js requires it.
    // Actually env.js says DATABASE_URL is optional in server schema? 
    // Let's check env.js again. 
    // DATABASE_URL: z.string().url().optional(),
    // But then: if (env.PRODUCTION && !env.DATABASE_URL) throw...
    // So it is optional for local?
    // But prisma needs it.
    warnings.push("DATABASE_URL is missing. Prisma might fail unless you are using defaults that I can't see here.");
}

if (errors.length > 0) {
    console.error("❌ Validation Failed with Errors:");
    errors.forEach((e) => console.error(`  - ${e}`));
} else {
    console.log("✅ Critical validation passed!");
}

if (warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    warnings.forEach((w) => console.log(`  - ${w}`));
}
