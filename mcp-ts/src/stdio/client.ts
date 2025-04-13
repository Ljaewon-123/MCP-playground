import { spawn, ChildProcessByStdio } from 'child_process';
import type { Writable, Readable } from 'stream';

export interface StdioTransport {
  process: ChildProcessByStdio<Writable, Readable, null>; // ✅ 정확한 타입
  reader: NodeJS.ReadableStream;
  writer: NodeJS.WritableStream;
  cleanup: () => Promise<void>;
}


interface ServerParams {
  command: string;       // "python" 또는 "node"
  args: string[];        // [scriptPath]
  env?: NodeJS.ProcessEnv | undefined;
}

export async function createStdioClient(params: ServerParams): Promise<StdioTransport> {
  const { command, args, env } = params;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'inherit'], // stdin, stdout 연결 / stderr는 그냥 콘솔에 출력
      env: {
        ...process.env,
        ...env
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start server process: ${err.message}`));
    });

    child.on('spawn', () => {
      console.info(`[client] Subprocess started: ${command} ${args.join(' ')}`);
      resolve({
        process: child,
        reader: child.stdout,
        writer: child.stdin,
        cleanup: async () => {
          child.stdin.end();
          child.kill('SIGTERM');
        }
      });
    });
  });
}
