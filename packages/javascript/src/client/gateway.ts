import {Method, normalizeMethod, Route} from './route';
import {Request} from './request';
import {MiddlewareProhibitFurtherExecution, WebError} from '../shared/error';
import {BaseGateway} from '../shared/gateway';
import {REPClient} from './client';

export class Gateway extends BaseGateway<Route> {
    private readonly client: REPClient;

    constructor(client: REPClient) {
        super();
        this.client = client;
    }

    protected findRoute(url: string, method: Method | string) {
        return this.pickRoute(url, this.matchingRoutes(url, method).filter((route) => !route.passive));
    }

    private sendError(req: string, status: number, error: string, target: string = 'error') {
        const socket = this.client['socket'];
        if (!socket || socket.readyState !== socket.OPEN) return;

        socket.send(JSON.stringify({
            target,
            method: 'REPLY',

            data: {
                status,
                error,
            },

            req,
        }));
    }

    private sendResult(req: string, data: unknown, target: string = '') {
        const socket = this.client['socket'];
        if (!socket || socket.readyState !== socket.OPEN) return;

        socket.send(JSON.stringify({
            target,
            method: 'REPLY',

            data: {
                status: 200,
                data,
            },

            req,
        }));
    }

    async execute(url: string, method: Method, data: any, req?: string) {
        if (!method) {
            if (req) this.sendError(req, 400, 'Missing method', url);
            return;
        }

        const normalizedMethod = normalizeMethod(method);
        if (!normalizedMethod) {
            if (req) this.sendError(req, 400, 'Invalid method', url);
            return;
        }

        const matching = this.matchingRoutes(url, normalizedMethod);
        const route = this.pickRoute(url, matching.filter((r) => !r.passive));
        const passives = matching.filter((r) => r.passive);
        if (!route && passives.length === 0) {
            if (req) this.sendError(req, 404, 'Not Found', url);
            return;
        }

        const query = this.findQuery(url);
        const buildRequest = (forRoute: Route) => {
            const request = new Request(data);
            request.setParams(this.findParams(url, forRoute)!);
            request.setQuery(query);
            return request;
        };

        const passiveRequests = passives.map(buildRequest);
        const request = route ? buildRequest(route) : passiveRequests[0];

        try {
            await this.client['executeMiddleWare']({
                type: 'pre-route',

                route,
                passives,
                request,
            });
        } catch (e) {
            if (e instanceof MiddlewareProhibitFurtherExecution) return;
            if (!(e instanceof WebError))
                e = new WebError('Internal Server Error');

            if (req) this.sendError(req, e.status, e.type, url);
            return;
        }

        try {
            for (let i = 0; i < passives.length; i++)
                await passives[i].handler(passiveRequests[i]);
        } catch (e) {
            if (e instanceof MiddlewareProhibitFurtherExecution) return;
            if (!(e instanceof WebError))
                e = new WebError('Internal Server Error');

            if (req) this.sendError(req, e.status, e.type, url);
            return;
        }

        try {
            const result = route ? await route.handler(request) : {};
            if (req) this.sendResult(req, result, url);
        } catch (e) {
            if (!(e instanceof WebError))
                e = new WebError('Internal Server Error');

            if (req) this.sendError(req, e.status, e.type, url);
        }
    }
}
