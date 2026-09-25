import {should, suite, test} from './utility';
import {expect} from 'chai';
import {Request, Responder} from '../../src/server/responder';
import {Client} from '../../src/server/client';

should;
@suite class ResponderUnitTests {
    @test 'defaults to empty params and query with no raw'() {
        const responder = new Responder({some: 'data'});

        expect(responder.getParams()).to.deep.equal({});
        expect(responder.getQuery()).to.deep.equal({});
        expect(responder.getRaw()).to.be.undefined;
    }

    @test 'getData returns the constructor data'() {
        const responder = new Responder({some: 'data'});
        expect(responder.getData()).to.deep.equal({some: 'data'});
    }

    @test 'getClient returns the constructor client'() {
        const client = new Client();
        const responder = new Responder(null, client);

        expect(responder.getClient()).to.equal(client);
    }

    @test 'setParams/setQuery/setRaw are reflected by the getters'() {
        const responder = new Responder(null);
        responder.setParams({id: '1'});
        responder.setQuery({q: '2'});
        responder.setRaw('raw-value');

        expect(responder.getParams()).to.deep.equal({id: '1'});
        expect(responder.getQuery()).to.deep.equal({q: '2'});
        expect(responder.getRaw()).to.equal('raw-value');
    }

    @test 'the base respond/error are no-ops'() {
        const responder = new Responder(null);
        expect(() => responder.respond('anything')).to.not.throw();
        expect(() => responder.error(null as any)).to.not.throw();
    }
}

@suite class RequestUnitTests {
    private responder: Responder;
    private client: Client;
    before() {
        this.client = new Client();
        this.responder = new Responder({hello: 'world'}, this.client);
        this.responder.setParams({id: '7'});
        this.responder.setQuery({q: '1'});
        this.responder.setRaw('raw');
    }

    @test 'getters proxy the underlying responder'() {
        const request = new Request(this.responder);

        expect(request.getData()).to.deep.equal({hello: 'world'});
        expect(request.getParams()).to.deep.equal({id: '7'});
        expect(request.getQuery()).to.deep.equal({q: '1'});
        expect(request.getRaw()).to.equal('raw');
        expect(request.getClient()).to.equal(this.client);
    }

    @test 'property accessors mirror the getter methods'() {
        const request = new Request(this.responder);

        expect(request.data).to.deep.equal({hello: 'world'});
        expect(request.params).to.deep.equal({id: '7'});
        expect(request.query).to.deep.equal({q: '1'});
        expect(request.raw).to.equal('raw');
        expect(request.client).to.equal(this.client);
    }

    @test 'reflects mutations made to the responder after construction'() {
        const request = new Request(this.responder);
        this.responder.setParams({id: '9'});

        expect(request.params).to.deep.equal({id: '9'});
    }
}
