import {WebsocketServer} from './ws/server';
import {HTTPServer} from './http/server';
import {Gateway} from './gateway';
import {Route} from './route';
import {ClientManager} from './clients';

export interface REPServerConfig {
    port: number;
}

export class REPServer {
    private readonly httpServer: HTTPServer;
    private readonly wsServer: WebsocketServer;

    private readonly config: REPServerConfig;
    private readonly gateway: Gateway;
    private readonly clients: ClientManager;

    constructor(config: REPServerConfig) {
        this.config = config;

        this.clients = new ClientManager();
        this.gateway = new Gateway(this);

        this.httpServer = new HTTPServer(config.port, this);
        this.wsServer = new WebsocketServer(this.httpServer, this);
    }

    registerRoute(route: Route) {
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
}