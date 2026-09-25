export class Request {
    public readonly data?: unknown;
    public params?: Record<string, string> = {};
    public query?: Record<string, string> = {};
    public raw?: unknown;
    constructor(data: unknown) {
        this.data = data;
    }

    setRaw(raw: unknown) {
        this.raw = raw;
    }

    setParams(params: Record<string, string>) {
        this.params = params;
    }

    setQuery(query: Record<string, string>) {
        this.query = query;
    }

    getRaw() {
        return this.raw;
    }

    getParams() {
        return this.params;
    }

    getQuery() {
        return this.query;
    }

    getData() {
        return this.data;
    }
}