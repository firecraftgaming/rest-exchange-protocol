import {WebsocketClient} from './client';
import {WebSocket} from 'ws';
import * as http from 'http';
import {MiddlewareProhibitFurtherExecution, WebError} from '../error';
import {Method} from '../route';
import {WebsocketRequest} from './request';
import {WebsocketResponder} from './responder';
import {Gateway} from '../gateway';
import {REPServer} from '../server';

export const WebsocketOutboundMethod = {
    ...Method,
    REPLY: 'REPLY',
} as const;

export type WebsocketOutboundMethod = typeof WebsocketOutboundMethod[keyof typeof WebsocketOutboundMethod];

export class WebsocketServer {
    private readonly server: any;
    private readonly gateway: Gateway;
    private readonly repServer: REPServer;
    constructor(repServer: REPServer) {
        this.repServer = repServer;
        this.gateway = this.repServer['gateway'];

        this.server = new WebSocket.Server({
            noServer: true,
        });

        this.server.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
            this.onConnection(ws, req);
        });
    }

    stop() {
        this.server.close();
    }

    public handleRequest(socket: WebSocket, request: http.IncomingMessage, head: Buffer) {
        this.server.handleUpgrade(request, socket, head, (ws: WebSocket) => {
            this.server.emit('connection', ws, request);
        });
    }

    private async onConnection(websocket: WebSocket, request: http.IncomingMessage) {
        const client = new WebsocketClient(websocket, this.repServer['clients'], request);
        websocket.on('message', async (data: any) => {
            try {
                await this.onMessage(data, client);
            } catch (e) {
                let req;
                try {
                    req = JSON.parse(data).req;
                } catch (_) {
                    e = new WebError('Invalid request', 400);
                }

                if (!(e instanceof WebError)) e = new WebError('Internal Server Error');

                client.reply(
                    'error',
                    WebsocketOutboundMethod.REPLY,
                    {
                        status: e.status,
                        error: e.type,
                    },
                    req,
                );
            }
        });
        websocket.on('error', e => {
            this.onClose(client, e);
        });
        websocket.on('close', () => {
            this.onClose(client);
        });

        try {
            await this.repServer['executeMiddleWare']({
                type: 'websocket-connect',

                client,
                request,
            });
        } catch (e) {}
    }

    private async onMessage(data: any, websocket: WebsocketClient) {
        if (data.toString() === 'PING') return websocket.websocket.send('PONG');

        try {
            await this.repServer['executeMiddleWare']({
                type: 'websocket-message',

                client: websocket,
                data,
            });
        } catch (e) {
            if (e instanceof MiddlewareProhibitFurtherExecution) return;
        }

        const message = JSON.parse(data);
        if (!message.method) throw new WebError('Missing method', 400);
        if (!message.target) throw new WebError('Missing target', 400);

        if (message.method === WebsocketOutboundMethod.REPLY) {
            if (!message.req) throw new WebError('Missing request id', 400);

            websocket['resolveRequest'](message.req, message.data);
            return;
        }

        if (![
            Method.GET,
            Method.CREATE,
            Method.DELETE,
            Method.UPDATE,
            Method.ACTION,
        ].includes(message.method.toUpperCase())) throw new WebError('Invalid method', 400);

        await this.translateRequest(message, websocket, data);
    }

    private async translateRequest(data: WebsocketRequest, websocket: WebsocketClient, raw: unknown) {
        const responder = new WebsocketResponder(data.data, websocket, raw, data.req);
        await this.gateway.execute(data.target, data.method.toUpperCase() as Method, responder);
    }

    private async onClose(websocket: WebsocketClient, error?: Error) {
        try {
            await this.repServer['executeMiddleWare']({
                type: 'websocket-close',
                client: websocket,

                error,
            });
        } catch (e) {}

        websocket['destroy']();
    }
}