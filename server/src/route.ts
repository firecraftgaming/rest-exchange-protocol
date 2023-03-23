import {Request} from './responder';
export enum Method {
    GET = 'GET',
    CREATE = 'CREATE',
    DELETE = 'DELETE',
    UPDATE = 'UPDATE',
    ACTION = 'ACTION',
}

export interface Route {
    method: Method;
    path: string;

    exec: (request: Request) => unknown;
}