import {WebError} from '../error';
import {Responder} from '../responder';
import {IncomingMessage, ServerResponse} from 'http';

export class HTTPResponder extends Responder {
    private readonly response: ServerResponse;
    constructor(data: unknown, response: ServerResponse, request: IncomingMessage) {
        super(data);
        this.response = response;
        this.setRaw(request);
    }

    respond(data: unknown) {
        this.response.writeHead(200, {'Content-Type': 'text/json'});
        this.response.write(JSON.stringify({
            data,
        }));
        this.response.end();
    }
    error(error: WebError) {
        this.response.writeHead(error.status, {'Content-Type': 'text/json'});
        this.response.write(JSON.stringify({
            error: error.type,
        }));
        this.response.end();
    }
}