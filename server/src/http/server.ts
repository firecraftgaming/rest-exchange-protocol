import * as http from 'http';
import {IncomingMessage, ServerResponse} from 'http';
import {MiddlewareProhibitFurtherExecution, WebError} from '../error';
import {normalizeMethod} from '../route';
import {HTTPResponder} from './responder';
import {Gateway} from '../gateway';
import {EventEmitter} from 'events';
import {REPServer} from '../server';
import {HTTPClient} from './client';
import {WebsocketServer} from '../ws/server';

function writeError(response: ServerResponse, error: WebError) {
    response.writeHead(error.status, {'Content-Type': 'text/json'});
    response.write(JSON.stringify({
        error: error.type,
    }));
    response.end();
}

export class HTTPServer {
    private readonly server: http.Server;
    private readonly websocket: WebsocketServer;
    private readonly port: number;
    private readonly host: string | undefined;
    private readonly path: string | undefined;
    private readonly eventEmitter: EventEmitter;
    private readonly gateway: Gateway;
    private readonly repServer: REPServer;
    constructor(
        {port, host, path}: {port?: number; host?: string; path?: string} = {},
        websocket: WebsocketServer,
        server: REPServer,
    ) {
        this.repServer = server;
        this.websocket = websocket;
        this.gateway = server['gateway'];

        this.port = port ?? 5000;
        this.host = host;
        this.path = path;
        this.eventEmitter = new EventEmitter();
        this.server = http.createServer((request: IncomingMessage, response: ServerResponse) => {
            this.onRequest(request, response).catch((e) => {
                if (response.headersSent || response.writableEnded || response.destroyed) {
                    response.destroy();
                    return;
                }

                writeError(response, e instanceof WebError ? e : new WebError('Internal Server Error'));
            });
        });

        this.server.on('error', (e: any) => {
            if (this.eventEmitter.listenerCount('error') === 0) return;
            this.eventEmitter.emit('error', e);
        });

        this.server.on('upgrade', async (req: IncomingMessage, socket, head) => {
            try {
                await this.repServer['executeMiddleWare']({
                    type: 'websocket-upgrade',

                    request: req,
                    socket,
                    head,
                });
            } catch (e) {
                if (e instanceof MiddlewareProhibitFurtherExecution) return;
                if (!(e instanceof WebError)) e = new WebError('Internal Server Error');

                socket.write(`HTTP/1.1 ${e.status} ${e.type}\r\n\r\n`);
                socket.destroy();
                return;
            }

            this.websocket.handleRequest(socket, req, head);
        });
    }

    start() {
        return new Promise<void>((resolve, reject) => {
            const opts = this.path
                ? { path: this.path }
                : { port: this.port, host: this.host };
            this.server.once('error', reject);
            this.server.listen(opts, () => {
                this.server.off('error', reject);
                resolve();
            });
        });
    }

    stop() {
        this.server.close();
    }

    on(event: 'error', listener: (e: any) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;

    on(event: string, listener: (...args: any[]) => void): this {
        this.eventEmitter.on(event, listener);
        return this;
    }

    private async onRequest(request: IncomingMessage, response: ServerResponse) {
        const client = new HTTPClient(this.repServer['clients']);
        response.on('close', () => client['destroy']());

        try {
            await this.repServer['executeMiddleWare']({
                type: 'http',

                client,

                request,
                response,
            });
        } catch (e) {
            if (e instanceof MiddlewareProhibitFurtherExecution) return;

            writeError(response, e instanceof WebError ? e : new WebError('Internal Server Error'));
            return;
        }

        const {method, url} = request;
        if (method === 'OPTIONS') {
            response.writeHead(204);
            response.end();
            return;
        }

        if (!method) return writeError(response, new WebError('Missing method', 400));
        if (!url) return writeError(response, new WebError('Missing url', 400));

        const normalizedMethod = normalizeMethod(method);
        if (!normalizedMethod) return writeError(response, new WebError('Method not allowed', 405));

        const body = await this.parseBody(request);
        const responder = new HTTPResponder(body, client, response, request);
        await this.gateway.execute(url, normalizedMethod, responder);
    }

    private parseBody(request: IncomingMessage) {
        return new Promise((resolve, reject) => {
            let body = '';
            request.on('data', chunk => {
                body += chunk;
            });
            request.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(null);
                }
            });
            request.on('error', reject);
            request.on('aborted', () => reject(new WebError('Request aborted', 400)));
        });
    }
}