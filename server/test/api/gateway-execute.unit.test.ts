import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {Method, Route} from '../../src/route';
import {TestableResponder, TestableResponderResult} from '../utility/responder.mock';
import {WebError} from '../../src/error';
import {REPServer} from '../../src';
import {Gateway} from '../../src/gateway';

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
