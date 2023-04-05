import {WebError} from './error';
import {Client} from './client';

export class Request {
    private readonly responder: Responder;
    constructor(responder: Responder) {
        this.responder = responder;
    }

    get raw() {
        return this.getRaw();
    }

    get params() {
        return this.getParams();
    }

    get query() {
        return this.getQuery();
    }

    get data() {
        return this.getData();
    }

    get client() {
        return this.getClient();
    }

    getRaw() {
        return this.responder.getRaw();
    }

    getParams() {
        return this.responder.getParams();
    }

    getQuery() {
        return this.responder.getQuery();
    }

    getData() {
        return this.responder.getData();
    }

    getClient() {
        return this.responder.getClient();
    }
}

export class Responder {
    private readonly client: Client;
    private readonly data?: unknown;
    private params?: { [key: string]: string } = {};
    private query?: { [key: string]: string } = {};
    private raw?: unknown;
    constructor(data: unknown, client?: Client) {
        this.data = data;
        this.client = client;
    }

    setRaw(raw: unknown) {
        this.raw = raw;
    }

    setParams(params: Record<string, string>) {
        this.params = params;
    }

    setQuery(query: Record<string, string>) {
        this.query = query;
    }

    getRaw() {
        return this.raw;
    }

    getQuery() {
        return this.query;
    }

    getParams() {
        return this.params;
    }

    getData() {
        return this.data;
    }

    getClient() {
        return this.client;
    }

    respond(data: unknown) {}
    error(error: WebError) {}
}