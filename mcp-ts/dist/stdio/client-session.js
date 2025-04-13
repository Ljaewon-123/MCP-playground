export class ClientSession {
    reader;
    writer;
    constructor(reader, writer) {
        this.reader = reader;
        this.writer = writer;
    }
    async initialize() {
        await this.send({ type: 'initialize' });
        const response = await this.receive();
        if (response.type !== 'initialized') {
            throw new Error('Initialization failed: ' + JSON.stringify(response));
        }
    }
    async listTools() {
        await this.send({ type: 'list_tools' });
        const response = await this.receive();
        if (response.type !== 'tool_list') {
            throw new Error('Expected tool_list but got: ' + JSON.stringify(response));
        }
        return { tools: response.tools };
    }
    async callTool(toolName, args) {
        await this.send({
            type: 'call_tool',
            name: toolName,
            args: args,
        });
        const response = await this.receive();
        if (response.type !== 'tool_result') {
            throw new Error('Expected tool_result but got: ' + JSON.stringify(response));
        }
        return {
            content: response.result
        };
    }
    async send(message) {
        const json = JSON.stringify(message);
        this.writer.write(json + '\n'); // line-delimited JSON
    }
    async receive() {
        return new Promise((resolve, reject) => {
            let buffer = '';
            const onData = (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                if (lines.length > 1) {
                    const json = lines.shift();
                    buffer = lines.join('\n');
                    try {
                        this.reader.off('data', onData); // remove listener
                        resolve(JSON.parse(json));
                    }
                    catch (err) {
                        reject(new Error('Failed to parse JSON: ' + err));
                    }
                }
            };
            this.reader.on('data', onData);
            this.reader.on('error', reject);
        });
    }
}
