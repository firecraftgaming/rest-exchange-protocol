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
            path: '/clients/:clientID',
            method: Method.GET,
            handler: () => {
                return 'Hello World';
            },
        },
        {
            path: '/clients/:clientID',
            method: Method.CREATE,
            handler: () => {
                throw new WebError('Hello World', 400);
            },
        },
        {
            path: '/clients/:clientID',
            method: Method.UPDATE,
            handler: () => {
                return 'Updated';
            },
        },
        {
            path: '/clients/:clientID',
            method: Method.ACTION,
            handler: () => {
                return 'Acted';
            },
        },
        {
            path: '/clients/:clientID',
            method: Method.DELETE,
            handler: () => {
                return 'Deleted';
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

    @test async 'test http server mock websocket'() {
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

    @test async 'test http server mock websocket error'() {
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

    @test async 'test http server PATCH maps to UPDATE'() {
        const req = new TestableRequest('PATCH', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        req.send();
        await res.waitForResponse();

        expect(res.status).to.equal(200);
        expect(JSON.parse(res.result)).to.deep.equal({data: 'Updated'});
    }

    @test async 'test http server POST maps to ACTION'() {
        const req = new TestableRequest('POST', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        req.send();
        await res.waitForResponse();

        expect(res.status).to.equal(200);
        expect(JSON.parse(res.result)).to.deep.equal({data: 'Acted'});
    }

    @test async 'test http server DELETE maps to DELETE'() {
        const req = new TestableRequest('DELETE', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        req.send();
        await res.waitForResponse();

        expect(res.status).to.equal(200);
        expect(JSON.parse(res.result)).to.deep.equal({data: 'Deleted'});
    }

    @test async 'test http server accepts a REP method name as the HTTP verb'() {
        const req = new TestableRequest('ACTION', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        req.send();
        await res.waitForResponse();

        expect(res.status).to.equal(200);
        expect(JSON.parse(res.result)).to.deep.equal({data: 'Acted'});
    }

    @test async 'test http server unmapped method returns 405'() {
        const req = new TestableRequest('TRACE', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        req.send();
        await res.waitForResponse();

        expect(res.status).to.equal(405);
        expect(JSON.parse(res.result)).to.deep.equal({error: 'Method not allowed'});
    }
}