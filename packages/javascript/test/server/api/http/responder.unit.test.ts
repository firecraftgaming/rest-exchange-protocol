import {should, suite, test} from '../../utility';
import {expect} from 'chai';
import {WebError} from '../../../../src/shared/error';
import {HTTPResponder} from '../../../../src/server/http/responder';
import {HTTPClient} from '../../../../src/server/http/client';
import {TestableRequest, TestableResponse} from '../../utility/http.mock';

should;
@suite class HTTPResponderUnitTests {
    private response: TestableResponse;
    private responder: HTTPResponder;
    before() {
        const request = new TestableRequest('GET', '/clients/1');
        this.response = new TestableResponse();
        this.responder = new HTTPResponder({}, new HTTPClient(), this.response as any, request as any);
    }

    @test 'respond writes a 200 with a JSON content type and the data envelope'() {
        this.responder.respond('Hello World');

        expect(this.response.status).to.equal(200);
        expect(this.response.headers['Content-Type']).to.equal('text/json');
        expect(JSON.parse(this.response.result)).to.deep.equal({data: 'Hello World'});
    }

    @test 'error writes the error status with the error envelope'() {
        this.responder.error(new WebError('Not Found', 404));

        expect(this.response.status).to.equal(404);
        expect(JSON.parse(this.response.result)).to.deep.equal({error: 'Not Found'});
    }

    @test 'the raw value is the IncomingMessage passed to the constructor'() {
        const request = new TestableRequest('GET', '/clients/1');
        const responder = new HTTPResponder({}, new HTTPClient(), new TestableResponse() as any, request as any);

        expect(responder.getRaw()).to.equal(request);
    }
}
