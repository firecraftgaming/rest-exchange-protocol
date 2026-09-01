import {Method, normalizeMethod, Route} from './route';
import {Responder, Request} from './responder';
import {MiddlewareProhibitFurtherExecution, WebError} from './error';
import {REPServer} from './server';

export class Gateway {
    private routes: Route[] = [];
    register(route: Route) {
        this.routes.push(route);
    }

    unregister(route: Route | Route['handler']) {
        this.routes = this.routes.filter((r) => r !== route && r.handler !== route);
    }

    private readonly server: REPServer;

    constructor(server: REPServer) {
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

    private findRoute(url: string, method: Method) {
        const target = normalizeMethod(method) ?? method;
        const matchesMethod = (route: Route) => (normalizeMethod(route.method) ?? route.method) === target;

        const candidates = this.routes
            .filter(matchesMethod)
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