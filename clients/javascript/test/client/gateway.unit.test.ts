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