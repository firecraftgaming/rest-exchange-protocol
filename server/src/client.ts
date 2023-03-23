import {v4} from 'uuid';
import {ClientManager} from './clients';

export class Client {
    public readonly id: string;
    public data: any; // This is for the developer that uses this library to store whatever they want, like a user object or current authentication state

    private readonly manager: ClientManager;
    constructor(manager: ClientManager) {
        this.id = v4();
        this.manager = manager;
        manager.add(this);
    }

    destroy() {
        this.manager.destroy(this.id);
    }
}