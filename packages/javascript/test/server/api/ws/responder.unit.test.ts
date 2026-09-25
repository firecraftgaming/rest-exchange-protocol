import {should, suite, test} from '../../utility';
import {expect} from 'chai';
import {WebError} from '../../../../src/shared/error';
import {WebsocketResponder} from '../../../../src/server/ws/responder';
import {TestableWebsocketClient} from '../../utility/websocket.mock';

should;
@suite class WebsocketResponderUnitTests {
    private client: TestableWebsocketClient;
    before() {
        this.client = new TestableWebsocketClient();
    }

    @test 'respond replies on the empty target with a 200 envelope'() {
        const responder = new WebsocketResponder({}, this.client as any, 'raw', '123');
        responder.respond('Hello World');

        expect(this.client.result).to.deep.equal({
            target: '',
            method: 'REPLY',
            data: {status: 200, data: 'Hello World'},
            req: '123',
        });
    }

    @test 'error replies on the error target with the error envelope'() {
        const responder = new WebsocketResponder({}, this.client as any, 'raw', '123');
        responder.error(new WebError('Not Found', 404));

        expect(this.client.result).to.deep.equal({
            target: 'error',
            method: 'REPLY',
            data: {status: 404, error: 'Not Found'},
            req: '123',
        });
    }

    @test 'respond sends nothing when there is no request id'() {
        const responder = new WebsocketResponder({}, this.client as any, 'raw', undefined);
        responder.respond('Hello World');

        expect(this.client.messages).to.deep.equal([]);
    }

    @test 'error sends nothing when there is no request id'() {
        const responder = new WebsocketResponder({}, this.client as any, 'raw', undefined);
        responder.error(new WebError('Not Found', 404));

        expect(this.client.messages).to.deep.equal([]);
    }

    @test 'the raw value is set at construction'() {
        const responder = new WebsocketResponder({}, this.client as any, 'the-raw-frame', '123');
        expect(responder.getRaw()).to.equal('the-raw-frame');
    }
}
