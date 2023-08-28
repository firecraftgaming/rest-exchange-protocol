import {WebsocketClient} from '../../src/ws/client';
import {EventEmitter} from 'events';
import {WebsocketOutboundMethod} from '../../src/ws/server';
import {ClientManager} from '../../src/clients';

export interface TestableWebsocketClientResult {
    target: string | null;
    method: WebsocketOutboundMethod;

    data: unknown;

    req: string | null;
}

export class TestableWebsocketClient extends WebsocketClient {
    public result = {} as TestableWebsocketClientResult;
    public messages: TestableWebsocketClientResult[] = [];
    constructor() {
        super(null, new ClientManager(), null);
    }

    public reply(target: string | null, method: WebsocketOutboundMethod, data: unknown, req: string | null) {
        this.result = {
            target,
            method,

            data,

            req,
        };

        this.messages.push(this.result);
    }
}

export class TestableWebsocket {
    public result: unknown = null;
    public messages: unknown[] = [];
    constructor() {}

    private _events = new EventEmitter();

    public send(data: unknown) {
        this.messages.push(data);
        this.result = data;

        this._events.emit('message', data);
    }

    public events = new EventEmitter();
    public on(event: string, listener: (...args: any[]) => void) {
        this.events.on(event, listener);
    }

    public close() {}

    public waitForMessage() {
        return new Promise((resolve) => {
            if (this.result !== null) {
                resolve(this.result);
                return;
            }
            this._events.once('message', (data: unknown) => {
                resolve(data);
            });
        });
    }
}