"""Base classes and types for the tool system."""

from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional, Callable, Awaitable
from enum import Enum


class ToolRiskLevel(str, Enum):
    """Risk level for tool permissions."""
    LOW = "low"       # Read-only, safe operations
    MEDIUM = "medium" # Operations that modify files
    HIGH = "high"     # Destructive operations


class ToolParam(BaseModel):
    """Schema for a tool parameter."""
    type: str = "string"
    description: str = ""
    default: Optional[Any] = None
    enum: Optional[List[Any]] = None


class ToolSchema(BaseModel):
    """OpenAI-compatible tool schema for LLM function calling."""
    type: str = "function"
    function: Dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def from_tool(cls, name: str, description: str, parameters: Dict[str, ToolParam], required: Optional[List[str]] = None) -> "ToolSchema":
        """Create a tool schema from tool metadata."""
        properties = {}
        for param_name, param in parameters.items():
            prop: Dict[str, Any] = {"description": param.description}
            prop["type"] = param.type
            if param.enum is not None:
                prop["enum"] = param.enum
            if param.default is not None:
                prop["default"] = param.default
            properties[param_name] = prop

        function_def: Dict[str, Any] = {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required or [],
            },
        }

        return cls(function=function_def)


class ToolResult(BaseModel):
    """Result from executing a tool."""
    success: bool
    output: Any = None
    error: Optional[str] = None

    @classmethod
    def ok(cls, output: Any = None) -> "ToolResult":
        return cls(success=True, output=output)

    @classmethod
    def fail(cls, error: str) -> "ToolResult":
        return cls(success=False, error=error)


class Tool(BaseModel):
    """A callable tool for the coding agent."""
    name: str
    description: str
    parameters: Dict[str, ToolParam] = Field(default_factory=dict)
    required: List[str] = Field(default_factory=list)
    risk_level: ToolRiskLevel = ToolRiskLevel.LOW
    func: Optional[Callable[..., Awaitable[ToolResult]]] = None

    async def execute(self, **kwargs: Any) -> ToolResult:
        """Execute the tool with given arguments."""
        if self.func is None:
            return ToolResult.fail(f"Tool {self.name} has no implementation")
        try:
            return await self.func(**kwargs)
        except Exception as e:
            return ToolResult.fail(str(e))

    def to_schema(self) -> ToolSchema:
        """Convert to OpenAI-compatible function schema."""
        return ToolSchema.from_tool(
            name=self.name,
            description=self.description,
            parameters=self.parameters,
            required=self.required,
        )


class ToolCategory(str, Enum):
    """Categories for organizing tools."""
    FILE_SYSTEM = "file_system"
    SEARCH = "search"
    NETWORK = "network"
    UTILITY = "utility"
