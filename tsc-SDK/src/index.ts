import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod'

const server = new Server({
  name: "mcp-server",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {}
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: [] };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "name_of_tool") {
    return {};
  }
  throw new McpError(ErrorCode.InternalError, "Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [{
      name: "calculate_sum",
      description: "Add two numbers together",
      inputSchema: {
        type: "object",
        properties: {
          a: { type: "number" },
          b: { type: "number" }
        },
        required: ["a", "b"]
      }
    }]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "calculate_sum") {
    const { a, b } = request.params.arguments as any;
    return { toolResult: a + b };
  }
  throw new McpError(ErrorCode.InternalError, "Tool not found");
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [{
      name: "calculate_sum",
      description: "Add two numbers together",
      inputSchema: {
        type: "object",
        properties: {
          a: { type: "number" },
          b: { type: "number" }
        },
        required: ["a", "b"]
      }
    }]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "calculate_sum") {
    const { a, b } = request.params.arguments as any;
    return { toolResult: a + b };
  }
  throw new McpError(ErrorCode.InternalError, "Tool not found");
});

const ToolResponseSchema = z.object({
  toolResult: z.any().optional(),
  error: z.string().optional(),
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  if (request.params.name === "calculate_sum") {
    // Implement your logic here
  }

  if (request.params.name === "httpbin_json") {
    try {
      const response = await fetch('https://httpbin.org/json', {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });

      if (!response.ok) {
        return ToolResponseSchema.parse({ error: `HTTP error! status: ${response.status}` });
      }

      const data = await response.json();
      return ToolResponseSchema.parse({ toolResult: data });

    } catch (e) {
      return ToolResponseSchema.parse({ error: "Something went wrong" });
    }
  }

  return ToolResponseSchema.parse({ error: "Tool not found" });
});