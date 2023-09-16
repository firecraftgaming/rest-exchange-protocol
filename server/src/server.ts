import {WebsocketServer} from './ws/server';
import {HTTPServer} from './http/server';
import {Gateway} from './gateway';
import {Route} from './route';
import {ClientManager} from './clients';
import {Request, Responder} from './responder';
import http from 'http';
import {WebsocketClient} from './ws/client';
import {HTTPClient} from './http/client';

export interface REPServerConfig {
    port: number;
}

export interface WebsocketUpgradeMiddleWareData {
    type: 'websocket-upgrade';

    request: http.IncomingMessage;
    socket: any;
    head: any;
}

export interface WebsocketConnectMiddleWareData {
    type: 'websocket-connect';

    client: WebsocketClient;
    request: http.IncomingMessage;
};

export interface WebsocketMessageMiddleWareData {
    type: 'websocket-message';

    client: WebsocketClient;
    data: any;
}

export interface WebsocketCloseMiddleWareData {
    type: 'websocket-close';

    client: WebsocketClient;
}

export interface HTTPMiddleWareData {
    type: 'http';

    client: HTTPClient;

    request: http.IncomingMessage;
    response: http.ServerResponse;
}

export interface PreRouteMiddleWareData {
    type: 'pre-route';

    route: Route;
    responder: Responder;
}

export type MiddleWareData =
    WebsocketUpgradeMiddleWareData |
    WebsocketConnectMiddleWareData |
    WebsocketMessageMiddleWareData |
    WebsocketCloseMiddleWareData |
    HTTPMiddleWareData |
    PreRouteMiddleWareData;
export type BasicMiddleware = (data: MiddleWareData) => void;
export type PromiseMiddleware = (data: MiddleWareData) => Promise<void>;

export type Middleware = BasicMiddleware | PromiseMiddleware;

export class REPServer {
    private readonly httpServer: HTTPServer;
    private readonly wsServer: WebsocketServer;

    private readonly config: REPServerConfig;
    private readonly gateway: Gateway;
    private readonly clients: ClientManager;

    private middlewares: Middleware[] = [];

    constructor(config?: REPServerConfig) {
        this.config = config || {} as REPServerConfig;

        this.clients = new ClientManager();
        this.gateway = new Gateway(this);

        this.wsServer = new WebsocketServer(this);
        this.httpServer = new HTTPServer(config.port, this.wsServer, this);
    }

    public getClient(id: string) {
        return this.clients.get(id);
    }

    public getClients() {
        return this.clients.getAll();
    }

    register(route: Route) {
        this.gateway.register(route);
    }

    async start() {
        await this.httpServer.start();
        return this;
    }

    stop() {
        this.httpServer.stop();
        this.wsServer.stop();
    }

    use(middleware: Middleware) {
        this.middlewares.push(middleware);
    }

    private async executeMiddleWare(data: MiddleWareData) {
        for (const middleware of this.middlewares)
            await middleware(data);
    }

    // Below are shortcuts for registering routes

    get(path: string, handler: (request: Request) => void) {
        this.register({
            method: 'GET',
            path,
            handler,
        });
    }

    create(path: string, handler: (request: Request) => void) {
        this.register({
            method: 'CREATE',
            path,
            handler,
        });
    }

    delete(path: string, handler: (request: Request) => void) {
        this.register({
            method: 'DELETE',
            path,
            handler,
        });
    }

    update(path: string, handler: (request: Request) => void) {
        this.register({
            method: 'UPDATE',
            path,
            handler,
        });
    }

    action(path: string, handler: (request: Request) => void) {
        this.register({
            method: 'ACTION',
            path,
            handler,
        });
    }
}