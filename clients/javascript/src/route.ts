import { Request } from './request';

export enum Method {
    GET = 'GET',
    CREATE = 'CREATE',
    DELETE = 'DELETE',
    UPDATE = 'UPDATE',
    ACTION = 'ACTION',
}

export interface Route {
    method: Method | string;
    path: string;

    handler: (request: Request) => unknown;
}