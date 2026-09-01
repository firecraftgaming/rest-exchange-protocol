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

        await this.client.request('/clients/123', 'POST', {}, 'ws', false);
        expect(calledWith).to.equal('ACTION');
    }
}
