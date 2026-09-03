import WebSocket from 'isomorphic-ws';
import axios from 'axios';
import {v4} from 'uuid';
import {Method, normalizeMethod, Route} from './route';
import {Gateway} from './gateway';
import {Routes} from './routes';
import {Request} from './request';
import {MiddlewareProhibitFurtherExecution, WebError} from './error';

export type Transport = 'http' | 'ws' | 'both';

export const HTTPTranslation = {
    [Method.GET]: 'GET',
    [Method.CREATE]: 'PUT',
    [Method.DELETE]: 'DELETE',
    [Method.UPDATE]: 'PATCH',
    [Method.ACTION]: 'POST',
};


export interface WebsocketMessageMiddleWareData {
    type: 'websocket-message';

    data: any;
}

export interface PreRouteMiddleWareData {
    type: 'pre-route';

    route: Route | null;
    passives: Route[];
    request: Request;
}

export type MiddleWareData =
    WebsocketMessageMiddleWareData |
    PreRouteMiddleWareData;
export type BasicMiddleware = (data: MiddleWareData) => void;
export type PromiseMiddleware = (data: MiddleWareData) => Promise<void>;

export type Middleware = BasicMiddleware | PromiseMiddleware;

export interface REPClientOptions {
    host: string;

    transport?: Transport;
    secure?: boolean;
}

export class REPClient {
    private options: REPClientOptions = {
        host: '',
        transport: 'both',
        secure: false,
    };
    private socket: WebSocket;
    private connected_: boolean;
    private get connected() {
        return this.connected_;
    }
    private middlewares: Middleware[] = [];

    use(middleware: Middleware) {
        this.middlewares.push(middleware);
    }

    private async executeMiddleWare(data: MiddleWareData) {
        for (const middleware of this.middlewares)
            await middleware(data);
    }

    private readonly gateway: Gateway;
    public get routes() {
        return new Routes(this.gateway);
    }
    constructor(options: REPClientOptions) {
        Object.assign(this.options, options);
        this.gateway = new Gateway(this);

        this.onOpen = this.onOpen.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.onError = this.onError.bind(this);
        this.onClose = this.onClose.bind(this);
    }

    public connect() {
        if (this.socket) this.disconnect();

        const protocol = this.options.secure ? 'wss' : 'ws';
        this.socket = new WebSocket(`${protocol}://${this.options.host}`);
        this.socket.addEventListener('open', this.onOpen);
    }

    public disconnect() {
        if (!this.socket) return;

        this.socket.close();
        this.teardownSocket();
    }

    private onOpen() {
        this.connected_ = true;

        this.socket.addEventListener('message', this.onMessage);
        this.socket.addEventListener('error', this.onError);
        this.socket.addEventListener('close', this.onClose);
    }

    private async onMessage(event: MessageEvent) {
        try {
            await this.executeMiddleWare({
                type: 'websocket-message',
                data: event.data,
            });

            const data = JSON.parse(event.data);
            if (data.method === 'REPLY') {
                this.handleReply(data.req, data.data);
                return;
            }

            await this.gateway.execute(data.target, data.method, data.data, data.req);
        } catch (e) {
            if (e instanceof MiddlewareProhibitFurtherExecution) return;
            this.onError(e);
        }
    }

    private handleReply(req: string, envelope?: {status: number; data?: unknown; error?: string}) {
        if (!req) return;

        const pending = this.requests.get(req);
        if (!pending) return;
        this.requests.delete(req);

        const status = envelope?.status ?? 500;
        if (status < 400) pending.resolve(envelope?.data);
        else pending.reject(new WebError(envelope?.error ?? 'Malformed reply', status));
    }

    private onError(error: Error) {

    }

    private onClose() {
        this.teardownSocket();
    }

    private teardownSocket() {
        this.socket?.removeEventListener('open', this.onOpen);
        this.socket?.removeEventListener('message', this.onMessage);
        this.socket?.removeEventListener('error', this.onError);
        this.socket?.removeEventListener('close', this.onClose);
        this.socket = null;

        this.connected_ = false;
        this.rejectPending(new WebError('Disconnected'));
    }

    private rejectPending(error: WebError) {
        for (const {reject} of this.requests.values())
            reject(error);

        this.requests.clear();
    }

    private requests: Map<string, {resolve: (data: any) => void; reject: (error: WebError) => void}> = new Map();

    public request(path: string, method: string, data: any): Promise<any>;
    public request(path: string, method: string, data: any, transport: Transport): Promise<any>;
    public request(path: string, method: string, data: any, transport: 'ws', call: boolean): Promise<any>;
    public request(path: string, method: string, data: any, transport?: Transport, call = true): Promise<any> {
        transport = transport || this.options.transport;

        const normalizedMethod = normalizeMethod(method);
        if (!normalizedMethod) throw new Error('Invalid method');
        method = normalizedMethod;

        if (transport === 'http') return this.requestHttp(path, method, data);
        if (transport === 'ws') return this.requestWs(path, method, data, call);

        if (this.connected) return this.requestWs(path, method, data, call);
        return this.requestHttp(path, method, data);
    }

    private requestHttp(path: string, method: string, data: any) {
        const httpMethod = HTTPTranslation[method as Method];
        const url = path.startsWith('/') ? path : `/${path}`;

        const protocol = this.options.secure ? 'https' : 'http';
        return axios.request({
            url: `${protocol}://${this.options.host}${url}`,

            headers: {
                'Content-Type': 'application/json',
            },

            method: httpMethod,
            data: JSON.stringify(data),
        })
            .then((response) => response.data.data)
            .catch((error) => {
                const body = error?.response?.data;
                throw new WebError(body?.error ?? 'Internal Server Error', error?.response?.status ?? 500);
            });
    }
    private async requestWs(path: string, method: string, data: any, call = true) {
        if (!this.connected) throw new Error('Not connected');

        let request;
        if (call) request = v4();

        this.socket.send(JSON.stringify({
            target: path,
            method,

            data,

            req: request,
        }));

        if (call)
            return await new Promise((resolve, reject) => this.requests.set(request, {resolve, reject}));
    }
}