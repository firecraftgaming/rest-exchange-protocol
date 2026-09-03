import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {Method} from '../../src/route';
import {MiddlewareProhibitFurtherExecution, WebError} from '../../src/error';
import {Gateway} from '../../src/gateway';
import {REPClient} from '../../src';

should;

@suite class ApiGatewayPassiveRouteUnitTests {
    private rep: REPClient;
    private gateway: Gateway;
    private results: {status: number; data?: unknown; error?: string}[];
    before() {
        this.rep = new REPClient({
            host: 'localhost',
        });
        this.gateway = this.rep['gateway'];
        this.results = [];
        this.gateway['sendResult'] = (req: string, data: unknown) => this.results.push({status: 200, data});
        this.gateway['sendError'] = (req: string, status: number, error: string) => this.results.push({status, error});
    }

    @test async 'two passives on the same path both run, in order, and the reply is 200 {}'() {
        const order: number[] = [];
        this.gateway.register({path: '/events', method: Method.GET, passive: true, handler: () => {
            order.push(1);
        }});
        this.gateway.register({path: '/events', method: Method.GET, passive: true, handler: () => {
            order.push(2);
        }});

        await this.gateway.execute('/events', Method.GET, {}, '1');
        expect(order).to.deep.equal([1, 2]);
        expect(this.results).to.deep.equal([{status: 200, data: {}}]);
    }

    @test async 'a passive runs before a matching normal route, whose result is the reply'() {
        const order: string[] = [];
        this.gateway.register({path: '/events', method: Method.GET, passive: true, handler: () => {
            order.push('passive');
        }});
        this.gateway.register({path: '/events', method: Method.GET, handler: () => {
            order.push('route');
            return 'Hello';
        }});

        await this.gateway.execute('/events', Method.GET, {}, '1');
        expect(order).to.deep.equal(['passive', 'route']);
        expect(this.results).to.deep.equal([{status: 200, data: 'Hello'}]);
    }

    @test async 'a passive throwing a WebError aborts and the normal route never runs'() {
        let routeCalled = false;
        this.gateway.register({path: '/events', method: Method.GET, passive: true, handler: () => {
            throw new WebError('Nope', 403);
        }});
        this.gateway.register({path: '/events', method: Method.GET, handler: () => {
            routeCalled = true;
        }});

        await this.gateway.execute('/events', Method.GET, {}, '1');
        expect(routeCalled).to.be.false;
        expect(this.results).to.deep.equal([{status: 403, error: 'Nope'}]);
    }

    @test async 'a passive throwing a plain error replies with 500'() {
        this.gateway.register({path: '/events', method: Method.GET, passive: true, handler: () => {
            throw new Error('boom');
        }});

        await this.gateway.execute('/events', Method.GET, {}, '1');
        expect(this.results).to.deep.equal([{status: 500, error: 'Internal Server Error'}]);
    }

    @test async 'a passive-only match with no req sends nothing'() {
        let called = false;
        this.gateway.register({path: '/events', method: Method.GET, passive: true, handler: () => {
            called = true;
        }});

        await this.gateway.execute('/events', Method.GET, {});
        expect(called).to.be.true;
        expect(this.results).to.deep.equal([]);
    }

    @test async 'a path matching neither a route nor a passive replies with 404'() {
        this.gateway.register({path: '/events', method: Method.GET, passive: true, handler: () => {}});

        await this.gateway.execute('/other', Method.GET, {}, '1');
        expect(this.results).to.deep.equal([{status: 404, error: 'Not Found'}]);
    }

    @test async 'params resolve per-passive route'() {
        const seen: (Record<string, string> | undefined)[] = [];
        this.gateway.register({path: '/user/:id', method: Method.GET, passive: true, handler: (request) => {
            seen.push(request.params);
        }});
        this.gateway.register({path: '/user/:userId', method: Method.GET, passive: true, handler: (request) => {
            seen.push(request.params);
        }});

        await this.gateway.execute('/user/7', Method.GET, {}, '1');
        expect(seen).to.deep.equal([{id: '7'}, {userId: '7'}]);
    }

    @test 'unregistering a passive by handler removes it'() {
        const handler = () => {};
        this.gateway.register({path: '/events', method: Method.GET, passive: true, handler});
        this.gateway.unregister(handler);

        expect(this.gateway['routes']).to.deep.equal([]);
    }

    @test async 'request state set by pre-route middleware reaches the passive handler it belongs to'() {
        let seenRaw: unknown;
        this.rep.use((middlewareData) => {
            if (middlewareData.type !== 'pre-route') return;
            middlewareData.request.setRaw('tagged');
        });
        this.gateway.register({path: '/events', method: Method.GET, passive: true, handler: (request) => {
            seenRaw = request.raw;
        }});

        await this.gateway.execute('/events', Method.GET, {}, '1');
        expect(seenRaw).to.equal('tagged');
    }

    @test async 'a passive throwing MiddlewareProhibitFurtherExecution aborts silently'() {
        let laterCalled = false;
        this.gateway.register({path: '/events', method: Method.GET, passive: true, handler: () => {
            throw new MiddlewareProhibitFurtherExecution();
        }});
        this.gateway.register({path: '/events', method: Method.GET, passive: true, handler: () => {
            laterCalled = true;
        }});
        this.gateway.register({path: '/events', method: Method.GET, handler: () => {
            laterCalled = true;
        }});

        await this.gateway.execute('/events', Method.GET, {}, '1');
        expect(laterCalled).to.be.false;
        expect(this.results).to.deep.equal([]);
    }

    @test async 'a normal route throwing MiddlewareProhibitFurtherExecution still replies with 500'() {
        this.gateway.register({path: '/events', method: Method.GET, handler: () => {
            throw new MiddlewareProhibitFurtherExecution();
        }});

        await this.gateway.execute('/events', Method.GET, {}, '1');
        expect(this.results).to.deep.equal([{status: 500, error: 'Internal Server Error'}]);
    }
}
