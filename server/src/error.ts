export class WebError extends Error {
    public status: number;
    public type: string;

    constructor(type: string);
    constructor(type: string, status: number);

    constructor(type: string, status?: number) {
        if (!status) status = 500;

        super(type);
        this.type = type;
        this.status = status;
    }
}

export class MiddlewareProhibitFurtherExecution extends Error {
    constructor() {
        super('Middleware prohibited further execution');
    }
}