import {should, suite, test} from './utility';
import {expect} from 'chai';
import {REPServer} from '../../src/server';
import {REPClient} from '../../src/client';
import {WebError} from '../../src/shared/error';

should;

function waitFor(condition: () => boolean, timeoutMs = 2000) {
    return new Promise<void>((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            if (condition()) return resolve();
            if (Date.now() - start > timeoutMs) return reject(new Error('Timed out waiting for condition'));
            setTimeout(check, 5);
        };
        check();
    });
}

async function startServer() {
    const rep = new REPServer({port: 0, host: '127.0.0.1'});
    await rep.start();

    const port = (rep['httpServer']['server'].address() as any).port;
    return {rep, port};
}

@suite class RestExchangeHTTPE2ETests {
    private rep: REPServer;
    private client: REPClient;
    before(done) {
        startServer().then(({rep, port}) => {
            this.rep = rep;
            this.client = new REPClient({host: `127.0.0.1:${port}`, transport: 'http'});

            this.rep.get('/items/:id', (request) => ({id: request.params.id, query: request.query}));
            this.rep.create('/items', (request) => ({created: request.data}));
            this.rep.update('/items/:id', (request) => ({updated: request.params.id}));
            this.rep.action('/items/:id/activate', () => ({activated: true}));
            this.rep.delete('/items/:id', (request) => ({deleted: request.params.id}));
            this.rep.get('/broken', () => {
                throw new WebError('Nope', 403);
            });

            done();
        }).catch(done);
    }

    after() {
        this.rep.stop();
    }

    @test async 'GET returns params and query'() {
        const result = await this.client.request('/items/42?verbose=1', 'GET', {});
        expect(result).to.deep.equal({id: '42', query: {verbose: '1'}});
    }

    @test async 'CREATE sends the JSON body through to the handler'() {
        const result = await this.client.request('/items', 'CREATE', {name: 'widget'});
        expect(result).to.deep.equal({created: {name: 'widget'}});
    }

    @test async 'UPDATE reaches the route by id'() {
        const result = await this.client.request('/items/7', 'UPDATE', {});
        expect(result).to.deep.equal({updated: '7'});
    }

    @test async 'ACTION reaches a nested path'() {
        const result = await this.client.request('/items/7/activate', 'ACTION', {});
        expect(result).to.deep.equal({activated: true});
    }

    @test async 'DELETE reaches the route by id'() {
        const result = await this.client.request('/items/7', 'DELETE', {});
        expect(result).to.deep.equal({deleted: '7'});
    }

    @test async 'a 404 surfaces as a WebError on the client'() {
        await this.client.request('/nowhere', 'GET', {})
            .then(() => expect.fail('Should have rejected'))
            .catch((e: WebError) => {
                expect(e).to.be.instanceOf(WebError);
                expect(e.status).to.equal(404);
            });
    }

    @test async 'a handler WebError surfaces with its own status and message'() {
        await this.client.request('/broken', 'GET', {})
            .then(() => expect.fail('Should have rejected'))
            .catch((e: WebError) => {
                expect(e.status).to.equal(403);
                expect(e.type).to.equal('Nope');
            });
    }
}

@suite class RestExchangeWebsocketE2ETests {
    private rep: REPServer;
    private client: REPClient;
    before(done) {
        startServer().then(({rep, port}) => {
            this.rep = rep;
            this.client = new REPClient({host: `127.0.0.1:${port}`, transport: 'ws'});

            this.rep.get('/items/:id', (request) => ({id: request.params.id}));
            this.rep.get('/broken', () => {
                throw new WebError('Nope', 403);
            });

            done();
        }).catch(done);
    }

    after() {
        this.rep.stop();
        this.client.disconnect();
    }

    @test async 'a ws request round-trips through the real server'() {
        this.client.connect();
        await waitFor(() => this.client['connected_']);

        const result = await this.client.request('/items/9', 'GET', {});
        expect(result).to.deep.equal({id: '9'});
    }

    @test async 'a handler WebError rejects the ws request with a WebError'() {
        this.client.connect();
        await waitFor(() => this.client['connected_']);

        await this.client.request('/broken', 'GET', {})
            .then(() => expect.fail('Should have rejected'))
            .catch((e: WebError) => {
                expect(e.status).to.equal(403);
                expect(e.type).to.equal('Nope');
            });
    }

    @test async 'a call=false request is fire-and-forget but still reaches the handler'() {
        let handlerCalled = false;
        this.rep.get('/ping', () => {
            handlerCalled = true;
        });

        this.client.connect();
        await waitFor(() => this.client['connected_']);

        const result = await this.client.request('/ping', 'GET', {}, 'ws', false);
        expect(result).to.be.undefined;

        await waitFor(() => handlerCalled);
    }

    @test async 'the server can push a request to a registered client route'() {
        let seenOnClient: unknown;
        this.client.routes.get('/notify', (request) => {
            seenOnClient = request.data;
            return 'ack';
        });

        this.client.connect();
        await waitFor(() => this.client['connected_']);
        await waitFor(() => this.rep.getClients().length === 1);

        const serverSideClient = this.rep.getClients()[0] as any;
        const result = await serverSideClient.send('/notify', 'GET', {hello: 'world'});

        expect(seenOnClient).to.deep.equal({hello: 'world'});
        expect(result).to.equal('ack');
    }

    @test async 'the server can reach a passive listener registered on the client'() {
        let seenOnClient: unknown;
        this.client.routes.listen('GET', '/events', (request) => {
            seenOnClient = request.data;
        });

        this.client.connect();
        await waitFor(() => this.client['connected_']);
        await waitFor(() => this.rep.getClients().length === 1);

        const serverSideClient = this.rep.getClients()[0] as any;
        await serverSideClient.send('/events', 'GET', {tag: 'passive'}, false);

        await waitFor(() => seenOnClient !== undefined);
        expect(seenOnClient).to.deep.equal({tag: 'passive'});
    }

    @test async 'disconnecting rejects any in-flight request'() {
        this.client.connect();
        await waitFor(() => this.client['connected_']);

        const promise = this.client.request('/items/1', 'GET', {});
        this.client.disconnect();

        await promise
            .then(() => expect.fail('Should have rejected'))
            .catch((e: WebError) => expect(e.type).to.equal('Disconnected'));
    }

    @test async 'connecting twice replaces the socket and the new connection still works'() {
        this.client.connect();
        await waitFor(() => this.client['connected_']);

        this.client.connect();
        await waitFor(() => this.client['connected_']);

        const result = await this.client.request('/items/5', 'GET', {});
        expect(result).to.deep.equal({id: '5'});
    }

}

@suite class RestExchangeDeadConnectionE2ETests {
    @test async 'connecting to a closed port fails without crashing the process'() {
        const deadClient = new REPClient({host: '127.0.0.1:1'});
        deadClient.connect();

        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(deadClient['connected_']).to.not.be.true;

        deadClient.disconnect();
    }
}
