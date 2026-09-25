import {should, suite, test} from '../../utility';
import {Method} from '../../../../src/server/route';
import {expect} from 'chai';
import {MiddlewareProhibitFurtherExecution, WebError} from '../../../../src/shared/error';
import {WebsocketServer} from '../../../../src/server/ws/server';
import {TestableWebsocket, TestableWebsocketClient} from '../../utility/websocket.mock';
import {REPServer} from '../../../../src/server';
import {MiddleWareData} from '../../../../src/server/server';

should;
@suite class ApiWebsocketServerPingUnitTests {
    private rep: REPServer;
    private server: WebsocketServer;
    before() {
        this.rep = new REPServer({port: 0});
        this.server = this.rep['wsServer'];
    }

    @test async 'a PING string replies with PONG without touching middleware'() {
        let middlewareCalled = false;
        this.rep.use(() => {
            middlewareCalled = true;
        });

        const socket = new TestableWebsocket();
        const client = new TestableWebsocketClient(socket);

        await this.server['onMessage']('PING', client);
        expect(socket.messages).to.deep.equal(['PONG']);
        expect(middlewareCalled).to.be.false;
    }

    @test async 'a PING buffer replies with PONG'() {
        const socket = new TestableWebsocket();
        const client = new TestableWebsocketClient(socket);

        await this.server['onMessage'](Buffer.from('PING'), client);
        expect(socket.messages).to.deep.equal(['PONG']);
    }
}

@suite class ApiWebsocketServerMessageParsingUnitTests {
    private server: WebsocketServer;
    before() {
        const rep = new REPServer({port: 0});
        rep['gateway']['routes'] = [{
            path: '/clients/:id',
            method: Method.GET,
            handler: () => 'Hello World',
        }];
        this.server = rep['wsServer'];
    }

    @test async 'a buffer containing JSON is parsed the same as a string'() {
        const message = {method: 'GET', target: '/clients/123', req: '123'};
        const client = new TestableWebsocketClient();

        await this.server['onMessage'](Buffer.from(JSON.stringify(message)), client);
        expect(client.result.data).to.deep.equal({status: 200, data: 'Hello World'});
    }

    @test async 'invalid JSON raises a 400 invalid request from the connection handler'() {
        const websocket = new TestableWebsocket();
        this.server['onConnection'](websocket, {
            socket: {remoteAddress: '0.0.0.0'},
        } as any);

        websocket.events.emit('message', 'not json');

        await websocket.waitForMessage();
        const result = JSON.parse(websocket.result as string);
        expect(result.data.status).to.equal(400);
        expect(result.data.error).to.equal('Invalid request');
    }
}

@suite class ApiWebsocketServerReplyFrameUnitTests {
    private server: WebsocketServer;
    before() {
        const rep = new REPServer({port: 0});
        this.server = rep['wsServer'];
    }

    @test async 'a lowercase reply method is accepted'() {
        const client = new TestableWebsocketClient();
        let resolvedReq: string;
        client['resolveRequest'] = (req: string) => {
            resolvedReq = req;
        };

        await this.server['onMessage'](JSON.stringify({method: 'reply', req: '123'}), client);
        expect(resolvedReq).to.equal('123');
    }

    @test async 'a reply frame without a req throws Missing request id'() {
        const client = new TestableWebsocketClient();

        await this.server['onMessage'](JSON.stringify({method: 'REPLY'}), client)
            .then(() => expect.fail('Should have thrown'))
            .catch((e) => {
                expect(e.type).to.equal('Missing request id');
                expect(e.status).to.equal(400);
            });
    }

    @test async 'a reply frame resolves the matching pending client.send call'() {
        const socket = new TestableWebsocket();
        const client = new TestableWebsocketClient(socket);

        const promise = client.send('/target', 'GET' as any, {});
        const req = JSON.parse(socket.messages[0] as string).req;

        await this.server['onMessage'](JSON.stringify({method: 'REPLY', req, data: {status: 200, data: 'ok'}}), client);
        expect(await promise).to.equal('ok');
    }
}

@suite class ApiWebsocketServerRoutingUnitTests {
    private server: WebsocketServer;
    before() {
        const rep = new REPServer({port: 0});
        this.server = rep['wsServer'];
    }

    @test async 'an unmatched route replies on the error target with a 404'() {
        const client = new TestableWebsocketClient();
        const message = {method: 'GET', target: '/nowhere', req: '123'};

        await this.server['onMessage'](JSON.stringify(message), client);
        expect(client.result.target).to.equal('error');
        expect(client.result.data).to.deep.equal({status: 404, error: 'Not Found'});
    }
}

@suite class ApiWebsocketServerLifecycleMiddlewareUnitTests {
    @test async 'a websocket-message middleware throwing Prohibit sends no reply'() {
        const rep = new REPServer({port: 0});
        rep['gateway']['routes'] = [{
            path: '/clients/:id',
            method: Method.GET,
            handler: () => 'Hello World',
        }];
        rep.use((data: MiddleWareData) => {
            if (data.type === 'websocket-message') throw new MiddlewareProhibitFurtherExecution();
        });

        const server = rep['wsServer'];
        const websocket = new TestableWebsocket();
        server['onConnection'](websocket, {socket: {remoteAddress: '0.0.0.0'}} as any);

        websocket.events.emit('message', JSON.stringify({method: 'GET', target: '/clients/123', req: '1'}));

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(websocket.messages.length).to.equal(0);
    }

    @test async 'a websocket-connect middleware throwing closes the socket and destroys the client'() {
        const rep = new REPServer({port: 0});
        rep.use((data: MiddleWareData) => {
            if (data.type === 'websocket-connect') throw new WebError('Nope', 403);
        });

        const server = rep['wsServer'];
        const websocket = new TestableWebsocket();
        server['onConnection'](websocket, {socket: {remoteAddress: '0.0.0.0'}} as any);

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(websocket.closed).to.be.true;
        expect(rep.getClients()).to.deep.equal([]);
    }

    @test async 'a websocket-close middleware receives the preceding connection error'() {
        const rep = new REPServer({port: 0});
        let seenError: Error;
        rep.use((data: MiddleWareData) => {
            if (data.type === 'websocket-close') seenError = data.error;
        });

        const server = rep['wsServer'];
        const websocket = new TestableWebsocket();
        server['onConnection'](websocket, {socket: {remoteAddress: '0.0.0.0'}} as any);

        const connectionError = new Error('dropped');
        websocket.events.emit('error', connectionError);
        websocket.events.emit('close', 1000);

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(seenError).to.equal(connectionError);
    }

    @test async 'a throwing websocket-close middleware still destroys the client'() {
        const rep = new REPServer({port: 0});
        rep.use((data: MiddleWareData) => {
            if (data.type === 'websocket-close') throw new Error('boom');
        });

        const server = rep['wsServer'];
        const websocket = new TestableWebsocket();
        server['onConnection'](websocket, {socket: {remoteAddress: '0.0.0.0'}} as any);

        await new Promise((resolve) => setTimeout(resolve, 10));
        const client = rep.getClients()[0];
        websocket.events.emit('close', 1000);

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(rep.getClient(client.id)).to.be.undefined;
    }
}

@suite class ApiWebsocketServerClientCloseUnitTests {
    @test async 'closing the connection rejects any pending sends on that client'() {
        const rep = new REPServer({port: 0});

        const server = rep['wsServer'];
        const websocket = new TestableWebsocket();
        server['onConnection'](websocket, {socket: {remoteAddress: '0.0.0.0'}} as any);

        await new Promise((resolve) => setTimeout(resolve, 10));
        const client = rep.getClients()[0] as any;
        const promise = client.send('/target', 'GET', {});

        websocket.events.emit('close', 1000);

        await promise
            .then(() => expect.fail('Should have rejected'))
            .catch((e) => {
                expect(e).to.be.instanceOf(WebError);
                expect(e.type).to.equal('Client disconnected');
            });
    }
}
