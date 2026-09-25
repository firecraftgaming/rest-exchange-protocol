import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {Method, Route} from '../../../src/server/route';
import {WebError} from '../../../src/shared/error';
import {REPServer} from '../../../src/server';
import {Gateway} from '../../../src/server/gateway';

should;
@suite class ApiGatewayParamsUnitTests {
    private gateway: Gateway;
    before() {
        const rep = new REPServer({
            port: 0,
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

    @test 'a bare question mark yields an empty query'() {
        expect(this.gateway['findQuery']('/clients?')).to.deep.equal({});
    }

    @test 'URL-encoded query values are decoded'() {
        expect(this.gateway['findQuery']('/clients?name=a%20b')).to.deep.equal({name: 'a b'});
    }

    @test 'a plus in a query value decodes to a space'() {
        expect(this.gateway['findQuery']('/clients?name=a+b')).to.deep.equal({name: 'a b'});
    }

    @test 'a repeated query key keeps the last value'() {
        expect(this.gateway['findQuery']('/clients?x=1&x=2')).to.deep.equal({x: '2'});
    }

    @test 'a query key with no value becomes an empty string'() {
        expect(this.gateway['findQuery']('/clients?flag')).to.deep.equal({flag: ''});
    }

    @test 'an absolute URL resolves params relative to its pathname'() {
        const route: Route = {
            path: '/clients/:id',
            method: Method.GET,
            handler: () => {},
        };

        expect(this.gateway['findParams']('http://example.com/clients/42?x=1', route)).to.deep.equal({id: '42'});
        expect(this.gateway['findQuery']('http://example.com/clients/42?x=1')).to.deep.equal({x: '1'});
    }

    @test 'a route path with a trailing slash still matches'() {
        const route: Route = {
            path: '/clients/',
            method: Method.GET,
            handler: () => {},
        };

        expect(this.gateway['findParams']('/clients', route)).to.deep.equal({});
    }

    @test 'a root-level param route matches a single segment'() {
        const route: Route = {
            path: '/:id',
            method: Method.GET,
            handler: () => {},
        };

        expect(this.gateway['findParams']('/42', route)).to.deep.equal({id: '42'});
    }

    @test 'params are taken verbatim without URL-decoding'() {
        const route: Route = {
            path: '/clients/:name',
            method: Method.GET,
            handler: () => {},
        };

        expect(this.gateway['findParams']('/clients/a%20b', route)).to.deep.equal({name: 'a%20b'});
    }

    @test 'an empty path segment must match a literal empty segment'() {
        const route: Route = {
            path: '/a//b',
            method: Method.GET,
            handler: () => {},
        };

        expect(this.gateway['findParams']('/a//b', route)).to.deep.equal({});
        expect(this.gateway['findParams']('/a/x/b', route)).to.be.null;
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
        const rep = new REPServer({
            port: 0,
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
        const rep = new REPServer({
            port: 0,
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

    @test 'a fully-literal tie picks the first registered route'() {
        const first: Route = {
            path: '/a/b',
            method: Method.GET,
            handler: () => {},
        };
        const second: Route = {
            path: '/a/b',
            method: Method.GET,
            handler: () => {},
        };

        this.gateway['routes'] = [first, second];

        expect(this.gateway['findRoute']('/a/b', Method.GET)).to.equal(first);
    }
}
