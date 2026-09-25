import {should, suite, test} from './utility';
import {expect} from 'chai';
import {ClientManager} from '../../src/server/clients';
import {Client, TypedClient} from '../../src/server/client';

should;
@suite class ClientManagerUnitTests {
    private manager: ClientManager;
    before() {
        this.manager = new ClientManager();
    }

    @test 'a client added to the manager can be fetched by id'() {
        const client = new Client(this.manager);
        expect(this.manager.get(client.id)).to.equal(client);
    }

    @test 'destroying a client removes it from the manager'() {
        const client = new Client(this.manager);
        this.manager.destroy(client.id);

        expect(this.manager.get(client.id)).to.be.undefined;
    }

    @test 'destroying an unknown id is a no-op'() {
        expect(() => this.manager.destroy('unknown')).to.not.throw();
        expect(this.manager.size).to.equal(0);
    }

    @test 'getAll returns every added client'() {
        const a = new Client(this.manager);
        const b = new Client(this.manager);

        expect(this.manager.getAll()).to.deep.equal([a, b]);
    }

    @test 'size reflects the number of tracked clients'() {
        new Client(this.manager);
        new Client(this.manager);

        expect(this.manager.size).to.equal(2);
    }
}

@suite class ClientUnitTests {
    @test 'each client gets a unique id'() {
        const manager = new ClientManager();
        const a = new Client(manager);
        const b = new Client(manager);

        expect(a.id).to.not.equal(b.id);
    }

    @test 'a client can be constructed without a manager'() {
        const client = new Client();
        expect(client.id).to.be.a('string');
    }

    @test 'destroying a client without a manager is a no-op'() {
        const client = new Client();
        expect(() => client['destroy']()).to.not.throw();
    }

    @test 'TypedClient stores data under the same manager-registration lifecycle as Client'() {
        const manager = new ClientManager();
        const client = new TypedClient<{name: string}>(manager);
        client.data = {name: 'Alice'};

        expect(manager.get(client.id)).to.equal(client);
        expect(client.data.name).to.equal('Alice');
    }
}
