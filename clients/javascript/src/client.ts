import WebSocket from 'isomorphic-ws';
import axios from 'axios';
import {Method, Route} from './route';
import {Gateway} from './gateway';
import {Routes} from './routes';
import {Request} from './request';
import http from 'http';

export type Transport = 'http' | 'ws' | 'both';


export interface WebsocketMessageMiddleWareData {
    type: 'websocket-message';

    data: any;
}

export interface PreRouteMiddleWareData {
    type: 'pre-route';

    route: Route;
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

    private async onMessage(event: MessageEvent) {
        await this.executeMiddleWare({
            type: 'websocket-message',
            data: event.data,
        });

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

                return;
            }

            await this.gateway.execute(data.path, data.method, data.data, data.req);
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

        if (![
            Method.GET,
            Method.CREATE,
            Method.DELETE,
            Method.UPDATE,
            Method.ACTION,
        ].includes(method as Method)) throw new Error('Invalid method');

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