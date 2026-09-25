import {should, suite, test} from '../utility';
import {expect} from 'chai';
import {Request} from '../../../src/client/request';

should;
@suite class ClientRequestUnitTests {
    @test 'defaults to empty params and query with no raw'() {
        const request = new Request({some: 'data'});

        expect(request.params).to.deep.equal({});
        expect(request.query).to.deep.equal({});
        expect(request.raw).to.be.undefined;
    }

    @test 'data is set from the constructor'() {
        const request = new Request({hello: 'world'});
        expect(request.getData()).to.deep.equal({hello: 'world'});
    }

    @test 'setParams/setQuery/setRaw are reflected by the getters'() {
        const request = new Request(null);
        request.setParams({id: '1'});
        request.setQuery({q: '2'});
        request.setRaw('raw-value');

        expect(request.getParams()).to.deep.equal({id: '1'});
        expect(request.getQuery()).to.deep.equal({q: '2'});
        expect(request.getRaw()).to.equal('raw-value');
    }
}
