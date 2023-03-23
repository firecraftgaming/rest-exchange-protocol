import {should, suite, test} from '@firecraftgaming/binary-structured-objects/test';
import {Method, Route} from '../../../src/route';
import {expect} from 'chai';
import {WebError} from '../../../src/error';
import {WebsocketServer} from '../../../src/ws/server';
import {TestableWebsocket, TestableWebsocketClient} from '../../utility/websocket.mock';
import {REPServer} from '../../../src';

should;
@suite class ApiWebsocketServerUnitTests {

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
            method: Method.DELETE,
            exec: () => {
                throw new WebError('Hello World', 400);
            },
        },
    ];

    private server: WebsocketServer;

    before() {
        const rep = new REPServer({
            port: 0,
        });
        rep['gateway']['routes'] = ApiWebsocketServerUnitTests.routes;
        this.server = rep['wsServer'];
    }

    after() {

    }

    @test async 'test websocket server message, no method'() {
        const message = {
            target: '/clients/123',
        };

        try {
            await this.server['onMessage'](JSON.stringify(message), null);
            expect.fail('Should have thrown an error');
        } catch (e) {
            expect(e.type).to.equal('Missing method');
            expect(e.status).to.equal(400);
        }
    }

    @test async 'test websocket server message, no target'() {
        const message = {
            method: Method.GET,
        };

        try {
            await this.server['onMessage'](JSON.stringify(message), null);
            expect.fail('Should have thrown an error');
        } catch (e) {
            expect(e.type).to.equal('Missing target');
            expect(e.status).to.equal(400);
        }
    }

    @test async 'test websocket server message, invalid method'() {
        const message = {
            method: 'ABC',
            target: '/clients/123',
        };

        try {
            await this.server['onMessage'](JSON.stringify(message), null);
            expect.fail('Should have thrown an error');
        } catch (e) {
            expect(e.type).to.equal('Invalid method');
            expect(e.status).to.equal(400);
        }
    }

    @test async 'test websocket server message, lower case method'() {
        const message = {
            method: 'get',
            target: '/clients/123',
            req: '123',
        };

        const client = new TestableWebsocketClient();

        await this.server['onMessage'](JSON.stringify(message), client);
        expect(client.messages.length).to.equal(1);
        expect(client.result.data).to.deep.equal({
            status: 200,
            data: 'Hello World',
        });
        expect(client.result.req).to.equal(message.req);
    }

    @test async 'test websocket server mock websocket on error'() {
        const websocket = new TestableWebsocket();
        this.server['onConnection'](websocket, {
            socket: {
                remoteAddress: '0.0.0.0',
            },
        } as any);

        websocket.events.emit('error', new Error('Hello World'));
        expect(websocket.messages.length).to.equal(0);
    }

    @test async 'test websocket server mock websocket'() {
        const websocket = new TestableWebsocket();
        this.server['onConnection'](websocket, {
            socket: {
                remoteAddress: '0.0.0.0',
            },
        } as any);

        const message = {
            method: 'GET',
            target: '/clients/123',
            req: '123',
        };

        const result = {
            target: '',
            method: 'REPLY',
            data: {
                status: 200,
                data: 'Hello World',
            },
            req: '123',
        };

        websocket.events.emit('message', JSON.stringify(message));
        websocket.events.emit('close', 1000);

        await websocket.waitForMessage();
        expect(websocket.messages.length).to.equal(1);
        if (typeof websocket.result === 'string') expect(JSON.parse(websocket.result)).to.deep.equal(result);
        else expect.fail('Result is not a string');
    }

    @test async 'test websocket server mock websocket error'() {
        const websocket = new TestableWebsocket();
        this.server['onConnection'](websocket, {
            socket: {
                remoteAddress: '0.0.0.0',
            },
        } as any);

        const message = {
            method: 'DELETE',
            target: '/clients/123',
            req: '123',
        };

        const result = {
            target: 'error',
            method: 'REPLY',
            data: {
                status: 400,
                error: 'Hello World',
            },
            req: '123',
        };

        websocket.events.emit('message', JSON.stringify(message));
        websocket.events.emit('close', 1000);

        await websocket.waitForMessage();
        expect(websocket.messages.length).to.equal(1);
        if (typeof websocket.result === 'string') expect(JSON.parse(websocket.result)).to.deep.equal(result);
        else expect.fail('Result is not a string');
    }

    @test async 'test websocket server mock websocket no method'() {
        const websocket = new TestableWebsocket();
        this.server['onConnection'](websocket, {
            socket: {
                remoteAddress: '0.0.0.0',
            },
        } as any);

        const message = {
            target: '/clients/123',
            req: '123',
        };

        const result = {
            target: 'error',
            method: 'REPLY',
            data: {
                status: 400,
                error: 'Missing method',
            },
            req: '123',
        };

        websocket.events.emit('message', JSON.stringify(message));
        websocket.events.emit('close', 1000);

        await websocket.waitForMessage();
        expect(websocket.messages.length).to.equal(1);
        if (typeof websocket.result === 'string') expect(JSON.parse(websocket.result)).to.deep.equal(result);
        else expect.fail('Result is not a string');
    }
}