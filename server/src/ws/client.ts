import {Client} from '../client';
import {WebSocket} from 'ws';
import http from 'http';
import {WebsocketOutboundMethod} from './server';
import {ClientManager} from '../clients';

export class WebsocketClient extends Client {
    public readonly websocket: WebSocket;
    constructor(websocket: WebSocket, manager: ClientManager, _request: http.IncomingMessage) {
        super(manager);
        this.websocket = websocket;
    }

    public send(target: string | null, method: WebsocketOutboundMethod, data: unknown, req: string | null) {
        this.websocket.send(JSON.stringify({
            target,
            method,

            data,

            req,
        }));
    }
}