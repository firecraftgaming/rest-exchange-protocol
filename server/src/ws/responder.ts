import {WebError} from '../error';
import {Responder} from '../responder';
import {WebsocketClient} from './client';
import {WebsocketOutboundMethod} from './server';
export class WebsocketResponder extends Responder {
    private readonly websocket: WebsocketClient;
    private readonly req: string | null;
    constructor(data: unknown, websocket: WebsocketClient, raw: unknown, req: string | null) {
        super(data, websocket);
        this.setRaw(raw);

        this.websocket = websocket;
        this.req = req;
    }

    respond(data: unknown) {
        if (this.req === null) return;
        this.websocket.reply(
            '',
            WebsocketOutboundMethod.REPLY,

            {
                status: 200,
                data,
            },

            this.req,
        );
    }
    error(error: WebError) {
        this.websocket.reply(
            'error',
            WebsocketOutboundMethod.REPLY,

            {
                status: error.status,
                error: error.type,
            },

            this.req,
        );
    }
}