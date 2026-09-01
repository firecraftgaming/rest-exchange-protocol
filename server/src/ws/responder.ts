import {WebError} from '../error';
import {Responder} from '../responder';
import {WebsocketClient} from './client';
import {WebsocketOutboundMethod} from './server';
export class WebsocketResponder extends Responder {
    private readonly websocket: WebsocketClient;
    private readonly req: string | undefined;
    constructor(data: unknown, websocket: WebsocketClient, raw: unknown, req: string | undefined) {
        super(data, websocket);
        this.setRaw(raw);

        this.websocket = websocket;
        this.req = req;
    }

    respond(data: unknown) {
        if (!this.req) return;
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
        if (!this.req) return;
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