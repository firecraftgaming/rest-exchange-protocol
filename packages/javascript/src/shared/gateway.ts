import {Method, normalizeMethod} from './method';

export interface BaseRoute {
    method: Method | string;
    path: string;
    handler: (...args: any[]) => unknown;
}

export abstract class BaseGateway<TRoute extends BaseRoute> {
    protected routes: TRoute[] = [];

    register(route: TRoute) {
        this.routes.push(route);
    }

    unregister(route: TRoute | TRoute['handler']) {
        this.routes = this.routes.filter((r) => r !== route && r.handler !== route);
    }

    protected findRoute(url: string, method: Method | string) {
        return this.pickRoute(url, this.matchingRoutes(url, method));
    }

    protected pickRoute(url: string, candidates: TRoute[]) {
        if (candidates.length === 0) return null;

        return candidates.reduce((best, candidate) => this.moreSpecificRoute(url, best, candidate));
    }

    protected matchingRoutes(url: string, method: Method | string) {
        const target = normalizeMethod(method) ?? method;
        const matchesMethod = (route: TRoute) => (normalizeMethod(route.method) ?? route.method) === target;

        return this.routes
            .filter(matchesMethod)
            .filter((route) => this.findParams(url, route) !== null);
    }

    protected moreSpecificRoute(url: string, a: TRoute, b: TRoute) {
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

    protected findParams(url: string, route: TRoute): Record<string, string> | null {
        const urlParts = this.getPath(url).split('/');
        const routeParts = this.getPath(route.path).split('/');
        if (urlParts.length !== routeParts.length) return null;

        const params: Record<string, string> = {};
        for (let i = 0; i < urlParts.length; i++) {
            const urlPart = urlParts[i];
            const routePart = routeParts[i];

            if (routePart.startsWith(':')) params[routePart.substring(1)] = urlPart;
            else if (urlPart !== routePart) return null;
        }

        return params;
    }

    protected findQuery(url: string) {
        const index = url.indexOf('?');
        if (index === -1) return {};

        const search = url.substring(index + 1);
        return Object.fromEntries(new URLSearchParams(search).entries());
    }

    protected getPath(url: string) {
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
