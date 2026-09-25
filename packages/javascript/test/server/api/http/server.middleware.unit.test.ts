import {should, suite, test} from '../../utility';
import {Method} from '../../../../src/server/route';
import {expect} from 'chai';
import {MiddlewareProhibitFurtherExecution, WebError} from '../../../../src/shared/error';
import {HTTPServer} from '../../../../src/server/http/server';
import {TestableRequest, TestableResponse, TestableUpgradeSocket, wait} from '../../utility/http.mock';
import {REPServer} from '../../../../src/server';
import {MiddleWareData} from '../../../../src/server/server';

should;
@suite class ApiHTTPServerRequestHandlingUnitTests {
    private rep: REPServer;
    private server: HTTPServer;
    before() {
        this.rep = new REPServer({port: 0});
        this.server = this.rep['httpServer'];
        this.rep['gateway']['routes'] = [{
            path: '/clients/:id',
            method: Method.GET,
            handler: (request) => request.data,
        }];
    }

    after() {
        this.server.stop();
    }

    @test async 'OPTIONS replies 204 with no body, without reaching the gateway'() {
        const req = new TestableRequest('OPTIONS', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        await res.waitForResponse();

        expect(res.status).to.equal(204);
        expect(res.result).to.equal('');
    }

    @test async 'a missing method replies with 400'() {
        const req = new TestableRequest('', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        await res.waitForResponse();

        expect(res.status).to.equal(400);
        expect(JSON.parse(res.result)).to.deep.equal({error: 'Missing method'});
    }

    @test async 'a missing url replies with 400'() {
        const req = new TestableRequest('GET', '');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        await res.waitForResponse();

        expect(res.status).to.equal(400);
        expect(JSON.parse(res.result)).to.deep.equal({error: 'Missing url'});
    }

    @test async 'a JSON body reaches the handler as request.data'() {
        const req = new TestableRequest('GET', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        await wait();

        req.setBody(JSON.stringify({hello: 'world'}));
        req.send();
        await res.waitForResponse();

        expect(JSON.parse(res.result)).to.deep.equal({data: {hello: 'world'}});
    }

    @test async 'invalid JSON body resolves to null data instead of failing the request'() {
        const req = new TestableRequest('GET', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        await wait();

        req.setBody('not json');
        req.send();
        await res.waitForResponse();

        expect(res.status).to.equal(200);
        expect(JSON.parse(res.result)).to.deep.equal({data: null});
    }

    @test async 'an empty body resolves to null data'() {
        const req = new TestableRequest('GET', '/clients/123');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        req.send();
        await res.waitForResponse();

        expect(JSON.parse(res.result)).to.deep.equal({data: null});
    }

    @test 'parseBody rejects when the request errors'() {
        const req = new TestableRequest('GET', '/clients/123');
        const promise = this.server['parseBody'](req as any);

        req.emitError(new Error('boom'));
        return promise
            .then(() => expect.fail('Should have rejected'))
            .catch((e) => expect(e.message).to.equal('boom'));
    }

    @test 'parseBody rejects with a WebError when the request is aborted'() {
        const req = new TestableRequest('GET', '/clients/123');
        const promise = this.server['parseBody'](req as any);

        req.emitAborted();
        return promise
            .then(() => expect.fail('Should have rejected'))
            .catch((e) => {
                expect(e).to.be.instanceOf(WebError);
                expect(e.type).to.equal('Request aborted');
                expect(e.status).to.equal(400);
            });
    }
}

@suite class ApiHTTPServerClientLifecycleUnitTests {
    private rep: REPServer;
    private server: HTTPServer;
    before() {
        this.rep = new REPServer({port: 0});
        this.server = this.rep['httpServer'];
    }

    after() {
        this.server.stop();
    }

    @test async 'the handler can read request.client, and it is removed from the manager once the response closes'() {
        let seenClient: any;
        this.rep['gateway']['routes'] = [{
            path: '/clients',
            method: Method.GET,
            handler: (request) => {
                seenClient = request.client;
            },
        }];

        const req = new TestableRequest('GET', '/clients');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        req.send();
        await res.waitForResponse();

        expect(this.rep.getClient(seenClient.id)).to.equal(seenClient);

        res.events.emit('close');
        expect(this.rep.getClient(seenClient.id)).to.be.undefined;
    }
}

@suite class ApiHTTPServerMiddlewareUnitTests {
    private rep: REPServer;
    private server: HTTPServer;
    before() {
        this.rep = new REPServer({port: 0});
        this.server = this.rep['httpServer'];
        this.rep['gateway']['routes'] = [{
            path: '/clients',
            method: Method.GET,
            handler: () => 'Hello',
        }];
    }

    after() {
        this.server.stop();
    }

    @test async 'an http middleware throwing a WebError replies with that status instead of running the gateway'() {
        this.rep.use((data: MiddleWareData) => {
            if (data.type === 'http') throw new WebError('Blocked', 403);
        });

        const req = new TestableRequest('GET', '/clients');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        await res.waitForResponse();

        expect(res.status).to.equal(403);
        expect(JSON.parse(res.result)).to.deep.equal({error: 'Blocked'});
    }

    @test async 'an http middleware throwing a plain error replies with 500'() {
        this.rep.use((data: MiddleWareData) => {
            if (data.type === 'http') throw new Error('boom');
        });

        const req = new TestableRequest('GET', '/clients');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        await res.waitForResponse();

        expect(res.status).to.equal(500);
        expect(JSON.parse(res.result)).to.deep.equal({error: 'Internal Server Error'});
    }

    @test async 'an http middleware throwing MiddlewareProhibitFurtherExecution leaves the response untouched'() {
        this.rep.use((data: MiddleWareData) => {
            if (data.type === 'http') throw new MiddlewareProhibitFurtherExecution();
        });

        const req = new TestableRequest('GET', '/clients');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        await wait();

        expect(res.status).to.equal(0);
        expect(res.result).to.be.null;
    }

    @test async 'http middleware receives the client, request, and response'() {
        let seen: MiddleWareData;
        this.rep.use((data: MiddleWareData) => {
            if (data.type === 'http') seen = data;
        });

        const req = new TestableRequest('GET', '/clients');
        const res = new TestableResponse();

        this.server['onRequest'](req as any, res as any);
        req.send();
        await res.waitForResponse();

        expect(seen.type).to.equal('http');
        if (seen.type !== 'http') return;
        expect(seen.request).to.equal(req);
        expect(seen.response).to.equal(res);
        expect(seen.client.id).to.be.a('string');
    }
}

@suite class ApiHTTPServerUpgradeUnitTests {
    private rep: REPServer;
    private server: HTTPServer;
    before() {
        this.rep = new REPServer({port: 0});
        this.server = this.rep['httpServer'];
    }

    after() {
        this.server.stop();
    }

    @test async 'an upgrade middleware WebError writes an HTTP status line and destroys the socket'() {
        this.rep.use((data: MiddleWareData) => {
            if (data.type === 'websocket-upgrade') throw new WebError('Forbidden', 403);
        });

        const socket = new TestableUpgradeSocket();
        this.server['server'].emit('upgrade', {} as any, socket, Buffer.alloc(0));
        await wait();

        expect(socket.written[0]).to.equal('HTTP/1.1 403 Forbidden\r\n\r\n');
        expect(socket.destroyed).to.be.true;
    }

    @test async 'an upgrade middleware throwing MiddlewareProhibitFurtherExecution leaves the socket untouched'() {
        this.rep.use((data: MiddleWareData) => {
            if (data.type === 'websocket-upgrade') throw new MiddlewareProhibitFurtherExecution();
        });

        const socket = new TestableUpgradeSocket();
        this.server['server'].emit('upgrade', {} as any, socket, Buffer.alloc(0));
        await wait();

        expect(socket.written).to.deep.equal([]);
        expect(socket.destroyed).to.be.false;
    }

    @test async 'a successful upgrade hands the connection to the websocket server'() {
        let handled = false;
        this.server['websocket'].handleRequest = () => {
            handled = true;
        };

        const socket = new TestableUpgradeSocket();
        this.server['server'].emit('upgrade', {} as any, socket, Buffer.alloc(0));
        await wait();

        expect(handled).to.be.true;
    }
}

@suite class ApiHTTPServerErrorForwardingUnitTests {
    private rep: REPServer;
    private server: HTTPServer;
    before() {
        this.rep = new REPServer({port: 0});
        this.server = this.rep['httpServer'];
    }

    after() {
        this.server.stop();
    }

    @test 'a registered error listener receives errors from the underlying server'() {
        let seen: Error;
        this.server.on('error', (e) => {
            seen = e;
        });

        const error = new Error('socket boom');
        this.server['server'].emit('error', error);

        expect(seen).to.equal(error);
    }

    @test 'no listener means the server error is swallowed instead of thrown'() {
        expect(() => this.server['server'].emit('error', new Error('unheard'))).to.not.throw();
    }
}

@suite class ApiHTTPServerStartUnitTests {
    @test async 'start on port 0 resolves once listening'() {
        const rep = new REPServer({port: 0});
        await rep.start();

        expect(rep['httpServer']['server'].address()).to.not.be.null;
        rep.stop();
    }

    @test async 'start rejects when the port is already in use'() {
        const first = new REPServer({port: 0});
        await first.start();

        const port = (first['httpServer']['server'].address() as any).port;
        const second = new REPServer({port});

        await second['httpServer'].start()
            .then(
                () => expect.fail('Should have rejected'),
                (e) => expect(e.code).to.equal('EADDRINUSE'),
            )
            .finally(() => {
                first.stop();
                second.stop();
            });
    }
}
