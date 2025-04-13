import { MCPClient } from "./index.js";

const run = async () => {
  const scriptPath = process.argv[2];

  if (!scriptPath) {
    console.error("Usage: node main.js <path_to_server_script>");
    process.exit(1);
  }

  const client = new MCPClient();

  try {
    await client.connect_to_server(scriptPath);
    await client.chatLoop();
  } finally {
    await client.cleanup();
  }
};

run();
