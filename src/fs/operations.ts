import { Mode } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensure } from "./ensure";
import { FileWriteResult } from "./types";

export const read = async (
  path: string,
  options: { encoding: BufferEncoding } = {
    encoding: "utf8",
  }
) => {
  const content = await readFile(path, options);
  return content.toString();
};

/**
 * Write raw data to a file.
 *
 * @param {string} filepath - The full path to the output file.
 * @param {any} content - The data to write.
 * @param {Object} options - The options for the write operation.
 * @param {BufferEncoding} options.encoding - The encoding to use for the file.
 * @param {Mode} options.mode - The mode to use for the file.
 *
 * @returns {Promise<FileWriteResult>} - The result of the write operation.
 */
export const write = async (
  filepath: string,
  content: any,
  options: { encoding: BufferEncoding; mode: Mode } = {
    encoding: "utf8",
    mode: 0o644,
  }
): Promise<{
  ensured: boolean;
  path: string;
}> => {
  const ensured = await ensure(path.dirname(filepath));

  await writeFile(filepath, content, {
    encoding: options.encoding,
    mode: options.mode,
  });

  return { ensured: ensured.created, path: filepath };
};
