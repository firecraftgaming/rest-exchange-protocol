import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {Method} from '../../../src/server/route';
import {REPServer} from '../../../src/server/server';
import {MiddleWareData} from '../../../src/server/server';
import {Client} from '../../../src/server/client';

should;
@suite class REPServerConfigUnitTests {
    @test 'starting without a config uses the defaults'() {
        const rep = new REPServer();
        expect(rep['config']).to.deep.equal({});
        expect(rep['httpServer']['port']).to.equal(5000);
    }
}

@suite class REPServerRouteShortcutUnitTests {
    private rep: REPServer;
    before() {
        this.rep = new REPServer({port: 0});
    }

    @test 'get registers a GET route'() {
        const handler = () => {};
        this.rep.get('/a', handler);

        expect(this.rep['gateway']['routes']).to.deep.equal([{method: 'GET', path: '/a', handler}]);
    }

    @test 'create registers a CREATE route'() {
        const handler = () => {};
        this.rep.create('/a', handler);

        expect(this.rep['gateway']['routes']).to.deep.equal([{method: 'CREATE', path: '/a', handler}]);
    }

    @test 'delete registers a DELETE route'() {
        const handler = () => {};
        this.rep.delete('/a', handler);

        expect(this.rep['gateway']['routes']).to.deep.equal([{method: 'DELETE', path: '/a', handler}]);
    }

    @test 'update registers an UPDATE route'() {
        const handler = () => {};
        this.rep.update('/a', handler);

        expect(this.rep['gateway']['routes']).to.deep.equal([{method: 'UPDATE', path: '/a', handler}]);
    }

    @test 'action registers an ACTION route'() {
        const handler = () => {};
        this.rep.action('/a', handler);

        expect(this.rep['gateway']['routes']).to.deep.equal([{method: 'ACTION', path: '/a', handler}]);
    }

    @test 'unregister removes a route by identity'() {
        const route = {method: Method.GET, path: '/a', handler: () => {}};
        this.rep.register(route);
        this.rep.unregister(route);

        expect(this.rep['gateway']['routes']).to.deep.equal([]);
    }

    @test 'unregister by handler removes every route sharing that handler'() {
        const handler = () => {};
        this.rep.register({method: Method.GET, path: '/a', handler});
        this.rep.register({method: Method.DELETE, path: '/b', handler});
        this.rep.register({method: Method.UPDATE, path: '/c', handler: () => {}});

        this.rep.unregister(handler);
        expect(this.rep['gateway']['routes']).to.have.lengthOf(1);
    }
}

@suite class REPServerClientTrackingUnitTests {
    @test 'getClient/getClients read through to the ClientManager'() {
        const rep = new REPServer({port: 0});
        const client = new Client(rep['clients']);

        expect(rep.getClient(client.id)).to.equal(client);
        expect(rep.getClients()).to.deep.equal([client]);
    }

    @test 'getClient returns undefined for an unknown id'() {
        const rep = new REPServer({port: 0});
        expect(rep.getClient('unknown')).to.be.undefined;
    }
}

@suite class REPServerMiddlewareUnitTests {
    private rep: REPServer;
    before() {
        this.rep = new REPServer({port: 0});
    }

    @test async 'middlewares run in registration order'() {
        const order: number[] = [];
        this.rep.use(() => {
            order.push(1);
        });
        this.rep.use(() => {
            order.push(2);
        });

        await this.rep['executeMiddleWare']({type: 'websocket-message'} as MiddleWareData);
        expect(order).to.deep.equal([1, 2]);
    }

    @test async 'an async middleware is awaited before the next one runs'() {
        const order: string[] = [];
        this.rep.use(async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            order.push('first');
        });
        this.rep.use(() => {
            order.push('second');
        });

        await this.rep['executeMiddleWare']({type: 'websocket-message'} as MiddleWareData);
        expect(order).to.deep.equal(['first', 'second']);
    }

    @test async 'a throwing middleware stops the chain'() {
        let laterCalled = false;
        this.rep.use(() => {
            throw new Error('boom');
        });
        this.rep.use(() => {
            laterCalled = true;
        });

        await this.rep['executeMiddleWare']({type: 'websocket-message'} as MiddleWareData)
            .then(() => expect.fail('Should have thrown'))
            .catch((e) => expect(e.message).to.equal('boom'));

        expect(laterCalled).to.be.false;
    }
}
