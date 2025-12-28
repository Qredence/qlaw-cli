"""Bridge Tools - Coding agent tool system for qlaw-cli."""

from .base import ToolResult, Tool, ToolParam, ToolSchema
from .registry import tool, get_tools, get_tool_schemas
from .file_tools import (
    glob,
    grep,
    read_file,
    write_file,
    edit_file,
    delete_file,
    delete_dir,
    move,
    mkdir,
    stat,
)
from .net_tools import web_fetch

__all__ = [
    "ToolResult",
    "Tool",
    "ToolParam",
    "ToolSchema",
    "tool",
    "get_tools",
    "get_tool_schemas",
    # File tools
    "glob",
    "grep",
    "read_file",
    "write_file",
    "edit_file",
    "delete_file",
    "delete_dir",
    "move",
    "mkdir",
    "stat",
    # Network tools
    "web_fetch",
]
