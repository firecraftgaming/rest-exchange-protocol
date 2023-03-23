import * as http from 'http';
import {IncomingMessage, ServerResponse} from 'http';
import {WebError} from '../error';
import {Method} from '../route';
import {HTTPResponder} from './responder';
import {Gateway} from '../gateway';
import {EventEmitter} from 'events';
import {REPServer} from '../server';

export const HTTPTranslation = {
    'GET': Method.GET,
    'PUT': Method.CREATE,
    'DELETE': Method.DELETE,
    'PATCH': Method.UPDATE,
    'POST': Method.ACTION,
};

export class HTTPServer {
    private readonly server: http.Server;
    private readonly port: number;
    private readonly eventEmitter: EventEmitter;
    private readonly gateway: Gateway;
    private readonly repServer: REPServer;
    constructor(port = 5000, server: REPServer) {
        this.repServer = server;
        this.gateway = server['gateway'];

        this.port = port;
        this.server = http.createServer((request: IncomingMessage, response: ServerResponse) => {
            this.onRequest(request, response);
        });

        this.server.on('error', (e: any) => {
            this.eventEmitter.emit('error', e);
        });
    }

    start() {
        return new Promise<void>((resolve, _reject) => {
            this.server.listen(this.port, () => {
                resolve();
            });
        });
    }

    stop() {
        this.server.close();
    }

    on(event: 'error', listener: (e: any) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;

    on(event: string, listener: (...args: any[]) => void): this {
        this.eventEmitter.on(event, listener);
        return this;
    }

    private async onRequest(request: IncomingMessage, response: ServerResponse) {
        // TODO: run middleware

        const {method, url} = request;
        if (method === 'OPTIONS') return;

        try {
            if (!url) throw new WebError('Missing url', 400);
            if (!HTTPTranslation[method.toUpperCase()]) throw new WebError('Method not allowed', 405);
        } catch (e) {
            response.writeHead(e.status, {'Content-Type': 'text/json'});
            response.write(JSON.stringify({
                error: e.type,
            }));
            response.end();
            return;
        }

        const body = await this.parseBody(request);
        const responder = new HTTPResponder(body, response, request);
        await this.gateway.execute(url, HTTPTranslation[method.toUpperCase()], responder);
    }

    private parseBody(request: IncomingMessage) {
        return new Promise((resolve, reject) => {
            let body = '';
            request.on('data', chunk => {
                body += chunk;
            });
            request.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(null);
                }
            });
        });
    }
}