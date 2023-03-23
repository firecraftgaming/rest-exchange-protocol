import {should, suite, test} from '@firecraftgaming/binary-structured-objects/test';
import {Method, Route} from '../../../src/route';
import {expect} from 'chai';
import {WebError} from '../../../src/error';
import {HTTPServer} from '../../../src/http/server';
import {TestableRequest, TestableResponse} from '../../utility/http.mock';
import {REPServer} from '../../../src';

should;
@suite class ApiHTTPServerUnitTests {

    private static routes: Route[] = [
        {
            path: '/clients/$clientID',
            method: Method.GET,
            exec: () => {
                return 'Hello World';
            },
        },
        {
            path: '/clients/$clientID',
            method: Method.CREATE,
            exec: () => {
                throw new WebError('Hello World', 400);
            },
        },
    ];

    private server: HTTPServer;

    before() {
        const rep = new REPServer({
            port: 0,
        });
        this.server = rep['httpServer'];
        rep['gateway']['routes'] = ApiHTTPServerUnitTests.routes;
    }

    after() {
        this.server.stop();
    }

    @test async 'test websocket server mock websocket'() {
        const req = new TestableRequest('GET', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);

        const result = {
            data: 'Hello World',
        };

        req.send();

        await res.waitForResponse();

        expect(res.status).to.equal(200);
        expect(JSON.parse(res.result)).to.deep.equal(result);
    }

    @test async 'test websocket server mock websocket error'() {
        const req = new TestableRequest('PUT', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);

        const result = {
            error: 'Hello World',
        };

        req.send();

        await res.waitForResponse();

        expect(res.status).to.equal(400);
        expect(JSON.parse(res.result)).to.deep.equal(result);
    }
}