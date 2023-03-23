import {EventEmitter} from 'events';

export class TestableRequest {
    public method: string = '';
    public url: string = '';
    public headers: Record<string, string> = {};

    private _events = new EventEmitter();
    private body = '';
    constructor(method, url) {
        this.method = method;
        this.url = url;
    }

    public setBody(body: string) {
        this.body = body;
    }

    public setHeader(key: string, value: string) {
        this.headers[key] = value;
    }

    public on(event: string, listener: (...args: any[]) => void) {
        this._events.on(event, listener);
    }
    public send() {
        this._events.emit('data', this.body);
        this._events.emit('end');
    }
}

export class TestableResponse {
    public result: string = null;
    public status: number = 0;
    public headers: Record<string, string> = {};
    constructor() {}

    private _events = new EventEmitter();
    private body = '';

    public write(data: string) {
        this.body += data;
    }

    public writeHead(status: number, headers?: Record<string, string>) {
        this.status = status;
        if (headers) Object.assign(this.headers, headers);
    }

    public end() {
        this.result = this.body;
        this._events.emit('result', this.result);
    }

    public setHeader(key: string, value: string) {
        this.headers[key] = value;
    }

    public events = new EventEmitter();
    public on(event: string, listener: (...args: any[]) => void) {
        this.events.on(event, listener);
    }

    public waitForResponse() {
        return new Promise((resolve) => {
            if (this.result !== null) {
                resolve(this.result);
                return;
            }
            this._events.once('result', (data: unknown) => {
                resolve(data);
            });
        });
    }
}