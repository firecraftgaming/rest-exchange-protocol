import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {Gateway} from '../../../src/client/gateway';
import {Routes} from '../../../src/client/routes';
import {REPClient} from '../../../src/client';

should;
@suite class RoutesShortcutUnitTests {
    private gateway: Gateway;
    private routes: Routes;
    before() {
        const client = new REPClient({host: 'localhost'});
        this.gateway = client['gateway'];
        this.routes = new Routes(this.gateway);
    }

    @test 'get registers a GET route'() {
        const handler = () => {};
        this.routes.get('/a', handler);

        expect(this.gateway['routes']).to.deep.equal([{method: 'GET', path: '/a', handler}]);
    }

    @test 'create registers a CREATE route'() {
        const handler = () => {};
        this.routes.create('/a', handler);

        expect(this.gateway['routes']).to.deep.equal([{method: 'CREATE', path: '/a', handler}]);
    }

    @test 'delete registers a DELETE route'() {
        const handler = () => {};
        this.routes.delete('/a', handler);

        expect(this.gateway['routes']).to.deep.equal([{method: 'DELETE', path: '/a', handler}]);
    }

    @test 'update registers an UPDATE route'() {
        const handler = () => {};
        this.routes.update('/a', handler);

        expect(this.gateway['routes']).to.deep.equal([{method: 'UPDATE', path: '/a', handler}]);
    }

    @test 'action registers an ACTION route'() {
        const handler = () => {};
        this.routes.action('/a', handler);

        expect(this.gateway['routes']).to.deep.equal([{method: 'ACTION', path: '/a', handler}]);
    }

    @test 'listen registers a passive route with the given method'() {
        const handler = () => {};
        this.routes.listen('GET', '/events', handler);

        expect(this.gateway['routes']).to.deep.equal([{method: 'GET', path: '/events', handler, passive: true}]);
    }

    @test 'listen accepts an HTTP alias method'() {
        const handler = () => {};
        this.routes.listen('PUT', '/events', handler);

        expect(this.gateway['routes']).to.deep.equal([{method: 'PUT', path: '/events', handler, passive: true}]);
    }

    @test 'unregister removes a route by identity'() {
        const route = {method: 'GET', path: '/a', handler: () => {}};
        this.routes.register(route);
        this.routes.unregister(route);

        expect(this.gateway['routes']).to.deep.equal([]);
    }

    @test 'unregister removes a route by handler'() {
        const handler = () => {};
        this.routes.register({method: 'GET', path: '/a', handler});
        this.routes.unregister(handler);

        expect(this.gateway['routes']).to.deep.equal([]);
    }
}
