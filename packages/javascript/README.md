# rest-exchange-protocol

This is the JavaScript/TypeScript implementation of the REST Exchange Protocol (REP) — a protocol for exchanging
data between a server and a client. It is based on the REST architectural style and the HTTP protocol, but also
the Websocket protocol. It is designed to be simple and lightweight, and to be easy to implement. The unique thing
that is the aim of this protocol is to provide an easy way to create REST apis that works in parallel with
websockets to provide a real-time communication between the server and client. It also provides a faster
communication between the server and client, because it does not need to negotiate a new TCP handshake between
requests. Another key thing is *Reverse REST* which is a way to send REST requests from a server to a client using
websockets.

This single package ships both halves of the protocol as separate entry points:

```ts
import { REPServer } from 'rest-exchange-protocol';
import { REPClient } from 'rest-exchange-protocol/client';
```

## Installation

```sh
npm install rest-exchange-protocol
```

## Documentation

- [Server routes](docs/server/routes.md) / [Server middleware](docs/server/middleware.md)
- [Client routes](docs/client/routes.md) / [Client middleware](docs/client/middleware.md)
- [Protocol specification](../../docs/protocol.md)

> **Note:** `rest-exchange-protocol-client` has been merged into this package and is deprecated —
> import from `rest-exchange-protocol/client` instead.
