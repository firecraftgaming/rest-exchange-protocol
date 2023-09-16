import * as http from 'http';
import {IncomingMessage, ServerResponse} from 'http';
import {MiddlewareProhibitFurtherExecution, WebError} from '../error';
import {Method} from '../route';
import {HTTPResponder} from './responder';
import {Gateway} from '../gateway';
import {EventEmitter} from 'events';
import {REPServer} from '../server';
import {HTTPClient} from './client';
import {WebsocketClient} from '../ws/client';
import {WebsocketServer} from '../ws/server';

export const HTTPTranslation = {
    'GET': Method.GET,
    'PUT': Method.CREATE,
    'DELETE': Method.DELETE,
    'PATCH': Method.UPDATE,
    'POST': Method.ACTION,
};

export class HTTPServer {
    private readonly server: http.Server;
    private readonly websocket: WebsocketServer;
    private readonly port: number;
    private readonly eventEmitter: EventEmitter;
    private readonly gateway: Gateway;
    private readonly repServer: REPServer;
    constructor(port = 5000, websocket: WebsocketServer, server: REPServer) {
        this.repServer = server;
        this.websocket = websocket;
        this.gateway = server['gateway'];

        this.port = port;
        this.server = http.createServer((request: IncomingMessage, response: ServerResponse) => {
            this.onRequest(request, response);
        });

        this.server.on('error', (e: any) => {
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
        return new Promise<void>((resolve, _reject) => {
            this.server.listen(this.port, () => {
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
        const client = new HTTPClient();

        try {
            await this.repServer['executeMiddleWare']({
                type: 'http',

                client,

                request,
                response,
            });
        } catch (e) {
            if (e instanceof MiddlewareProhibitFurtherExecution) return;
            if (!(e instanceof WebError)) e = new WebError('Internal Server Error');

            response.writeHead(e.status, {'Content-Type': 'text/json'});
            response.write(JSON.stringify({
                error: e.type,
            }));
            response.end();
            return;
        }

        const {method, url} = request;
        if (method === 'OPTIONS') return;

        try {
            if (!url) throw new WebError('Missing url', 400);
            if (!HTTPTranslation[method.toUpperCase()]) throw new WebError('Method not allowed', 405);
        } catch (e) {
            response.writeHead(e.status, {'Content-Type': 'text/json'});
            response.write(JSON.stringify({
                error: e.type,
            }));
            response.end();
            return;
        }

        const body = await this.parseBody(request);
        const responder = new HTTPResponder(body, client, response, request);
        await this.gateway.execute(url, HTTPTranslation[method.toUpperCase()], responder);
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
        });
    }
}