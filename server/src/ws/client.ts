import {Client} from '../client';
import {WebSocket} from 'ws';
import http from 'http';
import {v4} from 'uuid';
import {WebError} from '../error';
import {WebsocketOutboundMethod} from './server';
import {ClientManager} from '../clients';

export class WebsocketClient extends Client {
    public readonly websocket: WebSocket;
    public readonly request: http.IncomingMessage;
    constructor(websocket: WebSocket, manager: ClientManager, request: http.IncomingMessage) {
        super(manager);
        this.websocket = websocket;
        this.request = request;
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
        if (call) req = v4();

        this.websocket.send(JSON.stringify({
            target,
            method,

            data,

            req,
        }));

        if (call)
            return await new Promise((resolve, reject) => this.addRequestCallback(req, resolve, reject));
    }

    private readonly requests = new Map<string, {resolve: (data: unknown) => void; reject: (error: Error) => void}>();
    private addRequestCallback(request: string, resolve: (data: unknown) => void, reject: (error: Error) => void) {
        this.requests.set(request, {resolve, reject});
    }

    private resolveRequest(request: string, envelope?: {status: number; data?: unknown; error?: string}) {
        const callback = this.requests.get(request);
        if (!callback) return;

        this.requests.delete(request);

        const status = envelope?.status ?? 500;
        if (status < 400) {
            callback.resolve(envelope?.data);
            return;
        }

        callback.reject(new WebError(envelope?.error ?? 'Malformed reply', status));
    }

    protected destroy() {
        for (const {reject} of this.requests.values())
            reject(new WebError('Client disconnected'));

        this.requests.clear();
        super.destroy();
    }

    public close() {
        this.websocket.close();
        this.destroy();
    }
}