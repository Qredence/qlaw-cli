import { resolve, relative, isAbsolute } from "path";

/**
 * Check if a path resolves to a location outside the given directory.
 * Returns true if the path escapes the root directory.
 */
export function isExternalPath(targetPath: string, cwd: string): boolean {
  const resolved = resolve(cwd, targetPath);
  const root = resolve(cwd);
  const rel = relative(root, resolved);
  if (!rel) return false;
  return rel.startsWith("..") || isAbsolute(rel);
}
