import {Method, Route} from './route';
import {Responder, Request} from './responder';
import {MiddlewareProhibitFurtherExecution, WebError} from './error';
import {REPServer} from './server';

export class Gateway {
    private routes: Route[] = [];
    register(route: Route) {
        this.routes.push(route);
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

        responder.setParams(this.findParams(url, route));
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
        const urlParts = this.getPath(url).split('/');
        const routes = this.routes
            .filter((route) => route.method === method)
            .map((route) => [route.path.split('/').slice(1), route] as [string[], Route])
            .filter(([routeParts]) => routeParts.length === urlParts.length); // filter out routes with different section lengths and different methods
        if (routes.length === 0) return null;

        let matchingRoutes = routes;
        for (let i = 0; i < urlParts.length; i++) {
            const newRoutesParams: [string[], Route][] = [];
            let newRoutes: [string[], Route][] = [];

            const urlPart = urlParts[i];
            for (const [routeParts, route] of routes) {
                const routePart = routeParts[i];
                if (!routePart) continue;

                if (routePart.startsWith(':')) newRoutesParams.push([routeParts, route]);
                else if (urlPart === routePart) newRoutes.push([routeParts, route]);
            }

            if (newRoutes.length === 0) newRoutes = newRoutesParams;
            if (newRoutes.length === 0) return null;
            matchingRoutes = newRoutes;
        }

        return matchingRoutes[0][1];
    }

    private findParams(url: string, route: Route): { [key: string]: string } {
        const urlParts = this.getPath(url).split('/');
        const routeParts = route.path.split('/').slice(1);
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