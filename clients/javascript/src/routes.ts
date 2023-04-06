import {Gateway} from './gateway';
import {Request} from './request';
import {Route} from './route';

export class Routes {
    private readonly gateway: Gateway;
    constructor(gateway: Gateway) {
        this.gateway = gateway;
    }

    public register(route: Route) {
        this.gateway.register(route);
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