import {Responder} from '../../src/responder';
import {WebError} from '../../src/error';

export interface TestableResponderResult {
    params: Record<string, string>;
    query: Record<string, string>;

    response: TestableResponderResponse;
}

type TestableResponderResponse = TestableResponderResponseSuccess | TestableResponderResponseError;

interface TestableResponderResponseSuccess {
    success: true;
    data: unknown;
}

interface TestableResponderResponseError {
    success: false;
    error: {
        type: string;
        status: number;
    };
}

export class TestableResponder extends Responder {
    public result: TestableResponderResult = {
        params: {},
        query: {},
    } as TestableResponderResult;
    constructor() {
        super(null);
    }

    setParams(params: Record<string, string>) {
        super.setParams(params);
        this.result.params = params;
    }

    setQuery(query: Record<string, string>) {
        super.setQuery(query);
        this.result.query = query;
    }

    respond(data: unknown) {
        this.result.response = {
            success: true,
            data,
        };
    }
    error(error: WebError) {
        this.result.response = {
            success: false,
            error: {
                type: error.type,
                status: error.status,
            },
        };
    }
}