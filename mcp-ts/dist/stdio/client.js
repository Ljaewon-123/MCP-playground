import { spawn } from 'child_process';
export async function createStdioClient(params) {
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
