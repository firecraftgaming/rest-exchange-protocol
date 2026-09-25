import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {Method} from '../../../src/client/route';
import {MiddlewareProhibitFurtherExecution, WebError} from '../../../src/shared/error';
import {Gateway} from '../../../src/client/gateway';
import {REPClient} from '../../../src/client';

should;
@suite class ApiGatewayMissingMethodUnitTests {
    private gateway: Gateway;
    before() {
        const rep = new REPClient({host: 'localhost'});
        this.gateway = rep['gateway'];
    }

    @test async 'a missing method replies with 400 when there is a req'() {
        const errors: {status: number; error: string}[] = [];
        this.gateway['sendError'] = (req: string, status: number, error: string) => errors.push({status, error});

        await this.gateway.execute('/clients', '' as Method, {}, '123');
        expect(errors).to.deep.equal([{status: 400, error: 'Missing method'}]);
    }

    @test async 'a missing method with no req sends nothing'() {
        let called = false;
        this.gateway['sendError'] = () => {
            called = true;
        };

        await this.gateway.execute('/clients', '' as Method, {});
        expect(called).to.be.false;
    }

    @test async 'an invalid method with no req sends nothing'() {
        let called = false;
        this.gateway['sendError'] = () => {
            called = true;
        };

        await this.gateway.execute('/clients', 'ABC' as Method, {});
        expect(called).to.be.false;
    }

    @test async 'a 404 with no req sends nothing'() {
        let called = false;
        this.gateway['sendError'] = () => {
            called = true;
        };

        await this.gateway.execute('/nowhere', Method.GET, {});
        expect(called).to.be.false;
    }
}

@suite class ApiGatewaySendUnitTests {
    private gateway: Gateway;
    private client: REPClient;
    before() {
        this.client = new REPClient({host: 'localhost'});
        this.gateway = this.client['gateway'];
    }

    @test 'sendResult does nothing when there is no socket'() {
        expect(() => this.gateway['sendResult']('1', {})).to.not.throw();
    }

    @test 'sendResult does nothing when the socket is not open'() {
        const socket = {readyState: 0, OPEN: 1, send: () => expect.fail('should not send')};
        this.client['socket'] = socket as any;

        this.gateway['sendResult']('1', {});
    }

    @test 'sendResult sends a REPLY envelope when the socket is open'() {
        const sent: string[] = [];
        const socket = {readyState: 1, OPEN: 1, send: (data: string) => sent.push(data)};
        this.client['socket'] = socket as any;

        this.gateway['sendResult']('1', {hello: 'world'}, '/target');
        expect(JSON.parse(sent[0])).to.deep.equal({
            target: '/target',
            method: 'REPLY',
            data: {status: 200, data: {hello: 'world'}},
            req: '1',
        });
    }

    @test 'sendError sends a REPLY envelope with the error status'() {
        const sent: string[] = [];
        const socket = {readyState: 1, OPEN: 1, send: (data: string) => sent.push(data)};
        this.client['socket'] = socket as any;

        this.gateway['sendError']('1', 404, 'Not Found', '/target');
        expect(JSON.parse(sent[0])).to.deep.equal({
            target: '/target',
            method: 'REPLY',
            data: {status: 404, error: 'Not Found'},
            req: '1',
        });
    }

    @test 'sendError defaults the target to error'() {
        const sent: string[] = [];
        const socket = {readyState: 1, OPEN: 1, send: (data: string) => sent.push(data)};
        this.client['socket'] = socket as any;

        this.gateway['sendError']('1', 404, 'Not Found');
        expect(JSON.parse(sent[0]).target).to.equal('error');
    }
}

@suite class ApiGatewayPreRouteMiddlewareShapeUnitTests {
    private client: REPClient;
    private gateway: Gateway;
    before() {
        this.client = new REPClient({host: 'localhost'});
        this.gateway = this.client['gateway'];
    }

    @test async 'pre-route middleware receives the matched route, passives, and request'() {
        let seen: any;
        this.client.use((data) => {
            if (data.type === 'pre-route') seen = data;
        });
        this.gateway.register({path: '/clients/:id', method: Method.GET, handler: () => 'Hello', passive: true});
        this.gateway.register({path: '/clients/:id', method: Method.GET, handler: () => 'World'});

        await this.gateway.execute('/clients/1?x=2', Method.GET, {hello: 'data'});

        expect(seen.route.handler()).to.equal('World');
        expect(seen.passives).to.have.lengthOf(1);
        expect(seen.request.params).to.deep.equal({id: '1'});
        expect(seen.request.query).to.deep.equal({x: '2'});
        expect(seen.request.data).to.deep.equal({hello: 'data'});
    }

    @test async 'pre-route middleware throwing a WebError replies with that status'() {
        let handlerCalled = false;
        this.client.use((data) => {
            if (data.type === 'pre-route') throw new WebError('Blocked', 403);
        });
        this.gateway.register({path: '/clients', method: Method.GET, handler: () => {
            handlerCalled = true;
        }});

        const errors: {status: number; error: string}[] = [];
        this.gateway['sendError'] = (req: string, status: number, error: string) => errors.push({status, error});

        await this.gateway.execute('/clients', Method.GET, {}, '1');
        expect(handlerCalled).to.be.false;
        expect(errors).to.deep.equal([{status: 403, error: 'Blocked'}]);
    }

    @test async 'pre-route middleware throwing a plain error replies with 500'() {
        this.client.use((data) => {
            if (data.type === 'pre-route') throw new Error('boom');
        });
        this.gateway.register({path: '/clients', method: Method.GET, handler: () => {}});

        const errors: {status: number; error: string}[] = [];
        this.gateway['sendError'] = (req: string, status: number, error: string) => errors.push({status, error});

        await this.gateway.execute('/clients', Method.GET, {}, '1');
        expect(errors).to.deep.equal([{status: 500, error: 'Internal Server Error'}]);
    }

    @test async 'pre-route middleware throwing MiddlewareProhibitFurtherExecution sends no response'() {
        let handlerCalled = false;
        this.client.use((data) => {
            if (data.type === 'pre-route') throw new MiddlewareProhibitFurtherExecution();
        });
        this.gateway.register({path: '/clients', method: Method.GET, handler: () => {
            handlerCalled = true;
        }});

        const errors: unknown[] = [];
        this.gateway['sendError'] = (...args: unknown[]) => errors.push(args);

        await this.gateway.execute('/clients', Method.GET, {}, '1');
        expect(handlerCalled).to.be.false;
        expect(errors).to.deep.equal([]);
    }
}
