import dotenv from "dotenv";
import path from "path";

// 1. Try to load from the current directory (default behavior)
dotenv.config();

// 2. In local monorepo development, load .env from the workspace root if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
}
