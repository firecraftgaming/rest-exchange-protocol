import {WebsocketClient} from './client';
import {WebSocket} from 'ws';
import {HTTPServer} from '../http/server';
import * as http from 'http';
import {WebError} from '../error';
import {Method} from '../route';
import {WebsocketRequest} from './request';
import {WebsocketResponder} from './responder';
import {Gateway} from '../gateway';
import {REPServer} from '../server';

export enum WebsocketOutboundMethod {
    DATA = 'DATA',
    CREATE = 'CREATE',
    DELETE = 'DELETE',
    UPDATE = 'UPDATE',
    ACTION = 'ACTION',
    REPLY = 'REPLY',
}

export class WebsocketServer {
    private readonly server: any;
    private readonly gateway: Gateway;
    private readonly repServer: REPServer;
    constructor(server: HTTPServer, repServer: REPServer) {
        this.repServer = repServer;
        this.gateway = this.repServer['gateway'];

        this.server = new WebSocket.Server({
            server: server['server'],
        });

        this.server.on('connection', this.onConnection.bind(this));
    }

    stop() {
        this.server.close();
    }

    private onConnection(websocket: WebSocket, request: http.IncomingMessage) {
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

                client.send(
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
            this.onClose(client);
        });
        websocket.on('close', () => {
            this.onClose(client);
        });

        // TODO: run middleware
    }

    private async onMessage(data: any, websocket: WebsocketClient) {
        if (data.toString() === 'PING') return websocket.websocket.send('PONG');

        // TODO: run middleware

        const message = JSON.parse(data);
        if (!message.method) throw new WebError('Missing method', 400);
        if (!message.target) throw new WebError('Missing target', 400);

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

    private onClose(websocket: WebsocketClient) {
        // TODO: run middleware
        websocket.destroy();
    }
}