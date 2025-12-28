"""File system tools for the coding agent."""

import os
import re
from pathlib import Path
from typing import List, Optional, Dict, Any

from .base import ToolResult, ToolRiskLevel
from .registry import tool


# Maximum number of files to return from glob
GLOB_MAX_FILES = 1000

# Maximum file size to read (10MB)
READ_MAX_SIZE = 10 * 1024 * 1024

# Maximum lines to return from grep
GREP_MAX_RESULTS = 100


@tool(
    description="Find files matching a glob pattern. Use **/*.ts for recursive search.",
    risk_level=ToolRiskLevel.LOW,
)
async def glob(
    pattern: str,
    cwd: str = ".",
    recursive: bool = True,
) -> ToolResult:
    """Find files matching a glob pattern."""
    try:
        base = Path(cwd)

        # Limit depth for safety
        if "**" in pattern and not recursive:
            pattern = pattern.replace("**", "*", 1)

        if recursive:
            matches = list(base.glob(pattern))
        else:
            matches = list(base.glob(pattern))

        # Limit results for safety
        matches = matches[:GLOB_MAX_FILES]

        return ToolResult.ok([str(m) for m in matches])
    except Exception as e:
        return ToolResult.fail(f"glob error: {e}")


@tool(
    description="Search for text pattern in files. Returns matching lines with line numbers.",
    risk_level=ToolRiskLevel.LOW,
)
async def grep(
    pattern: str,
    path: str = ".",
    glob: Optional[str] = None,
    recursive: bool = True,
) -> ToolResult:
    """Search for text in files using regex."""
    try:
        base_path = Path(path)
        results: List[Dict[str, Any]] = []
        count = 0

        # Build glob patterns to search
        if glob:
            pattern_path = Path(glob)
            if pattern_path.is_absolute():
                base_path = pattern_path.parent
                glob_pattern = pattern_path.name
            else:
                glob_pattern = glob
        else:
            glob_pattern = "**/*" if recursive else "*"

        # Compile regex for efficiency
        try:
            regex = re.compile(pattern)
        except re.error as e:
            return ToolResult.fail(f"Invalid regex pattern: {e}")

        # Search files
        for file_path in base_path.glob(glob_pattern):
            if not file_path.is_file():
                continue

            # Skip binary files
            try:
                content = file_path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, PermissionError):
                continue

            # Search line by line
            for line_num, line in enumerate(content.splitlines(), 1):
                if regex.search(line):
                    results.append({
                        "file": str(file_path),
                        "line": line_num,
                        "content": line.strip(),
                    })
                    count += 1
                    if count >= GREP_MAX_RESULTS:
                        break

            if count >= GREP_MAX_RESULTS:
                break

        return ToolResult.ok(results)
    except Exception as e:
        return ToolResult.fail(f"grep error: {e}")


@tool(
    description="Read the contents of a file. Returns up to 120KB by default.",
    risk_level=ToolRiskLevel.LOW,
)
async def read_file(
    path: str,
    offset: int = 0,
    limit: int = -1,
) -> ToolResult:
    """Read file contents."""
    try:
        file_path = Path(path)

        if not file_path.exists():
            return ToolResult.fail(f"File not found: {path}")

        if not file_path.is_file():
            return ToolResult.fail(f"Not a file: {path}")

        # Check file size
        size = file_path.stat().st_size
        if size > READ_MAX_SIZE:
            return ToolResult.fail(f"File too large ({size} bytes, max {READ_MAX_SIZE})")

        content = file_path.read_text(encoding="utf-8")

        # Handle offset and limit
        lines = content.splitlines()

        if offset > 0:
            lines = lines[offset:]

        if limit > 0:
            lines = lines[:limit]

        result = "\n".join(lines)

        # Truncate if still too large
        if len(result) > READ_MAX_SIZE:
            result = result[:READ_MAX_SIZE] + "\n... (truncated)"

        return ToolResult.ok(result)
    except Exception as e:
        return ToolResult.fail(f"read_file error: {e}")


@tool(
    description="Create or overwrite a file with the given content. Creates parent directories if needed.",
    risk_level=ToolRiskLevel.MEDIUM,
)
async def write_file(
    path: str,
    content: str,
    create_dirs: bool = True,
) -> ToolResult:
    """Write content to a file."""
    try:
        file_path = Path(path)

        # Create parent directories if needed
        if create_dirs:
            file_path.parent.mkdir(parents=True, exist_ok=True)

        file_path.write_text(content, encoding="utf-8")

        return ToolResult.ok({
            "path": str(file_path),
            "size": len(content),
            "lines": len(content.splitlines()),
        })
    except Exception as e:
        return ToolResult.fail(f"write_file error: {e}")


@tool(
    description="Edit a file by replacing old_text with new_text. Uses exact text matching.",
    risk_level=ToolRiskLevel.HIGH,
)
async def edit_file(
    path: str,
    old_text: str,
    new_text: str,
) -> ToolResult:
    """Replace specific text in a file (diff-based edit)."""
    try:
        file_path = Path(path)

        if not file_path.exists():
            return ToolResult.fail(f"File not found: {path}")

        content = file_path.read_text(encoding="utf-8")

        if old_text not in content:
            return ToolResult.fail(f"Text not found in file: {old_text[:100]}...")

        new_content = content.replace(old_text, new_text, 1)
        file_path.write_text(new_content, encoding="utf-8")

        return ToolResult.ok({
            "path": str(file_path),
            "changes": 1,
        })
    except Exception as e:
        return ToolResult.fail(f"edit_file error: {e}")


@tool(
    description="Delete a single file. This action cannot be undone.",
    risk_level=ToolRiskLevel.HIGH,
)
async def delete_file(path: str) -> ToolResult:
    """Delete a file."""
    try:
        file_path = Path(path)

        if not file_path.exists():
            return ToolResult.fail(f"File not found: {path}")

        if not file_path.is_file():
            return ToolResult.fail(f"Not a file: {path}")

        file_path.unlink()

        return ToolResult.ok({
            "path": str(file_path),
            "deleted": True,
        })
    except Exception as e:
        return ToolResult.fail(f"delete_file error: {e}")


@tool(
    description="Delete an empty directory or recursively delete a directory and all contents.",
    risk_level=ToolRiskLevel.HIGH,
)
async def delete_dir(
    path: str,
    recursive: bool = False,
) -> ToolResult:
    """Delete a directory."""
    try:
        dir_path = Path(path)

        if not dir_path.exists():
            return ToolResult.fail(f"Directory not found: {path}")

        if not dir_path.is_dir():
            return ToolResult.fail(f"Not a directory: {path}")

        import shutil

        if recursive:
            shutil.rmtree(dir_path)
        else:
            dir_path.rmdir()

        return ToolResult.ok({
            "path": str(dir_path),
            "deleted": True,
            "recursive": recursive,
        })
    except Exception as e:
        return ToolResult.fail(f"delete_dir error: {e}")


@tool(
    description="Move or rename a file or directory from source to destination.",
    risk_level=ToolRiskLevel.HIGH,
)
async def move(
    source: str,
    destination: str,
) -> ToolResult:
    """Move or rename a file/directory."""
    try:
        src_path = Path(source)
        dst_path = Path(destination)

        if not src_path.exists():
            return ToolResult.fail(f"Source not found: {source}")

        # Create parent dirs for destination
        dst_path.parent.mkdir(parents=True, exist_ok=True)

        # Use shutil.move which handles both move and rename
        import shutil
        shutil.move(str(src_path), str(dst_path))

        return ToolResult.ok({
            "source": str(src_path),
            "destination": str(dst_path),
            "moved": True,
        })
    except Exception as e:
        return ToolResult.fail(f"move error: {e}")


@tool(
    description="Create a directory. Use recursive=true to create nested directories.",
    risk_level=ToolRiskLevel.MEDIUM,
)
async def mkdir(
    path: str,
    recursive: bool = True,
) -> ToolResult:
    """Create a directory."""
    try:
        dir_path = Path(path)

        if recursive:
            dir_path.mkdir(parents=True, exist_ok=True)
        else:
            dir_path.mkdir(exist_ok=True)

        return ToolResult.ok({
            "path": str(dir_path),
            "created": True,
        })
    except FileExistsError:
        return ToolResult.fail(f"Path exists and is not a directory: {path}")
    except Exception as e:
        return ToolResult.fail(f"mkdir error: {e}")


@tool(
    description="Get file metadata including size, modification time, and file type.",
    risk_level=ToolRiskLevel.LOW,
)
async def stat(path: str) -> ToolResult:
    """Get file metadata."""
    try:
        file_path = Path(path)

        if not file_path.exists():
            return ToolResult.fail(f"Path not found: {path}")

        stat_result = file_path.stat()

        # Get file type
        if file_path.is_file():
            file_type = "file"
        elif file_path.is_dir():
            file_type = "directory"
        elif file_path.is_symlink():
            file_type = "symlink"
        else:
            file_type = "unknown"

        # Get permissions (Unix only)
        permissions = None
        try:
            mode = stat_result.st_mode
            permissions = {
                "readable": os.access(file_path, os.R_OK),
                "writable": os.access(file_path, os.W_OK),
                "executable": os.access(file_path, os.X_OK),
            }
        except Exception:
            pass

        return ToolResult.ok({
            "path": str(file_path),
            "size": stat_result.st_size,
            "mtime": stat_result.st_mtime,
            "ctime": stat_result.st_ctime,
            "type": file_type,
            "permissions": permissions,
        })
    except Exception as e:
        return ToolResult.fail(f"stat error: {e}")
