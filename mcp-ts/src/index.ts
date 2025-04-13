import Anthropic from '@anthropic-ai/sdk';
import { consola, createConsola } from "consola";
import { createStdioClient, StdioTransport } from './stdio/client.js';
import { ClientSession } from './stdio/client-session.js';
import readline from 'readline';

// const anthropic = new Anthropic();

export class MCPClient {
  private stdio?: StdioTransport
  private session?: ClientSession;
  anthropic = new Anthropic();

  async connect_to_server(serverScriptPath: string) {
    consola.start("Connect to an MCP server")

    const isPython = serverScriptPath.endsWith('.py')
    const isJs = serverScriptPath.endsWith('.js')

    if (!isPython || !isJs) {
      throw new Error("Server script must be a .py or .js file")
    }

    const command = isPython 
    ? "python" 
    : "node"

    const stdioTransport = await createStdioClient({
      command,
      args: [serverScriptPath],
      env: process.env, // inherit parent env
    });

    this.stdio = stdioTransport;
    this.session = new ClientSession(stdioTransport.reader, stdioTransport.writer);

    await this.session.initialize();

    const { tools } = await this.session.listTools();
    consola.box('\nConnected to server with tools:', tools.map(t => t.name));
  }

  async processQuery(query: string): Promise<string> {
    consola.info("Process a query using Claude and available tools")
    const messages: Record<string, any> = [
      {
        "role": "user",
        "content": query
      }
    ]

    let response: any
    response = await this.session?.listTools()
    const availableTools = response?.tools.map((tool: { name: any; description: any; inputSchema: any; }) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as any
    }))

    // # Initial Claude API call
    response = await this.anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      messages: messages as any,
      tools: availableTools
    })

    let finalText = '';
    let assistantMessageContent: any[] = [];

    for (const content of response.content) {
      if (content.type === 'text') {
        assistantMessageContent.push(content);
        finalText += content.text;
      } else if (content.type === 'tool_use') {
        const toolUse = content as any;
        const toolResult = await this.session!.callTool(toolUse.name, toolUse.input);

        assistantMessageContent.push(content);

        messages.push({
          role: "assistant" as const,
          content: assistantMessageContent,
        });

        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: toolResult.content,
            }
          ],
        });

        // get next response after tool result
        response = await this.anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 1024,
          messages: messages as any,
          tools: availableTools,
        });

        finalText += '\n' + response.content.map((c: { type: string; text: any; }) => c.type === "text" ? c.text : '').join('');
      }
    }

    return finalText;
  }

  async chatLoop() {
    consola.log("\nMCP Client Started!");
    consola.log("Type your queries or 'quit' to exit.");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const ask = (question: string) =>
      new Promise<string>((resolve) => rl.question(question, resolve));

    while (true) {
      const input = (await ask("\nQuery: ")).trim();

      if (input.toLowerCase() === "quit") break;

      try {
        const result = await this.processQuery(input);
        consola.success("\n" + result);
      } catch (error) {
        consola.error("Error:", error);
      }
    }

    rl.close();
  }

  async cleanup() {
    // 아오 변환 어케해 이걸 
    // if (this.session) await this.session.close();
    // if (this.stdio) await this.stdio.close();
  }

}
