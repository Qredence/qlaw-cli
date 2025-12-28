/**
 * File system utilities for @mention autocomplete suggestions
 * Provides file and folder listings for the command palette
 */

import { readdir, lstat } from "fs/promises";
import { resolve, extname, relative, dirname, basename } from "path";

export interface FileSuggestion {
  /** Base name of the file/folder */
  name: string;
  /** Relative path from CWD */
  path: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** File extension (without dot) or "folder" */
  type: string;
  /** File size in bytes (undefined for directories) */
  size?: number;
  /** Human-readable description */
  description?: string;
}

export interface FileSuggestionOptions {
  /** Maximum number of suggestions to return */
  maxResults?: number;
  /** Show hidden files (starting with .) */
  showHidden?: boolean;
  /** File extensions to include (e.g., [".ts", ".tsx"]) */
  extensions?: string[];
}

/**
 * Get file/folder suggestions based on a query string
 *
 * @param cwd - Current working directory
 * @param query - Partial path to match (e.g., "src/", "src/index", "*.ts")
 * @param options - Configuration options
 * @returns Array of matching file/folder suggestions
 */
export async function getFileSuggestions(
  cwd: string,
  query: string,
  options: FileSuggestionOptions = {}
): Promise<FileSuggestion[]> {
  const {
    maxResults = 20,
    showHidden = false,
    extensions,
  } = options;

  try {
    // Determine the directory to list
    let dirPath = cwd;
    let prefix = "";

    if (query.includes("/")) {
      // User typed a path like "src/" or "src/index"
      const lastSlashIndex = query.lastIndexOf("/");
      const searchPrefix = query.substring(lastSlashIndex + 1);
      const dirPart = query.substring(0, lastSlashIndex);

      // Resolve the directory
      dirPath = resolve(cwd, dirPart);
      prefix = dirPart ? `${dirPart}/` : "";

      // Get files in that directory
      const entries = await listDirectoryEntries(dirPath, showHidden);

      // Filter by search prefix and extensions
      let filtered = entries.filter((entry) => {
        // Check if name starts with search prefix
        if (searchPrefix && !entry.name.toLowerCase().startsWith(searchPrefix.toLowerCase())) {
          return false;
        }
        // Check extensions
        if (extensions && extensions.length > 0) {
          const ext = extname(entry.name).toLowerCase();
          if (!extensions.includes(ext)) {
            return false;
          }
        }
        return true;
      });

      // Sort: directories first, then by name
      filtered.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return filtered.slice(0, maxResults).map((entry) => ({
        ...entry,
        path: prefix + entry.name,
      }));
    } else {
      // User just typed a partial name without path
      // List files in current directory
      const entries = await listDirectoryEntries(cwd, showHidden);

      let filtered = entries.filter((entry) => {
        // Check if name contains the query (case-insensitive)
        if (query && !entry.name.toLowerCase().includes(query.toLowerCase())) {
          return false;
        }
        // Check extensions
        if (extensions && extensions.length > 0) {
          const ext = extname(entry.name).toLowerCase();
          if (!extensions.includes(ext)) {
            return false;
          }
        }
        return true;
      });

      // Sort: directories first, then by name
      filtered.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return filtered.slice(0, maxResults);
    }
  } catch (error) {
    // Directory doesn't exist or is not accessible
    console.error("Error getting file suggestions:", error);
    return [];
  }
}

/**
 * Get all files and folders in a directory
 */
async function listDirectoryEntries(
  dirPath: string,
  showHidden: boolean
): Promise<FileSuggestion[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    const results: FileSuggestion[] = [];

    for (const entry of entries) {
      // Skip hidden files unless requested
      if (!showHidden && entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = resolve(dirPath, entry.name);
      const stats = await lstat(fullPath);
      const isDir = entry.isDirectory() || (entry.isSymbolicLink() && stats.isDirectory());

      results.push({
        name: entry.name,
        path: entry.name,
        isDirectory: isDir,
        type: isDir ? "folder" : getFileType(entry.name),
        size: isDir ? undefined : stats.size,
        description: isDir ? "Directory" : getFileDescription(entry.name),
      });
    }

    return results;
  } catch (error) {
    return [];
  }
}

/**
 * Get file type from extension
 */
function getFileType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  if (!ext) return "file";

  const typeMap: Record<string, string> = {
    // Code
    ".ts": "ts",
    ".tsx": "tsx",
    ".js": "js",
    ".jsx": "jsx",
    ".py": "py",
    ".rb": "rb",
    ".go": "go",
    ".rs": "rs",
    // Config
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yml",
    ".toml": "toml",
    ".ini": "ini",
    ".cfg": "cfg",
    // Markup
    ".html": "html",
    ".htm": "html",
    ".xml": "xml",
    ".css": "css",
    ".scss": "scss",
    ".sass": "sass",
    // Text
    ".md": "md",
    ".txt": "txt",
    ".rst": "rst",
    ".log": "log",
    // Shell
    ".sh": "sh",
    ".bash": "bash",
    ".zsh": "zsh",
    // Data
    ".csv": "csv",
    ".sql": "sql",
    ".db": "db",
    // Media
    ".png": "png",
    ".jpg": "jpg",
    ".jpeg": "jpeg",
    ".gif": "gif",
    ".svg": "svg",
  };

  return typeMap[ext] || ext.replace(".", "") || "file";
}

/**
 * Get a human-readable description for a file
 */
function getFileDescription(filename: string): string {
  const ext = extname(filename).toLowerCase();

  const descMap: Record<string, string> = {
    // Package/config files
    "package.json": "npm package configuration",
    "tsconfig.json": "TypeScript configuration",
    "pyproject.toml": "Python project configuration",
    "requirements.txt": "Python dependencies",
    "Cargo.toml": "Rust project configuration",
    "go.mod": "Go module file",
    "pom.xml": "Maven configuration",
    "build.gradle": "Gradle build file",

    // Common files
    ".env": "Environment variables",
    ".gitignore": "Git ignore rules",
    "README.md": "Project README",
    "LICENSE": "License file",
    "Dockerfile": "Docker image definition",

    // Code files
    ".ts": "TypeScript",
    ".tsx": "TypeScript React",
    ".js": "JavaScript",
    ".jsx": "JavaScript React",
    ".py": "Python",
    ".md": "Markdown",
  };

  return descMap[filename] || descMap[ext] || "";
}

/**
 * Check if a path is within the working directory (security check)
 */
export function isPathSafe(targetPath: string, cwd: string): boolean {
  try {
    const resolved = resolve(cwd, targetPath);
    const relativePath = relative(cwd, resolved);
    // Allow paths that don't go outside CWD
    return !relativePath.startsWith("..") && !isAbsolute(relativePath);
  } catch {
    return false;
  }
}

/**
 * Check if a path is absolute
 */
function isAbsolute(path: string): boolean {
  return path.startsWith("/") || path.startsWith("\\") || /^[a-zA-Z]:/.test(path);
}

/**
 * Get directory contents as a formatted string for display
 */
export async function getDirectoryListing(
  cwd: string,
  path: string,
  options: { showHidden?: boolean; maxItems?: number } = {}
): Promise<string> {
  const { showHidden = false, maxItems = 50 } = options;

  try {
    const fullPath = resolve(cwd, path);
    const entries = await listDirectoryEntries(fullPath, showHidden);
    const limited = entries.slice(0, maxItems);

    const lines = limited.map((entry) => {
      const icon = entry.isDirectory ? "[DIR]" : "[FILE]";
      const size = entry.size !== undefined ? ` (${formatFileSize(entry.size)})` : "";
      return `${icon} ${entry.name}${size}`;
    });

    if (entries.length > maxItems) {
      lines.push(`... and ${entries.length - maxItems} more items`);
    }

    return lines.join("\n");
  } catch (error) {
    return `Error reading directory: ${error}`;
  }
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + units[i];
}

/**
 * Fuzzy match file names (simple implementation)
 */
export function matchFileNames(
  query: string,
  files: string[],
  maxResults: number = 10
): string[] {
  if (!query) {
    return files.slice(0, maxResults);
  }

  const queryLower = query.toLowerCase();

  // Score files based on match quality
  const scored = files.map((file) => {
    const fileLower = file.toLowerCase();

    // Exact prefix match (highest score)
    if (fileLower.startsWith(queryLower)) {
      return { file, score: 100 };
    }

    // Contains match (lower score)
    const containsIndex = fileLower.indexOf(queryLower);
    if (containsIndex >= 0) {
      return { file, score: 50 - containsIndex };
    }

    // Word boundary match
    const words = fileLower.split(/[_\-\.]/);
    for (const word of words) {
      if (word.startsWith(queryLower)) {
        return { file, score: 30 };
      }
    }

    return { file, score: 0 };
  });

  // Filter and sort by score
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.file)
    .slice(0, maxResults);
}
