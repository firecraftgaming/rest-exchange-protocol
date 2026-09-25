import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {Method, Route} from '../../../src/server/route';
import {TestableResponder, TestableResponderResult} from '../utility/responder.mock';
import {MiddlewareProhibitFurtherExecution, WebError} from '../../../src/shared/error';
import {REPServer} from '../../../src/server';
import {Gateway} from '../../../src/server/gateway';
import {MiddleWareData} from '../../../src/server/server';
import {Client} from '../../../src/server/client';

should;
@suite class ApiGatewayExecuteUnitTests {
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
    ];

    private gateway: Gateway;
    before() {
        const rep = new REPServer({
            port: 0,
        });
        this.gateway = rep['gateway'];
        this.gateway['routes'] = ApiGatewayExecuteUnitTests.routes;
    }

    @test async 'test execute route 1'() {
        const url = '/clients/1234?test=5678';
        const responder = new TestableResponder();
        await this.gateway.execute(url, Method.GET, responder);
        expect(responder.result).to.deep.equal({
            params: {clientID: '1234'},
            query: {test: '5678'},

            response: {
                success: true,
                data: 'Hello World',
            },
        } as TestableResponderResult);
    }

    @test async 'test execute route 2'() {
        const url = '/clients/1234';
        const responder = new TestableResponder();
        await this.gateway.execute(url, Method.GET, responder);
        expect(responder.result).to.deep.equal({
            params: {clientID: '1234'},
            query: {},

            response: {
                success: true,
                data: 'Hello World',
            },
        } as TestableResponderResult);
    }

    @test async 'test execute route 3'() {
        const url = '/clients/1234/other';
        const responder = new TestableResponder();
        await this.gateway.execute(url, Method.GET, responder);
        expect(responder.result).to.deep.equal({
            params: {clientID: '1234'},
            query: {},

            response: {
                success: false,
                error: {
                    type: 'Internal Server Error',
                    status: 500,
                },
            },
        } as TestableResponderResult);
    }

    @test async 'test execute route 4'() {
        const url = '/clients/1234';
        const responder = new TestableResponder();
        await this.gateway.execute(url, Method.DELETE, responder);
        expect(responder.result).to.deep.equal({
            params: {clientID: '1234'},
            query: {},

            response: {
                success: false,
                error: {
                    type: 'Hello World',
                    status: 400,
                },
            },
        } as TestableResponderResult);
    }

    @test async 'test execute route 5'() {
        const url = '/api';
        const responder = new TestableResponder();
        await this.gateway.execute(url, Method.GET, responder);
        expect(responder.result).to.deep.equal({
            params: {},
            query: {},

            response: {
                success: false,
                error: {
                    type: 'Not Found',
                    status: 404,
                },
            },
        } as TestableResponderResult);
    }
}

@suite class ApiGatewayRegisterUnitTests {
    private gateway: Gateway;
    before() {
        const rep = new REPServer({
            port: 0,
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

@suite class ApiGatewayExecuteMiddlewareUnitTests {
    private rep: REPServer;
    private gateway: Gateway;
    before() {
        this.rep = new REPServer({port: 0});
        this.gateway = this.rep['gateway'];
    }

    @test async 'pre-route middleware sees the route and a responder with params/query already set'() {
        let seen: MiddleWareData;
        this.rep.use((data) => {
            seen = data;
        });
        this.gateway.register({path: '/clients/:id', method: Method.GET, handler: () => 'Hello'});

        const responder = new TestableResponder();
        await this.gateway.execute('/clients/1?x=2', Method.GET, responder);

        expect(seen.type).to.equal('pre-route');
        if (seen.type !== 'pre-route') return;
        expect(seen.route.path).to.equal('/clients/:id');
        expect(seen.responder.getParams()).to.deep.equal({id: '1'});
        expect(seen.responder.getQuery()).to.deep.equal({x: '2'});
    }

    @test async 'middleware throwing a WebError replies with that status, and the handler never runs'() {
        let handlerCalled = false;
        this.rep.use(() => {
            throw new WebError('Blocked', 403);
        });
        this.gateway.register({path: '/clients', method: Method.GET, handler: () => {
            handlerCalled = true;
        }});

        const responder = new TestableResponder();
        await this.gateway.execute('/clients', Method.GET, responder);

        expect(handlerCalled).to.be.false;
        expect(responder.result.response).to.deep.equal({
            success: false,
            error: {type: 'Blocked', status: 403},
        });
    }

    @test async 'middleware throwing a plain error replies with 500'() {
        this.rep.use(() => {
            throw new Error('boom');
        });
        this.gateway.register({path: '/clients', method: Method.GET, handler: () => {}});

        const responder = new TestableResponder();
        await this.gateway.execute('/clients', Method.GET, responder);

        expect(responder.result.response).to.deep.equal({
            success: false,
            error: {type: 'Internal Server Error', status: 500},
        });
    }

    @test async 'middleware throwing MiddlewareProhibitFurtherExecution sends no response and the handler never runs'() {
        let handlerCalled = false;
        this.rep.use(() => {
            throw new MiddlewareProhibitFurtherExecution();
        });
        this.gateway.register({path: '/clients', method: Method.GET, handler: () => {
            handlerCalled = true;
        }});

        const responder = new TestableResponder();
        await this.gateway.execute('/clients', Method.GET, responder);

        expect(handlerCalled).to.be.false;
        expect(responder.result.response).to.be.undefined;
    }
}

@suite class ApiGatewayExecuteHandlerUnitTests {
    private gateway: Gateway;
    before() {
        const rep = new REPServer({port: 0});
        this.gateway = rep['gateway'];
    }

    @test async 'an async handler is awaited and its resolved value is the response'() {
        this.gateway.register({path: '/clients', method: Method.GET, handler: async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            return 'Delayed';
        }});

        const responder = new TestableResponder();
        await this.gateway.execute('/clients', Method.GET, responder);

        expect(responder.result.response).to.deep.equal({success: true, data: 'Delayed'});
    }

    @test async 'a handler returning undefined replies with undefined data'() {
        this.gateway.register({path: '/clients', method: Method.GET, handler: () => undefined});

        const responder = new TestableResponder();
        await this.gateway.execute('/clients', Method.GET, responder);

        expect(responder.result.response).to.deep.equal({success: true, data: undefined});
    }

    @test async 'a handler throwing MiddlewareProhibitFurtherExecution still replies with 500'() {
        this.gateway.register({path: '/clients', method: Method.GET, handler: () => {
            throw new MiddlewareProhibitFurtherExecution();
        }});

        const responder = new TestableResponder();
        await this.gateway.execute('/clients', Method.GET, responder);

        expect(responder.result.response).to.deep.equal({
            success: false,
            error: {type: 'Internal Server Error', status: 500},
        });
    }

    @test async 'the handler receives data, params, and query through the Request'() {
        let seen: {data: unknown; params: unknown; query: unknown};
        this.gateway.register({path: '/clients/:id', method: Method.GET, handler: (request) => {
            seen = {data: request.data, params: request.params, query: request.query};
        }});

        const responder = new TestableResponder({hello: 'world'});
        await this.gateway.execute('/clients/1?x=2', Method.GET, responder);

        expect(seen).to.deep.equal({data: {hello: 'world'}, params: {id: '1'}, query: {x: '2'}});
    }

    @test async 'the handler receives the client via the Request'() {
        const client = new Client();
        let seenClient: Client;
        this.gateway.register({path: '/clients', method: Method.GET, handler: (request) => {
            seenClient = request.client as Client;
        }});

        const responder = new TestableResponder(null, client);
        await this.gateway.execute('/clients', Method.GET, responder);

        expect(seenClient).to.equal(client);
    }

    @test async 'an unknown method on an existing path replies with 404'() {
        this.gateway.register({path: '/clients/:id', method: Method.GET, handler: () => {}});

        const responder = new TestableResponder();
        await this.gateway.execute('/clients/1', Method.DELETE, responder);

        expect(responder.result.response).to.deep.equal({
            success: false,
            error: {type: 'Not Found', status: 404},
        });
    }
}
