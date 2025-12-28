"""Tool registry and decorator for registering tools."""

from typing import Any, Awaitable, Callable, Dict, List, Optional
from functools import wraps

from .base import Tool, ToolResult, ToolParam, ToolRiskLevel, ToolSchema


# Global registry of all registered tools
_TOOL_REGISTRY: Dict[str, Tool] = {}


def tool(
    name: Optional[str] = None,
    description: str = "",
    risk_level: ToolRiskLevel = ToolRiskLevel.LOW,
) -> Callable[[Callable[..., Awaitable[ToolResult]]], Tool]:
    """
    Decorator to register a function as a tool.

    Args:
        name: Optional custom name for the tool (defaults to function name)
        description: Description of what the tool does
        risk_level: Risk level for permission system

    Example:
        @tool(description="Read file contents", risk_level=ToolRiskLevel.LOW)
        async def read_file(path: str) -> ToolResult:
            ...
    """
    def decorator(func: Callable[..., Awaitable[ToolResult]]) -> Tool:
        tool_name = name or func.__name__

        # Build parameters from function signature annotations
        import inspect
        sig = inspect.signature(func)
        parameters: Dict[str, ToolParam] = {}
        required: List[str] = []

        for param_name, param in sig.parameters.items():
            # Skip 'self' and 'cls'
            if param_name in ("self", "cls"):
                continue

            # Get annotation or default to string
            annotation = param.annotation
            param_type = "string"

            if annotation is not None:
                # Handle Optional types
                origin = getattr(annotation, "__origin__", None)
                if annotation is str:
                    param_type = "string"
                elif annotation is int:
                    param_type = "integer"
                elif annotation is float:
                    param_type = "number"
                elif annotation is bool:
                    param_type = "boolean"
                elif annotation is list or annotation is List:
                    param_type = "array"
                elif origin is list:
                    param_type = "array"
                elif annotation is dict or annotation is Dict:
                    param_type = "object"
                elif origin is dict:
                    param_type = "object"
                elif getattr(annotation, "__name__", None) == "Path":
                    param_type = "string"
                # Handle Optional types like Optional[str]
                if origin is list:
                    # Get the inner type
                    args = getattr(annotation, "__args__", [])
                    if args:
                        inner = args[0]
                        if inner is str:
                            param_type = "array"
                        elif inner is int:
                            param_type = "array"

            # Get default value
            default = None
            if param.default != inspect.Parameter.empty:
                default = param.default

            # Check if required
            if default is None and param.default == inspect.Parameter.empty:
                required.append(param_name)

            parameters[param_name] = ToolParam(
                type=param_type,
                description=param.description if hasattr(param, "description") else "",
                default=default,
            )

        # Create tool instance
        tool_instance = Tool(
            name=tool_name,
            description=description or func.__doc__ or "",
            parameters=parameters,
            required=required,
            risk_level=risk_level,
            func=func,
        )

        # Register it
        _TOOL_REGISTRY[tool_name] = tool_instance

        return func  # Return the original function

    return decorator


def get_tools() -> List[Tool]:
    """Get all registered tools."""
    return list(_TOOL_REGISTRY.values())


def get_tool(name: str) -> Optional[Tool]:
    """Get a specific tool by name."""
    return _TOOL_REGISTRY.get(name)


def get_tool_names() -> List[str]:
    """Get list of all tool names."""
    return list(_TOOL_REGISTRY.keys())


def get_tool_schemas() -> List[ToolSchema]:
    """Get OpenAI-compatible tool schemas for all registered tools."""
    return [tool.to_schema() for tool in _TOOL_REGISTRY.values()]


def get_tool_dict() -> Dict[str, Tool]:
    """Get all tools as a dictionary."""
    return dict(_TOOL_REGISTRY)


def clear_registry() -> None:
    """Clear all registered tools. Useful for testing."""
    _TOOL_REGISTRY.clear()
