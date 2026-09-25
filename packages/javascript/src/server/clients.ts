import {Client} from './client';

export class ClientManager {
    private readonly clients = new Map<string, Client>();

    public get(id: string) {
        return this.clients.get(id);
    }

    public destroy(id: string) {
        this.clients.delete(id);
    }

    public add(client: Client) {
        this.clients.set(client.id, client);
    }

    public getAll() {
        return Array.from(this.clients.values());
    }

    public get size() {
        return this.clients.size;
    }
}