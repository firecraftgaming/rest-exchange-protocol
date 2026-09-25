export class TestableSocket {
    public static readonly OPEN = 1;
    public static readonly CLOSED = 3;

    public readonly OPEN = TestableSocket.OPEN;
    public readyState = TestableSocket.OPEN;

    public sent: string[] = [];
    public closed = false;

    public send(data: string) {
        this.sent.push(data);
    }
    public close() {
        this.closed = true;
    }
    public addEventListener() {}
    public removeEventListener() {}
}
