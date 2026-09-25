import {should, suite, test} from '../../utility';
import {expect} from 'chai';
import {WebError} from '../../../../src/shared/error';
import {WebsocketClient} from '../../../../src/server/ws/client';
import {ClientManager} from '../../../../src/server/clients';
import {WebsocketOutboundMethod} from '../../../../src/server/ws/server';
import {TestableWebsocket} from '../../utility/websocket.mock';

should;
@suite class WebsocketClientReplyUnitTests {
    private socket: TestableWebsocket;
    private client: WebsocketClient;
    before() {
        this.socket = new TestableWebsocket();
        this.client = new WebsocketClient(this.socket as any, new ClientManager(), null);
    }

    @test 'reply sends the full envelope, unconditionally'() {
        this.client.reply('/target', WebsocketOutboundMethod.REPLY, {a: 1}, '123');

        expect(JSON.parse(this.socket.messages[0] as string)).to.deep.equal({
            target: '/target',
            method: 'REPLY',
            data: {a: 1},
            req: '123',
        });
    }
}

@suite class WebsocketClientSendUnitTests {
    private socket: TestableWebsocket;
    private client: WebsocketClient;
    before() {
        this.socket = new TestableWebsocket();
        this.client = new WebsocketClient(this.socket as any, new ClientManager(), null);
    }

    @test async 'send with call=false resolves undefined and includes no req'() {
        const result = await this.client.send('/target', WebsocketOutboundMethod.GET, {}, false);

        expect(result).to.be.undefined;
        expect(JSON.parse(this.socket.messages[0] as string).req).to.be.undefined;
    }

    @test async 'send resolves when the pending request is answered with a success status'() {
        const promise = this.client.send('/target', WebsocketOutboundMethod.GET, {});
        const req = JSON.parse(this.socket.messages[0] as string).req;

        this.client['resolveRequest'](req, {status: 200, data: 'Hello'});
        expect(await promise).to.equal('Hello');
    }

    @test async 'send rejects with a WebError when the reply status is 400 or above'() {
        const promise = this.client.send('/target', WebsocketOutboundMethod.GET, {});
        const req = JSON.parse(this.socket.messages[0] as string).req;

        this.client['resolveRequest'](req, {status: 404, error: 'Not Found'});

        await promise
            .then(() => expect.fail('Should have rejected'))
            .catch((e) => {
                expect(e).to.be.instanceOf(WebError);
                expect(e.status).to.equal(404);
                expect(e.type).to.equal('Not Found');
            });
    }

    @test async 'send rejects with a 500 malformed reply when the envelope is missing'() {
        const promise = this.client.send('/target', WebsocketOutboundMethod.GET, {});
        const req = JSON.parse(this.socket.messages[0] as string).req;

        this.client['resolveRequest'](req, undefined);

        await promise
            .then(() => expect.fail('Should have rejected'))
            .catch((e) => {
                expect(e.status).to.equal(500);
                expect(e.type).to.equal('Malformed reply');
            });
    }

    @test 'resolving an unknown request id is a no-op'() {
        expect(() => this.client['resolveRequest']('unknown', {status: 200, data: 1})).to.not.throw();
    }

    @test async 'close closes the socket, rejects pending sends, and removes the client from the manager'() {
        const manager = new ClientManager();
        const client = new WebsocketClient(this.socket as any, manager, null);

        const promise = client.send('/target', WebsocketOutboundMethod.GET, {});
        client.close();

        expect(this.socket.closed).to.be.true;
        expect(manager.get(client.id)).to.be.undefined;

        await promise
            .then(() => expect.fail('Should have rejected'))
            .catch((e) => {
                expect(e).to.be.instanceOf(WebError);
                expect(e.type).to.equal('Client disconnected');
            });
    }
}
