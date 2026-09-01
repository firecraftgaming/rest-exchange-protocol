import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {Method} from '../../src/route';
import {REPServer} from '../../src';
import {Gateway} from '../../src/gateway';

should;
@suite class ApiGatewayMethodAliasUnitTests {
    private gateway: Gateway;
    before() {
        const rep = new REPServer({
            port: 0,
        });
        this.gateway = rep['gateway'];
    }

    @test 'registering a route with an HTTP alias stores it unchanged'() {
        const handler = () => {};
        const route = {path: '/clients', method: 'PUT', handler};
        this.gateway.register(route);

        expect(this.gateway['routes']).to.deep.equal([route]);
    }

    @test 'a route registered with an HTTP alias is found by the REP method'() {
        const handler = () => {};
        this.gateway.register({path: '/clients', method: 'PATCH', handler});

        const route = this.gateway['findRoute']('/clients', Method.UPDATE);
        expect(route).to.deep.equal({path: '/clients', method: 'PATCH', handler});
    }

    @test 'a route registered with a REP method is found by its HTTP alias'() {
        const handler = () => {};
        this.gateway.register({path: '/clients', method: Method.ACTION, handler});

        const route = this.gateway['findRoute']('/clients', 'POST' as Method);
        expect(route).to.deep.equal({path: '/clients', method: Method.ACTION, handler});
    }

    @test 'a route registered with a lowercase method is found'() {
        const handler = () => {};
        this.gateway.register({path: '/clients', method: 'get', handler});

        const route = this.gateway['findRoute']('/clients', Method.GET);
        expect(route).to.deep.equal({path: '/clients', method: 'get', handler});
    }

    @test 'unregistering a route registered with an HTTP alias removes it by identity'() {
        const route = {path: '/clients', method: 'PUT', handler: () => {}};
        this.gateway.register(route);
        this.gateway.unregister(route);

        expect(this.gateway['routes']).to.deep.equal([]);
    }
}
