export interface WebsocketRequest {
    target: string;
    method: string;

    data: unknown;

    req: string;
}