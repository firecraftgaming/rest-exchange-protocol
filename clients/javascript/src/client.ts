import WebSocket from 'isomorphic-ws';
import axios from 'axios';

export type Transport = 'http' | 'ws' | 'both';

export interface ClientOptions {
    host: string;

    transport: Transport;
    secure: boolean;
}

export class Client {
    private options: ClientOptions;
    private socket: WebSocket;
    private connected_: boolean;
    private get connected() {
        return this.connected_;
    }
    constructor(options: ClientOptions) {
        this.options = options;

        this.onOpen = this.onOpen.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.onError = this.onError.bind(this);
        this.onClose = this.onClose.bind(this);
    }

    public connect() {
        if (this.socket) this.disconnect();

        const protocol = this.options.secure ? 'wss' : 'ws';
        this.socket = new WebSocket(`${protocol}://${this.options.host}`);
        this.socket.on('open', this.onOpen);
    }

    public disconnect() {
        this.socket.off('open', this.onOpen);
        this.socket.off('message', this.onMessage);
        this.socket.off('error', this.onError);
        this.socket.off('close', this.onClose);

        this.socket.close();
        this.socket = null;

        this.connected_ = false;
    }

    private onOpen() {
        this.connected_ = true;

        this.socket.on('message', this.onMessage);
        this.socket.on('error', this.onError);
        this.socket.on('close', this.onClose);
    }

    private onMessage(event: MessageEvent) {
        // TODO: Execute middlewares

        try {
            const data = JSON.parse(event.data);
            if (data.method === 'REPLY') {
                if (data.req) {
                    const callback = this.requests.get(data.req);
                    if (callback) {
                        this.requests.delete(data.req);
                        callback(data.data);
                    }
                }
            }

            // TODO: Execute handlers
        } catch (e) {

        }
    }

    private onError(error: Error) {

    }

    private onClose() {
        this.connected_ = false;
    }

    private requests: Map<string, (data: any) => void> = new Map();

    public request(path: string, method: string, data: any): Promise<any>;
    public request(path: string, method: string, data: any, transport: Transport): Promise<any>;
    public request(path: string, method: string, data: any, transport: 'ws', call: boolean): Promise<any>;
    public request(path: string, method: string, data: any, transport?: Transport, call = true): Promise<any> {
        transport = transport || this.options.transport;
        method = method.toUpperCase();

        if ([
            'GET',
            'CREATE',
            'DELETE',
            'UPDATE',
            'ACTION',
        ].includes(method)) throw new Error('Invalid method');

        if (transport === 'http') return this.requestHttp(path, method, data);
        if (transport === 'ws') return this.requestWs(path, method, data, call);

        if (this.connected) return this.requestWs(path, method, data, call);
        return this.requestHttp(path, method, data);
    }

    private async requestHttp(path: string, method: string, data: any) {
        path = path.startsWith('/') ? path : `/${path}`;

        const protocol = this.options.secure ? 'https' : 'http';
        const response = await axios.request({
            url: `${protocol}://${this.options.host}${path}`,

            headers: {
                'Content-Type': 'application/json',
            },

            method,
            data: JSON.stringify(data),
        });

        return response.data;
    }
    private async requestWs(path: string, method: string, data: any, call = true) {
        if (!this.connected) throw new Error('Not connected');

        let request;
        if (call) request = Math.random().toString(36).substring(2);

        this.socket.send(JSON.stringify({
            target: path,
            method,

            data,

            req: request,
        }));

        if (call)
            return await new Promise((resolve, _reject) => this.requests.set(request, resolve));
    }
}