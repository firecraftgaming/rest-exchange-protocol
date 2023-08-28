import {Request} from './responder';
export const Method = {
    GET: 'GET',
    CREATE: 'CREATE',
    DELETE: 'DELETE',
    UPDATE: 'UPDATE',
    ACTION: 'ACTION',
} as const;

export type Method = typeof Method[keyof typeof Method];
export interface Route {
    method: Method | string;
    path: string;

    handler: (request: Request) => unknown;
}