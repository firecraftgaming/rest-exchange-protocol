import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {MiddlewareProhibitFurtherExecution, WebError} from '../../../src/shared/error';
import {REPClient} from '../../../src/client';
import {TestableSocket} from '../utility/socket.mock';
import axios from 'axios';

should;

@suite class ClientPendingRequestUnitTests {
    private client: REPClient;
    private socket: TestableSocket;
    before() {
        this.client = new REPClient({
            host: 'localhost',
        });

        this.socket = new TestableSocket();
        this.client['socket'] = this.socket as any;
        this.client['connected_'] = true;
    }

    @test async 'test error-status reply rejects the pending request'() {
        const promise = this.client['requestWs']('/clients/123', 'GET', {});
        const req = JSON.parse(this.socket.sent[0]).req;

        this.client['onMessage']({
            data: JSON.stringify({
                method: 'REPLY',
                req,
                data: {
                    status: 404,
                    error: 'Not Found',
                },
            }),
        } as any);

        try {
            await promise;
            expect.fail('Should have rejected');
        } catch (e) {
            expect(e).to.be.instanceOf(WebError);
            expect(e.type).to.equal('Not Found');
            expect(e.status).to.equal(404);
        }
    }

    @test async 'test pending requests reject on close'() {
        const promise = this.client['requestWs']('/clients/123', 'GET', {});

        this.client['onClose']();

        try {
            await promise;
            expect.fail('Should have rejected');
        } catch (e) {
            expect(e).to.be.instanceOf(WebError);
            expect(e.type).to.equal('Disconnected');
        }
    }

}

@suite class ClientRequestMethodAliasUnitTests {
    private client: REPClient;
    before() {
        this.client = new REPClient({
            host: 'localhost',
            transport: 'http',
        });
    }

    @test 'test request rejects an invalid method'() {
        expect(() => this.client.request('/clients/123', 'ABC', {})).to.throw('Invalid method');
    }

    @test async 'test request normalizes an HTTP alias to its REP method'() {
        let calledWith: string;
        this.client['requestHttp'] = (path, method) => {
            calledWith = method;
            return Promise.resolve();
        };

        await this.client.request('/clients/123', 'PUT', {});
        expect(calledWith).to.equal('CREATE');
    }

    @test async 'test request accepts a REP method unchanged'() {
        let calledWith: string;
        this.client['requestHttp'] = (path, method) => {
            calledWith = method;
            return Promise.resolve();
        };

        await this.client.request('/clients/123', 'CREATE', {});
        expect(calledWith).to.equal('CREATE');
    }

    @test async 'test request normalizes an HTTP alias over the websocket transport'() {
        let calledWith: string;
        this.client['requestWs'] = (path, method) => {
            calledWith = method;
            return Promise.resolve();
        };

        await this.client.request('/clients/123', 'POST', {}, {transport: 'ws', call: false});
        expect(calledWith).to.equal('ACTION');
    }
}

@suite class ClientRequestTransportSelectionUnitTests {
    private client: REPClient;
    before() {
        this.client = new REPClient({host: 'localhost'});
    }

    @test async 'transport both uses the websocket transport once connected'() {
        let usedWs = false;
        this.client['requestWs'] = () => {
            usedWs = true;
            return Promise.resolve();
        };
        this.client['requestHttp'] = () => Promise.resolve();
        this.client['connected_'] = true;

        await this.client.request('/clients/123', 'GET', {});
        expect(usedWs).to.be.true;
    }

    @test async 'transport both falls back to http when not connected'() {
        let usedHttp = false;
        this.client['requestHttp'] = () => {
            usedHttp = true;
            return Promise.resolve();
        };

        await this.client.request('/clients/123', 'GET', {});
        expect(usedHttp).to.be.true;
    }

    @test async 'an explicit per-call transport overrides the default'() {
        let usedHttp = false;
        this.client['requestHttp'] = () => {
            usedHttp = true;
            return Promise.resolve();
        };
        this.client['connected_'] = true;

        await this.client.request('/clients/123', 'GET', {}, {transport: 'http'});
        expect(usedHttp).to.be.true;
    }

    @test async 'call=false over the ws transport resolves undefined and sends no req'() {
        const socket = new TestableSocket();
        this.client['socket'] = socket as any;
        this.client['connected_'] = true;

        const result = await this.client.request('/clients/123', 'GET', {}, {transport: 'ws', call: false});
        expect(result).to.be.undefined;
        expect(JSON.parse(socket.sent[0]).req).to.be.undefined;
        expect(this.client['requests'].size).to.equal(0);
    }
}

@suite class ClientRequestWsUnitTests {
    @test 'requestWs rejects immediately when the client is not connected'() {
        const client = new REPClient({host: 'localhost'});
        return client['requestWs']('/clients/123', 'GET', {})
            .then(() => expect.fail('Should have rejected'))
            .catch((e: Error) => expect(e.message).to.equal('Not connected'));
    }
}

@suite class ClientRequestHttpUnitTests {
    private client: REPClient;
    private originalRequest: typeof axios.request;
    before() {
        this.client = new REPClient({host: 'localhost'});
        this.originalRequest = axios.request;
    }

    after() {
        axios.request = this.originalRequest;
    }

    @test async 'a path without a leading slash gets one added'() {
        let calledUrl: string;
        axios.request = ((options: any) => {
            calledUrl = options.url;
            return Promise.resolve({data: {data: null}});
        }) as any;

        await this.client['requestHttp']('clients/123', 'GET', {});
        expect(calledUrl).to.equal('http://localhost/clients/123');
    }

    @test async 'secure option uses https'() {
        const client = new REPClient({host: 'localhost', secure: true});
        let calledUrl: string;
        axios.request = ((options: any) => {
            calledUrl = options.url;
            return Promise.resolve({data: {data: null}});
        }) as any;

        await client['requestHttp']('/clients/123', 'GET', {});
        expect(calledUrl).to.equal('https://localhost/clients/123');
    }

    @test async 'each REP method maps to its HTTP verb'() {
        const expected: Record<string, string> = {
            GET: 'GET',
            CREATE: 'PUT',
            DELETE: 'DELETE',
            UPDATE: 'PATCH',
            ACTION: 'POST',
        };

        for (const [method, httpMethod] of Object.entries(expected)) {
            let calledMethod: string;
            axios.request = ((options: any) => {
                calledMethod = options.method;
                return Promise.resolve({data: {data: null}});
            }) as any;

            await this.client['requestHttp']('/clients/123', method, {});
            expect(calledMethod).to.equal(httpMethod);
        }
    }

    @test async 'the body is JSON-stringified'() {
        let calledData: string;
        axios.request = ((options: any) => {
            calledData = options.data;
            return Promise.resolve({data: {data: null}});
        }) as any;

        await this.client['requestHttp']('/clients/123', 'GET', {hello: 'world'});
        expect(calledData).to.equal(JSON.stringify({hello: 'world'}));
    }

    @test async 'resolves with response.data.data'() {
        axios.request = (() => Promise.resolve({data: {data: 'Hello World'}})) as any;

        const result = await this.client['requestHttp']('/clients/123', 'GET', {});
        expect(result).to.equal('Hello World');
    }

    @test 'a server error response is translated into a WebError'() {
        axios.request = (() => Promise.reject({
            response: {status: 404, data: {error: 'Not Found'}},
        })) as any;

        return this.client['requestHttp']('/clients/123', 'GET', {})
            .then(() => expect.fail('Should have rejected'))
            .catch((e: WebError) => {
                expect(e).to.be.instanceOf(WebError);
                expect(e.type).to.equal('Not Found');
                expect(e.status).to.equal(404);
            });
    }

    @test 'a network error with no response falls back to a 500 Internal Server Error'() {
        axios.request = (() => Promise.reject(new Error('network down'))) as any;

        return this.client['requestHttp']('/clients/123', 'GET', {})
            .then(() => expect.fail('Should have rejected'))
            .catch((e: WebError) => {
                expect(e.type).to.equal('Internal Server Error');
                expect(e.status).to.equal(500);
            });
    }

}

@suite class ClientOnMessageUnitTests {
    private client: REPClient;
    private socket: TestableSocket;
    before() {
        this.client = new REPClient({host: 'localhost'});
        this.socket = new TestableSocket();
        this.client['socket'] = this.socket as any;
        this.client['connected_'] = true;
    }

    @test async 'a success-status reply resolves the pending request'() {
        const promise = this.client['requestWs']('/clients/123', 'GET', {});
        const req = JSON.parse(this.socket.sent[0]).req;

        await this.client['onMessage']({
            data: JSON.stringify({method: 'REPLY', req, data: {status: 200, data: 'Hello'}}),
        } as any);

        expect(await promise).to.equal('Hello');
    }

    @test async 'a lowercase reply method is still handled'() {
        const promise = this.client['requestWs']('/clients/123', 'GET', {});
        const req = JSON.parse(this.socket.sent[0]).req;

        await this.client['onMessage']({
            data: JSON.stringify({method: 'reply', req, data: {status: 200, data: 'Hello'}}),
        } as any);

        expect(await promise).to.equal('Hello');
    }

    @test async 'a reply with a missing envelope rejects with a 500 malformed reply'() {
        const promise = this.client['requestWs']('/clients/123', 'GET', {});
        const req = JSON.parse(this.socket.sent[0]).req;

        await this.client['onMessage']({
            data: JSON.stringify({method: 'REPLY', req}),
        } as any);

        await promise
            .then(() => expect.fail('Should have rejected'))
            .catch((e) => {
                expect(e.type).to.equal('Malformed reply');
                expect(e.status).to.equal(500);
            });
    }

    @test async 'a reply for an unknown req is ignored'() {
        await this.client['onMessage']({
            data: JSON.stringify({method: 'REPLY', req: 'unknown', data: {status: 200, data: 1}}),
        } as any);

        expect(this.client['requests'].size).to.equal(0);
    }

    @test async 'a reply with no req is ignored'() {
        let dispatched = false;
        this.client['gateway'].execute = () => {
            dispatched = true;
            return Promise.resolve();
        };

        await this.client['onMessage']({
            data: JSON.stringify({method: 'REPLY', data: {status: 200, data: 1}}),
        } as any);

        expect(dispatched).to.be.false;
        expect(this.client['requests'].size).to.equal(0);
    }

    @test async 'a non-REPLY frame dispatches to gateway.execute'() {
        let seen: unknown[];
        this.client['gateway'].execute = (...args: unknown[]) => {
            seen = args;
            return Promise.resolve();
        };

        await this.client['onMessage']({
            data: JSON.stringify({target: '/clients/1', method: 'GET', data: {a: 1}, req: 'r1'}),
        } as any);

        expect(seen).to.deep.equal(['/clients/1', 'GET', {a: 1}, 'r1']);
    }

    @test async 'invalid JSON is swallowed instead of throwing'() {
        let dispatched = false;
        this.client['gateway'].execute = () => {
            dispatched = true;
            return Promise.resolve();
        };

        await this.client['onMessage']({data: 'not json'} as any);
        expect(dispatched).to.be.false;
    }

    @test async 'websocket-message middleware sees the raw frame data'() {
        let seenData: unknown;
        this.client.use((data) => {
            if (data.type === 'websocket-message') seenData = data.data;
        });

        const raw = JSON.stringify({target: '/x', method: 'GET', data: {}});
        await this.client['onMessage']({data: raw} as any);

        expect(seenData).to.equal(raw);
    }

    @test async 'a websocket-message middleware throwing Prohibit stops dispatch'() {
        let dispatched = false;
        this.client['gateway'].execute = () => {
            dispatched = true;
            return Promise.resolve();
        };
        this.client.use((data) => {
            if (data.type === 'websocket-message') throw new MiddlewareProhibitFurtherExecution();
        });

        await this.client['onMessage']({
            data: JSON.stringify({target: '/x', method: 'GET', data: {}}),
        } as any);

        expect(dispatched).to.be.false;
    }
}

@suite class ClientDisconnectUnitTests {
    @test 'disconnect without a socket is a no-op'() {
        const client = new REPClient({host: 'localhost'});
        expect(() => client.disconnect()).to.not.throw();
    }

    @test 'disconnect closes the socket, clears connected, and rejects pending requests'() {
        const client = new REPClient({host: 'localhost'});
        const socket = new TestableSocket();
        client['socket'] = socket as any;
        client['connected_'] = true;

        const promise = client['requestWs']('/clients/123', 'GET', {});
        client.disconnect();

        expect(socket.closed).to.be.true;
        expect(client['connected_']).to.be.false;

        return promise
            .then(() => expect.fail('Should have rejected'))
            .catch((e: WebError) => expect(e.type).to.equal('Disconnected'));
    }
}

@suite class ClientConnectProtocolUnitTests {
    @test 'the default options connect over ws'() {
        const client = new REPClient({host: 'localhost:1'});
        client.connect();

        expect((client['socket'] as any).url).to.equal('ws://localhost:1/');
        client.disconnect();
    }

    @test 'the secure option connects over wss'() {
        const client = new REPClient({host: 'localhost:1', secure: true});
        client.connect();

        expect((client['socket'] as any).url).to.equal('wss://localhost:1/');
        client.disconnect();
    }

    @test async 'disconnecting immediately after connect, before the handshake settles, does not crash'() {
        const client = new REPClient({host: 'localhost:1'});
        client.connect();
        client.disconnect();

        await new Promise((resolve) => setTimeout(resolve, 50));
    }
}

@suite class ClientRoutesGetterUnitTests {
    @test 'the routes getter is backed by the client gateway'() {
        const client = new REPClient({host: 'localhost'});
        const routes = client.routes;

        const handler = () => {};
        routes.get('/a', handler);

        expect(client['gateway']['routes']).to.deep.equal([{method: 'GET', path: '/a', handler}]);
    }
}
