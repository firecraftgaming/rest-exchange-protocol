import {should, suite, test} from './utility';
import {expect} from 'chai';
import {MiddlewareProhibitFurtherExecution, WebError} from '../../src/shared/error';

should;
@suite class WebErrorUnitTests {
    @test 'defaults to status 500 when none is given'() {
        const error = new WebError('Broken');
        expect(error.status).to.equal(500);
        expect(error.type).to.equal('Broken');
    }

    @test 'keeps a given status'() {
        const error = new WebError('Not Found', 404);
        expect(error.status).to.equal(404);
    }

    @test 'a falsy status of 0 falls back to 500'() {
        const error = new WebError('Broken', 0);
        expect(error.status).to.equal(500);
    }

    @test 'the error message mirrors the type'() {
        const error = new WebError('Bad Request', 400);
        expect(error.message).to.equal('Bad Request');
    }

    @test 'is an instance of Error'() {
        expect(new WebError('Broken')).to.be.instanceOf(Error);
    }
}

@suite class MiddlewareProhibitFurtherExecutionUnitTests {
    @test 'carries a fixed message'() {
        const error = new MiddlewareProhibitFurtherExecution();
        expect(error.message).to.equal('Middleware prohibited further execution');
    }

    @test 'is an instance of Error'() {
        expect(new MiddlewareProhibitFurtherExecution()).to.be.instanceOf(Error);
    }
}
