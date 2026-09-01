import {Request} from './responder';
export const Method = {
    GET: 'GET',
    CREATE: 'CREATE',
    DELETE: 'DELETE',
    UPDATE: 'UPDATE',
    ACTION: 'ACTION',
} as const;

export type Method = typeof Method[keyof typeof Method];

export const MethodAlias = {
    PUT: Method.CREATE,
    PATCH: Method.UPDATE,
    POST: Method.ACTION,
} as const;

export function normalizeMethod(method: string): Method | null {
    if (typeof method !== 'string') return null;

    const upper = method.toUpperCase();
    const alias = MethodAlias[upper as keyof typeof MethodAlias];
    if (alias) return alias;

    if (Object.values(Method).includes(upper as Method)) return upper as Method;

    return null;
}

export interface Route {
    method: Method | string;
    path: string;

    handler: (request: Request) => unknown;
}