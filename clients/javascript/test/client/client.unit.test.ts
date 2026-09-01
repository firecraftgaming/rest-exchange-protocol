import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {WebError} from '../../src/error';
import {REPClient} from '../../src';

should;

class TestableSocket {
    public sent: string[] = [];
    public send(data: string) {
        this.sent.push(data);
    }
    public addEventListener() {}
    public removeEventListener() {}
    public close() {}
}

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
