import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {Method, Route} from '../../src/route';
import {WebError} from '../../src/error';
import {Gateway} from '../../src/gateway';
import {REPClient} from '../../src';

should;
@suite class ApiGatewayParamsUnitTests {
    private gateway: Gateway;
    before() {
        const rep = new REPClient({
            host: 'localhost',
        });
        this.gateway = rep['gateway'];
    }

    @test 'test finding params 1'() {
        const url = '/clients/1234';
        const route: Route = {
            path: '/clients/:clientID',
            method: Method.GET,
            handler: () => {},
        };

        const params = this.gateway['findParams'](url, route);
        expect(params).to.deep.equal({clientID: '1234'});
    }

    @test 'test finding params 2'() {
        const url = '/clients/1234';
        const route: Route = {
            path: '/clients/:clientID/other',
            method: Method.GET,
            handler: () => {},
        };

        const params = this.gateway['findParams'](url, route);
        expect(params).to.be.null;
    }

    @test 'test finding params 3'() {
        const url = '/clients/1234/other';
        const route: Route = {
            path: '/clients/:clientID',
            method: Method.GET,
            handler: () => {},
        };

        const params = this.gateway['findParams'](url, route);
        expect(params).to.be.null;
    }

    @test 'test finding params 4'() {
        const url = '/clients/1234/other';
        const route: Route = {
            path: '/clients/:clientID/other',
            method: Method.GET,
            handler: () => {},
        };

        const params = this.gateway['findParams'](url, route);
        expect(params).to.deep.equal({clientID: '1234'});
    }

    @test 'test finding params 5'() {
        const url = '/clients/1234/other';
        const route: Route = {
            path: '/clients/:clientID/:otherID',
            method: Method.GET,
            handler: () => {},
        };

        const params = this.gateway['findParams'](url, route);
        expect(params).to.deep.equal({clientID: '1234', otherID: 'other'});
    }

    @test 'test finding params 6'() {
        const url = '/clients/1234/other/5678';
        const route: Route = {
            path: '/clients/:clientID/other/:otherID',
            method: Method.GET,
            handler: () => {},
        };

        const params = this.gateway['findParams'](url, route);
        expect(params).to.deep.equal({clientID: '1234', otherID: '5678'});
    }

    @test 'test finding params 7'() {
        const url = '/clients/other/';
        const route: Route = {
            path: '/clients/other',
            method: Method.GET,
            handler: () => {},
        };

        const params = this.gateway['findParams'](url, route);
        expect(params).to.deep.equal({});
    }

    @test 'test finding params 8'() {
        const url = '/clients/1234/other/5678?test=1234';
        const route: Route = {
            path: '/clients/:clientID/other/:otherID',
            method: Method.GET,
            handler: () => {},
        };

        const params = this.gateway['findParams'](url, route);
        expect(params).to.deep.equal({clientID: '1234', otherID: '5678'});
    }

    @test 'test finding query 1'() {
        const url = '/clients?test=1234';
        const params = this.gateway['findQuery'](url);
        expect(params).to.deep.equal({test: '1234'});
    }

    @test 'test finding query 2'() {
        const url = '/clients?test=1234&test2=5678';
        const params = this.gateway['findQuery'](url);
        expect(params).to.deep.equal({test: '1234', test2: '5678'});
    }
}

@suite class ApiGatewayRouteFindUnitTests {
    private static routes: Route[] = [
        {
            path: '/clients/:clientID',
            method: Method.GET,
            handler: () => {
                return 'Hello World';
            },
        },
        {
            path: '/clients/:clientID/other',
            method: Method.GET,
            handler: () => {
                throw new Error('Hello World');
            },
        },
        {
            path: '/clients/:clientID',
            method: Method.DELETE,
            handler: () => {
                throw new WebError('Hello World', 400);
            },
        },
        {
            path: '/clients/:clientID',
            method: Method.UPDATE,
            handler: () => {},
        },
        {
            path: '/clients/:clientID',
            method: Method.ACTION,
            handler: () => {},
        },
        {
            path: '/clients/:clientID/other',
            method: Method.UPDATE,
            handler: () => {},
        },
        {
            path: '/clients/:clientID/other',
            method: Method.DELETE,
            handler: () => {},
        },
        {
            path: '/clients/:clientID/other',
            method: Method.ACTION,
            handler: () => {},
        },
        {
            path: '/clients/other',
            method: Method.GET,
            handler: () => {},
        },
        {
            path: '/clients/abc',
            method: Method.DELETE,
            handler: () => {},
        },
        {
            path: '/clients/other/:otherID',
            method: Method.GET,
            handler: () => {},
        },
        {
            path: '/clients/other/:otherID',
            method: Method.GET,
            handler: () => {},
        },
    ];

    private gateway: Gateway;
    before() {
        const rep = new REPClient({
            host: 'localhost',
        });
        this.gateway = rep['gateway'];
        this.gateway['routes'] = ApiGatewayRouteFindUnitTests.routes;
    }

    @test 'test finding route 1'() {
        const url = '/clients/1234';
        const route = this.gateway['findRoute'](url, Method.GET);
        expect(route).to.equal(ApiGatewayRouteFindUnitTests.routes[0]);
    }

    @test 'test finding route 2'() {
        const url = '/clients/1234';
        const route = this.gateway['findRoute'](url, Method.DELETE);
        expect(route).to.equal(ApiGatewayRouteFindUnitTests.routes[2]);
    }

    @test 'test finding route 3'() {
        const url = '/clients/other';
        const route = this.gateway['findRoute'](url, Method.GET);
        expect(route).to.equal(ApiGatewayRouteFindUnitTests.routes[8]);
    }

    @test 'test finding route 4'() {
        const url = '/clients/abc';
        const route = this.gateway['findRoute'](url, Method.DELETE);
        expect(route).to.equal(ApiGatewayRouteFindUnitTests.routes[9]);
    }

    @test 'test finding route 5'() {
        const url = '/clients/other';
        const route = this.gateway['findRoute'](url, Method.DELETE);
        expect(route).to.equal(ApiGatewayRouteFindUnitTests.routes[2]);
    }

    @test 'test finding route 6'() {
        const url = '/clients/other';
        const route = this.gateway['findRoute'](url, Method.UPDATE);
        expect(route).to.equal(ApiGatewayRouteFindUnitTests.routes[3]);
    }

    @test 'test finding route 7'() {
        const url = '/clients/abc';
        const route = this.gateway['findRoute'](url, Method.GET);
        expect(route).to.equal(ApiGatewayRouteFindUnitTests.routes[0]);
    }

    @test 'test finding route 8'() {
        const url = '/clients/1234/other';
        const route = this.gateway['findRoute'](url, Method.GET);
        expect(route).to.equal(ApiGatewayRouteFindUnitTests.routes[1]);
    }

    @test 'test finding route 9'() {
        const url = '/clients/other/5678';
        const route = this.gateway['findRoute'](url, Method.GET);
        expect(route).to.equal(ApiGatewayRouteFindUnitTests.routes[10]);
    }
}

@suite class ApiGatewayRouteFindRegressionUnitTests {
    private gateway: Gateway;
    before() {
        const rep = new REPClient({
            host: 'localhost',
        });
        this.gateway = rep['gateway'];
    }

    @test 'test root route matches'() {
        const route: Route = {
            path: '/',
            method: Method.GET,
            handler: () => {},
        };

        this.gateway['routes'] = [route];

        expect(this.gateway['findRoute']('/', Method.GET)).to.equal(route);
    }

    @test 'test backtracking: early literal match no longer discards a later-matching param route'() {
        const literalRoute: Route = {
            path: '/a/b',
            method: Method.GET,
            handler: () => {},
        };
        const paramRoute: Route = {
            path: '/:x/c',
            method: Method.GET,
            handler: () => {},
        };

        this.gateway['routes'] = [literalRoute, paramRoute];

        expect(this.gateway['findRoute']('/a/c', Method.GET)).to.equal(paramRoute);
        expect(this.gateway['findRoute']('/a/b', Method.GET)).to.equal(literalRoute);
    }

    @test 'test specificity tie-break: literal segment wins over param segment'() {
        const literalFirstRoute: Route = {
            path: '/a/:y',
            method: Method.GET,
            handler: () => {},
        };
        const paramFirstRoute: Route = {
            path: '/:x/b',
            method: Method.GET,
            handler: () => {},
        };

        this.gateway['routes'] = [literalFirstRoute, paramFirstRoute];

        expect(this.gateway['findRoute']('/a/b', Method.GET)).to.equal(literalFirstRoute);
    }

    @test 'test narrowing case returns null when no route matches'() {
        const routeA: Route = {
            path: '/a/b/z',
            method: Method.GET,
            handler: () => {},
        };
        const routeB: Route = {
            path: '/q/:p/c',
            method: Method.GET,
            handler: () => {},
        };

        this.gateway['routes'] = [routeA, routeB];

        expect(this.gateway['findRoute']('/a/b/c', Method.GET)).to.be.null;
    }
}

@suite class ApiGatewayRegisterUnitTests {
    private gateway: Gateway;
    before() {
        const rep = new REPClient({
            host: 'localhost',
        });
        this.gateway = rep['gateway'];
    }
    @test async 'test register route 1'() {
        const route = {
            path: '/clients/other/:otherID',
            method: Method.GET,
            handler: () => {},
        };

        this.gateway.register(route);

        expect(this.gateway['routes']).to.deep.equal([
            route,
        ]);
    }
}

@suite class ApiGatewayMethodAliasUnitTests {
    private gateway: Gateway;
    before() {
        const rep = new REPClient({
            host: 'localhost',
        });
        this.gateway = rep['gateway'];
    }

    @test 'registering a route with an HTTP alias stores it unchanged'() {
        const handler = () => {};
        const route = {path: '/clients', method: 'PUT', handler};
        this.gateway.register(route);

        expect(this.gateway['routes']).to.deep.equal([route]);
    }

    @test 'a route registered with an HTTP alias is found by the REP method'() {
        const handler = () => {};
        this.gateway.register({path: '/clients', method: 'PATCH', handler});

        const route = this.gateway['findRoute']('/clients', Method.UPDATE);
        expect(route).to.deep.equal({path: '/clients', method: 'PATCH', handler});
    }

    @test 'a route registered with a REP method is found by its HTTP alias'() {
        const handler = () => {};
        this.gateway.register({path: '/clients', method: Method.ACTION, handler});

        const route = this.gateway['findRoute']('/clients', 'POST' as Method);
        expect(route).to.deep.equal({path: '/clients', method: Method.ACTION, handler});
    }

    @test 'unregistering a route registered with an HTTP alias removes it by identity'() {
        const route = {path: '/clients', method: 'PUT', handler: () => {}};
        this.gateway.register(route);
        this.gateway.unregister(route);

        expect(this.gateway['routes']).to.deep.equal([]);
    }

    @test async 'executing an invalid method replies with 400'() {
        const errors: {status: number; error: string}[] = [];
        this.gateway['sendError'] = (req: string, status: number, error: string) => errors.push({status, error});

        await this.gateway.execute('/clients', 'ABC' as Method, {}, '123');
        expect(errors).to.deep.equal([{status: 400, error: 'Invalid method'}]);
    }

    @test async 'executing a non-string method replies with 400 instead of throwing'() {
        const errors: {status: number; error: string}[] = [];
        this.gateway['sendError'] = (req: string, status: number, error: string) => errors.push({status, error});

        await this.gateway.execute('/clients', 123 as any, {}, '123');
        expect(errors).to.deep.equal([{status: 400, error: 'Invalid method'}]);
    }

    @test async 'executing an HTTP alias reaches the REP route handler'() {
        let called = false;
        this.gateway.register({path: '/clients', method: Method.ACTION, handler: () => {
            called = true;
        }});

        await this.gateway.execute('/clients', 'POST' as Method, {});
        expect(called).to.be.true;
    }
}