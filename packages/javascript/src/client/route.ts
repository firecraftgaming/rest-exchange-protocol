import { Request } from './request';
import { Method } from '../shared/method';

export { Method, MethodAlias, normalizeMethod } from '../shared/method';

export interface Route {
    method: Method | string;
    path: string;
    passive?: boolean;

    handler: (request: Request) => unknown;
}
