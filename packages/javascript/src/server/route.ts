import {Request} from './responder';
import {Method} from '../shared/method';

export {Method, MethodAlias, normalizeMethod} from '../shared/method';

export interface Route {
    method: Method | string;
    path: string;

    handler: (request: Request) => unknown;
}
