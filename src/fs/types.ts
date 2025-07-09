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
