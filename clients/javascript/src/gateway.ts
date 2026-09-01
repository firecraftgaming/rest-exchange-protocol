import {Method, Route} from './route';
import {Request} from './request';
import {MiddlewareProhibitFurtherExecution, WebError} from './error';
import {REPClient} from './client';

export class Gateway {
    private routes: Route[] = [];
    register(route: Route) {
        this.routes.push(route);
    }

    unregister(route: Route | Route['handler']) {
        this.routes = this.routes.filter((r) => r !== route && r.handler !== route);
    }

    private readonly client: REPClient;

    constructor(client: REPClient) {
        this.client = client;
    }

    private sendError(req: string, status: number, error: string, target: string = 'error') {
        this.client['socket'].send(JSON.stringify({
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
        this.client['socket'].send(JSON.stringify({
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
        const route = this.findRoute(url, method);
        if (!route) return this.sendError(req, 404, 'Not Found', url);

        const request = new Request(data);
        request.setParams(this.findParams(url, route)!);
        request.setQuery(this.findQuery(url));

        try {
            await this.client['executeMiddleWare']({
                type: 'pre-route',

                route,
                request,
            });
        } catch (e) {
            if (e instanceof MiddlewareProhibitFurtherExecution) return;
            if (!(e instanceof WebError))
                e = new WebError('Internal Server Error');

            return this.sendError(req, e.status, e.type, url);
        }

        try {
            const result = await route.handler(request);
            this.sendResult(req, result, url);
        } catch (e) {
            if (!(e instanceof WebError))
                e = new WebError('Internal Server Error');

            this.sendError(req, e.status, e.type, url);
        }
    }

    private findRoute(url: string, method: Method) {
        const candidates = this.routes
            .filter((route) => route.method === method)
            .filter((route) => this.findParams(url, route) !== null);
        if (candidates.length === 0) return null;

        return candidates.reduce((best, candidate) => this.moreSpecificRoute(url, best, candidate));
    }

    private moreSpecificRoute(url: string, a: Route, b: Route) {
        const urlParts = this.getPath(url).split('/');
        const aParts = this.getPath(a.path).split('/');
        const bParts = this.getPath(b.path).split('/');

        for (let i = 0; i < urlParts.length; i++) {
            const aIsParam = aParts[i].startsWith(':');
            const bIsParam = bParts[i].startsWith(':');

            if (aIsParam && !bIsParam) return b;
            if (!aIsParam && bIsParam) return a;
        }

        return a;
    }

    private findParams(url: string, route: Route): { [key: string]: string } | null {
        const urlParts = this.getPath(url).split('/');
        const routeParts = this.getPath(route.path).split('/');
        if (urlParts.length !== routeParts.length) return null;

        const params: { [key: string]: string } = {};
        for (let i = 0; i < urlParts.length; i++) {
            const urlPart = urlParts[i];
            const routePart = routeParts[i];

            if (routePart.startsWith(':')) params[routePart.substring(1)] = urlPart;
            else if (urlPart !== routePart) return null;
        }

        return params;
    }

    private findQuery(url: string) {
        const index = url.indexOf('?');
        if (index === -1) return {};

        const search = url.substring(index + 1);
        return Object.fromEntries(new URLSearchParams(search).entries());
    }

    private getPath(url: string) {
        try {
            url = new URL(url).pathname;
        } catch (e) {}

        const index = url.indexOf('?');
        if (index !== -1) url = url.substring(0, index);

        if (url.startsWith('/')) url = url.substring(1);
        if (url.endsWith('/')) url = url.substring(0, url.length - 1);

        return url;
    }
}
