/* eslint-disable no-process-env */
import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

/**
 * Load environment variables from .env files, mirroring the behavior of Vite.
 *
 * @returns Array of environment file paths loaded.
 */
export function loadEnvFiles(
  mode = process.env.NODE_ENV || "development",
  cwd = process.cwd()
): string[] {
  const envFiles = [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`];
  const loaded = [];

  for (const file of envFiles) {
    const envFilePath = path.join(cwd, file);
    if (!fs.existsSync(envFilePath)) {
      continue;
    }
    const { error } = dotenv.config({ path: envFilePath });
    if (error) {
      console.warn(
        `Failed to load environment variables from current working directory ${envFilePath}: ${error.message}`
      );
    }

    loaded.push(envFilePath);
  }

  return loaded;
}
