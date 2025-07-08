import { Mode } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "path";

export namespace tskit.fs {
  /**
   * File metadata information
   */
  export interface FileMetadata {
    created: Date;
    modified: Date;
    mime: string;
    encoding: string;
    compressed: boolean;
    size?: number;
  }

  /**
   * Result of a file write operation
   */
  export interface FileWriteResult {
    success: boolean;
    path: string;
    size: number;
    checksum?: string;
    metadata?: FileMetadata;
  }

  /**
   * Write raw data to a file.
   *
   * @param {any} content - The data to write.
   * @param {string} filepath - The full path to the output file.
   * @param {Object} options - The options for the write operation.
   * @param {BufferEncoding} options.encoding - The encoding to use for the file.
   * @param {Mode} options.mode - The mode to use for the file.
   *
   * @returns {Promise<FileWriteResult>} - The result of the write operation.
   */
  export const write = async (
    content: any,
    filepath: string,
    options: { encoding: BufferEncoding; mode: Mode } = {
      encoding: "utf8",
      mode: 0o644,
    }
  ): Promise<FileWriteResult> => {
    // Ensure the directory structure exists for the file
    await ensure(path.dirname(filepath));

    const data = JSON.stringify(content, null, 2);

    await writeFile(filepath, data, {
      encoding: options.encoding,
      mode: options.mode,
    });

    return {
      success: true,
      path: filepath,
      size: Buffer.byteLength(data, options.encoding),
    };
  };

  /**
   * Ensures a path exists by creating the necessary directory structure.
   * This function intelligently handles both file and directory paths with robust error handling.
   *
   * For file paths: Creates the parent directory structure and optionally touches the file.
   * For directory paths: Creates the full directory structure recursively.
   *
   * @param {string} p - The path to ensure exists (file or directory).
   * @param {Object} options - Configuration options.
   * @param {boolean} options.touchFile - Whether to create an empty file if path appears to be a file.
   * @param {number} options.maxRetries - Maximum number of retry attempts for transient failures.
   * @param {number} options.retryDelay - Delay between retry attempts in milliseconds.
   *
   * @returns {Promise<{ type: 'file' | 'directory'; created: boolean; path: string }>} - Result metadata.
   */
  export const ensure = async (
    p: string,
    options: {
      touchFile?: boolean;
      maxRetries?: number;
      retryDelay?: number;
    } = {}
  ): Promise<{
    type: "file" | "directory";
    created: boolean;
    path: string;
  }> => {
    const { touchFile = false, maxRetries = 3, retryDelay = 100 } = options;

    // Normalize the path and resolve any relative components
    const normalizedPath = path.resolve(p);

    // Determine if this is likely a file or directory path
    const isLikelyFile = path.extname(normalizedPath) !== "" || touchFile;
    const targetDir = isLikelyFile
      ? path.dirname(normalizedPath)
      : normalizedPath;

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        // First, ensure the directory structure exists
        await ensureDirectoryWithRetry(
          targetDir,
          attempt,
          maxRetries,
          retryDelay
        );

        // If this is a file path and touchFile is enabled, create the file
        if (isLikelyFile && touchFile) {
          await ensureFileWithRetry(
            normalizedPath,
            attempt,
            maxRetries,
            retryDelay
          );
          return { type: "file", created: true, path: normalizedPath };
        }

        return {
          type: isLikelyFile ? "file" : "directory",
          created: true,
          path: normalizedPath,
        };
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(
            `Failed to ensure path after ${
              maxRetries + 1
            } attempts: ${normalizedPath}. ${error}`
          );
        }

        // Only retry on transient errors
        if (isTransientError(error)) {
          attempt++;
          await sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }

        throw error;
      }
    }

    throw new Error(`Unexpected error ensuring path: ${normalizedPath}`);
  };

  /**
   * Ensures a directory exists with retry logic for transient failures.
   */
  const ensureDirectoryWithRetry = async (
    dirPath: string,
    attempt: number,
    maxRetries: number,
    baseDelay: number
  ): Promise<void> => {
    try {
      const stats = await stat(dirPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path exists but is not a directory: ${dirPath}`);
      }
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        const nodeError = error as NodeJS.ErrnoException;

        switch (nodeError.code) {
          case "ENOENT":
            // Directory doesn't exist, create it
            await mkdir(dirPath, { recursive: true });
            break;

          case "EACCES":
          case "EPERM":
            throw new Error(`Permission denied creating directory: ${dirPath}`);

          case "ENOSPC":
            throw new Error(
              `No space left on device creating directory: ${dirPath}`
            );

          case "EMFILE":
          case "ENFILE":
            // Too many open files - this is transient, will be retried
            throw error;

          default:
            throw error;
        }
      } else {
        throw error;
      }
    }
  };

  /**
   * Ensures a file exists (touches it) with retry logic for transient failures.
   */
  const ensureFileWithRetry = async (
    filePath: string,
    attempt: number,
    maxRetries: number,
    baseDelay: number
  ): Promise<void> => {
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        throw new Error(`Path exists but is not a file: ${filePath}`);
      }
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        const nodeError = error as NodeJS.ErrnoException;

        if (nodeError.code === "ENOENT") {
          // File doesn't exist, create it (touch)
          await writeFile(filePath, "", { encoding: "utf8", mode: 0o644 });
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  };

  /**
   * Determines if an error is transient and worth retrying.
   */
  const isTransientError = (error: any): boolean => {
    if (!(error instanceof Error) || !("code" in error)) {
      return false;
    }

    const nodeError = error as NodeJS.ErrnoException;
    const transientCodes = [
      "EMFILE", // Too many open files
      "ENFILE", // File table overflow
      "EAGAIN", // Resource temporarily unavailable
      "EBUSY", // Resource busy
      "ETIMEDOUT", // Operation timed out
      "EIO", // I/O error (sometimes transient)
    ];

    return transientCodes.includes(nodeError.code || "");
  };

  /**
   * Sleep utility for retry delays.
   */
  const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
}
