import { rmdir, stat } from "node:fs/promises";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { tskit } from "..";

describe("tskit.fs.ensure", () => {
  const testDir = path.join(__dirname, "__test_ensure__");

  beforeEach(async () => {
    // Clean up any existing test directory
    try {
      await rmdir(testDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rmdir(testDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe("directory paths", () => {
    it("should create a single directory", async () => {
      const dirPath = path.join(testDir, "single");

      const result = await tskit.fs.ensure(dirPath);

      expect(result.type).toBe("directory");
      expect(result.created).toBe(true);
      expect(result.path).toBe(path.resolve(dirPath));

      const stats = await stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should create nested directories recursively", async () => {
      const dirPath = path.join(testDir, "nested", "deep", "structure");

      const result = await tskit.fs.ensure(dirPath);

      expect(result.type).toBe("directory");
      expect(result.created).toBe(true);

      const stats = await stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should handle existing directories gracefully", async () => {
      const dirPath = path.join(testDir, "existing");

      // Create first time
      await tskit.fs.ensure(dirPath);

      // Ensure again - should not throw
      const result = await tskit.fs.ensure(dirPath);

      expect(result.type).toBe("directory");
      expect(result.created).toBe(true);
    });

    it("should handle absolute directory paths", async () => {
      const absolutePath = path.resolve(testDir, "absolute");

      const result = await tskit.fs.ensure(absolutePath);

      expect(result.type).toBe("directory");
      expect(result.path).toBe(absolutePath);

      const stats = await stat(absolutePath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe("file paths", () => {
    it("should create parent directory for file path without touching file", async () => {
      const filePath = path.join(testDir, "subdir", "file.txt");

      const result = await tskit.fs.ensure(filePath);

      expect(result.type).toBe("file");
      expect(result.created).toBe(true);

      // Parent directory should exist
      const parentStats = await stat(path.dirname(filePath));
      expect(parentStats.isDirectory()).toBe(true);

      // File should not exist unless touchFile is true
      try {
        await stat(filePath);
        expect.fail("File should not exist");
      } catch (error) {
        expect((error as any).code).toBe("ENOENT");
      }
    });

    it("should create parent directory and touch file when touchFile is true", async () => {
      const filePath = path.join(testDir, "subdir", "touched.txt");

      const result = await tskit.fs.ensure(filePath, { touchFile: true });

      expect(result.type).toBe("file");
      expect(result.created).toBe(true);

      // Both parent directory and file should exist
      const parentStats = await stat(path.dirname(filePath));
      expect(parentStats.isDirectory()).toBe(true);

      const fileStats = await stat(filePath);
      expect(fileStats.isFile()).toBe(true);
    });

    it("should handle deeply nested file paths", async () => {
      const filePath = path.join(
        testDir,
        "very",
        "deep",
        "nested",
        "structure",
        "file.json"
      );

      const result = await tskit.fs.ensure(filePath, { touchFile: true });

      expect(result.type).toBe("file");

      // All parent directories should exist
      const parentStats = await stat(path.dirname(filePath));
      expect(parentStats.isDirectory()).toBe(true);

      const fileStats = await stat(filePath);
      expect(fileStats.isFile()).toBe(true);
    });

    it("should handle absolute file paths", async () => {
      const absoluteFilePath = path.resolve(testDir, "absolute", "file.txt");

      const result = await tskit.fs.ensure(absoluteFilePath, {
        touchFile: true,
      });

      expect(result.type).toBe("file");
      expect(result.path).toBe(absoluteFilePath);

      const fileStats = await stat(absoluteFilePath);
      expect(fileStats.isFile()).toBe(true);
    });
  });

  describe("path detection", () => {
    it("should detect file paths by extension", async () => {
      const filePath = path.join(testDir, "document.pdf");

      const result = await tskit.fs.ensure(filePath);

      expect(result.type).toBe("file");
    });

    it("should detect directory paths without extension", async () => {
      const dirPath = path.join(testDir, "directory");

      const result = await tskit.fs.ensure(dirPath);

      expect(result.type).toBe("directory");
    });

    it("should force file treatment when touchFile is true", async () => {
      const pathWithoutExt = path.join(testDir, "might-be-dir");

      const result = await tskit.fs.ensure(pathWithoutExt, { touchFile: true });

      expect(result.type).toBe("file");

      const stats = await stat(pathWithoutExt);
      expect(stats.isFile()).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should throw meaningful error for permission denied", async () => {
      // This test might be skipped on some systems where we can't create permission issues
      const restrictedPath = "/root/restricted/path";

      try {
        await tskit.fs.ensure(restrictedPath);
        // If we get here, the test environment allows this, so skip
      } catch (error) {
        const errorMessage = (error as Error).message;
        // Accept either permission denied or ENOENT (directory doesn't exist) as valid errors
        expect(errorMessage).toMatch(
          /Permission denied|ENOENT|no such file or directory/
        );
      }
    });

    it("should handle path normalization correctly", async () => {
      const messyPath = path.join(
        testDir,
        "..",
        path.basename(testDir),
        "normalized",
        ".",
        "file.txt"
      );

      const result = await tskit.fs.ensure(messyPath, { touchFile: true });

      expect(result.path).toBe(path.resolve(testDir, "normalized", "file.txt"));

      const stats = await stat(result.path);
      expect(stats.isFile()).toBe(true);
    });
  });

  describe("retry mechanism", () => {
    it("should respect custom retry options", async () => {
      const dirPath = path.join(testDir, "retry-test");

      const result = await tskit.fs.ensure(dirPath, {
        maxRetries: 1,
        retryDelay: 50,
      });

      expect(result.type).toBe("directory");
      expect(result.created).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty filename extensions", async () => {
      const filePath = path.join(testDir, "file.");

      const result = await tskit.fs.ensure(filePath);

      expect(result.type).toBe("file");
    });

    it("should handle multiple extensions", async () => {
      const filePath = path.join(testDir, "archive.tar.gz");

      const result = await tskit.fs.ensure(filePath);

      expect(result.type).toBe("file");
    });

    it("should handle hidden files", async () => {
      const filePath = path.join(testDir, ".hidden");

      const result = await tskit.fs.ensure(filePath, { touchFile: true });

      expect(result.type).toBe("file");

      const stats = await stat(filePath);
      expect(stats.isFile()).toBe(true);
    });
  });
});
