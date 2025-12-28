"""Network tools for the coding agent."""

import json
from typing import Optional, Dict, Any
from urllib.parse import urlparse

import httpx

from .base import ToolResult, ToolRiskLevel
from .registry import tool


# Maximum content size to fetch (5MB)
MAX_CONTENT_SIZE = 5 * 1024 * 1024

# Default timeout in seconds
DEFAULT_TIMEOUT = 30


@tool(
    description="Fetch content from a URL using HTTP GET or POST. Returns text content or JSON.",
    risk_level=ToolRiskLevel.MEDIUM,
)
async def web_fetch(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> ToolResult:
    """Fetch content from a URL."""
    try:
        # Validate URL
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return ToolResult.fail(f"Invalid URL: {url}")

        if parsed.scheme not in ("http", "https"):
            return ToolResult.fail(f"Unsupported URL scheme: {parsed.scheme}")

        # Default headers
        request_headers = {
            "User-Agent": "qlaw-cli/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        if headers:
            request_headers.update(headers)

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            # Make request
            if method.upper() == "GET":
                response = await client.get(url, headers=request_headers)
            elif method.upper() == "POST":
                content_type = request_headers.get("Content-Type", "application/json")
                body = request_headers.pop("body", None)

                # Check if body is JSON
                if content_type == "application/json" and isinstance(body, (dict, list)):
                    response = await client.post(url, json=body, headers=request_headers)
                else:
                    response = await client.post(url, content=body, headers=request_headers)
            else:
                return ToolResult.fail(f"Unsupported HTTP method: {method}")

            # Check status
            if response.status_code >= 400:
                return ToolResult.fail(f"HTTP {response.status_code}: {response.reason_phrase}")

            # Determine content type
            content_type = response.headers.get("content-type", "")

            # Check content size
            content_length = len(response.content)
            if content_length > MAX_CONTENT_SIZE:
                truncated = response.text[:MAX_CONTENT_SIZE]
                return ToolResult.ok({
                    "url": url,
                    "status": response.status_code,
                    "content_type": content_type,
                    "content": truncated,
                    "truncated": True,
                    "original_size": content_length,
                })

            # Parse based on content type
            if "application/json" in content_type:
                try:
                    data = response.json()
                    return ToolResult.ok({
                        "url": url,
                        "status": response.status_code,
                        "content_type": content_type,
                        "json": data,
                        "size": content_length,
                    })
                except json.JSONDecodeError:
                    # Fall back to text
                    return ToolResult.ok({
                        "url": url,
                        "status": response.status_code,
                        "content_type": content_type,
                        "text": response.text,
                        "size": content_length,
                    })
            else:
                return ToolResult.ok({
                    "url": url,
                    "status": response.status_code,
                    "content_type": content_type,
                    "text": response.text,
                    "size": content_length,
                })

    except httpx.TimeoutException:
        return ToolResult.fail(f"Request timeout after {timeout}s")
    except httpx.RedirectError as e:
        return ToolResult.fail(f"Too many redirects: {e}")
    except httpx.RequestError as e:
        return ToolResult.fail(f"Request error: {e}")
    except Exception as e:
        return ToolResult.fail(f"web_fetch error: {e}")
