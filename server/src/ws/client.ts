import {Client} from '../client';
import {WebSocket} from 'ws';
import http from 'http';
import {WebsocketOutboundMethod} from './server';
import {ClientManager} from '../clients';

export class WebsocketClient extends Client {
    public readonly websocket: WebSocket;
    constructor(websocket: WebSocket, manager: ClientManager, _request: http.IncomingMessage) {
        super(manager);
        this.websocket = websocket;
    }

    public reply(target: string | null, method: WebsocketOutboundMethod, data: unknown, req: string | null) {
        this.websocket.send(JSON.stringify({
            target,
            method,

            data,

            req,
        }));
    }

    public async send(target: string | null, method: WebsocketOutboundMethod, data: unknown, call = true) {
        let req;
        if (call) req = Math.random().toString(36).substring(2);

        this.websocket.send(JSON.stringify({
            target,
            method,

            data,

            req,
        }));

        if (call)
            return await new Promise((resolve, _reject) => this.addRequestCallback(req, resolve));
    }

    private readonly requests = new Map<string, (data: unknown) => void>();
    private addRequestCallback(request: string, callback: (data: unknown) => void) {
        this.requests.set(request, callback);
    }

    private resolveRequest(request: string, data: unknown) {
        const callback = this.requests.get(request);
        if (!callback) return;

        this.requests.delete(request);
        callback(data);
    }

    public close() {
        this.websocket.close();
        this.destroy();
    }
}