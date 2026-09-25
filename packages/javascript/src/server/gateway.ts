import {Method, Route} from './route';
import {Responder, Request} from './responder';
import {MiddlewareProhibitFurtherExecution, WebError} from '../shared/error';
import {BaseGateway} from '../shared/gateway';
import {REPServer} from './server';

export class Gateway extends BaseGateway<Route> {
    private readonly server: REPServer;

    constructor(server: REPServer) {
        super();
        this.server = server;
    }

    async execute(url: string, method: Method, responder: Responder) {
        const route = this.findRoute(url, method);
        if (!route) {
            responder.error(new WebError('Not Found', 404));
            return;
        }

        responder.setParams(this.findParams(url, route)!);
        responder.setQuery(this.findQuery(url));

        try {
            await this.server['executeMiddleWare']({
                type: 'pre-route',

                route,
                responder,
            });
        } catch (e) {
            if (e instanceof MiddlewareProhibitFurtherExecution) return;
            if (!(e instanceof WebError))
                e = new WebError('Internal Server Error');
            responder.error(e);
            return;
        }

        try {
            const result = await route.handler(new Request(responder));
            responder.respond(result);
        } catch (e) {
            if (!(e instanceof WebError))
                e = new WebError('Internal Server Error');
            responder.error(e);
        }
    }
}
