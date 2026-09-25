import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {WebError} from '../../../src/shared/error';
import {REPClient} from '../../../src/client';
import {TestableSocket} from '../utility/socket.mock';
import axios from 'axios';

should;

@suite class ClientWsValidateStatusUnitTests {
    private client: REPClient;
    private socket: TestableSocket;
    before() {
        this.client = new REPClient({host: 'localhost'});

        this.socket = new TestableSocket();
        this.client['socket'] = this.socket as any;
        this.client['connected_'] = true;
    }

    @test async 'a custom validateStatus can accept a status that would otherwise reject'() {
        const promise = this.client['requestWs']('/clients/123', 'GET', {}, true, (status: number) => status === 404);
        const req = JSON.parse(this.socket.sent[0]).req;

        this.client['onMessage']({
            data: JSON.stringify({
                method: 'REPLY',
                req,
                data: {status: 404, data: 'Missing', error: 'Not Found'},
            }),
        } as any);

        expect(await promise).to.equal('Missing');
    }

    @test async 'a custom validateStatus can reject a status that would otherwise resolve'() {
        const promise = this.client['requestWs']('/clients/123', 'GET', {}, true, (status: number) => status < 300);
        const req = JSON.parse(this.socket.sent[0]).req;

        this.client['onMessage']({
            data: JSON.stringify({
                method: 'REPLY',
                req,
                data: {status: 304, data: 'Not Modified'},
            }),
        } as any);

        await promise
            .then(() => expect.fail('Should have rejected'))
            .catch((e: WebError) => expect(e.status).to.equal(304));
    }

    @test async 'a validateStatus that throws rejects the pending request instead of hanging'() {
        const validateStatus = () => {
            throw new Error('boom');
        };
        const promise = this.client['requestWs']('/clients/123', 'GET', {}, true, validateStatus);
        const req = JSON.parse(this.socket.sent[0]).req;

        this.client['onMessage']({
            data: JSON.stringify({method: 'REPLY', req, data: {status: 200, data: 'Hello'}}),
        } as any);

        await promise
            .then(() => expect.fail('Should have rejected'))
            .catch((e: WebError) => {
                expect(e).to.be.instanceOf(WebError);
                expect(e.type).to.equal('boom');
            });
    }

    @test async 'validateStatus is threaded through request() via options'() {
        const promise = this.client.request('/clients/123', 'GET', {}, {validateStatus: (status: number) => status === 404});
        const req = JSON.parse(this.socket.sent[0]).req;

        this.client['onMessage']({
            data: JSON.stringify({method: 'REPLY', req, data: {status: 404, data: 'Missing', error: 'Not Found'}}),
        } as any);

        expect(await promise).to.equal('Missing');
    }
}

@suite class ClientHttpValidateStatusUnitTests {
    private client: REPClient;
    private originalRequest: typeof axios.request;
    before() {
        this.client = new REPClient({host: 'localhost'});
        this.originalRequest = axios.request;
    }

    after() {
        axios.request = this.originalRequest;
    }

    @test async 'a validateStatus is passed through to axios'() {
        let calledValidateStatus: any;
        axios.request = ((options: any) => {
            calledValidateStatus = options.validateStatus;
            return Promise.resolve({data: {data: null}});
        }) as any;

        const validateStatus = (status: number) => status === 404;
        await this.client['requestHttp']('/clients/123', 'GET', {}, validateStatus);
        expect(calledValidateStatus).to.equal(validateStatus);
    }

    @test async 'no validateStatus leaves axios to use its own default'() {
        let calledOptions: any;
        axios.request = ((options: any) => {
            calledOptions = options;
            return Promise.resolve({data: {data: null}});
        }) as any;

        await this.client['requestHttp']('/clients/123', 'GET', {});
        expect(calledOptions).to.not.have.property('validateStatus');
    }

    @test async 'validateStatus is threaded through request() via options'() {
        let calledValidateStatus: any;
        axios.request = ((options: any) => {
            calledValidateStatus = options.validateStatus;
            return Promise.resolve({data: {data: null}});
        }) as any;

        const validateStatus = (status: number) => status === 404;
        await this.client.request('/clients/123', 'GET', {}, {transport: 'http', validateStatus});
        expect(calledValidateStatus).to.equal(validateStatus);
    }
}
