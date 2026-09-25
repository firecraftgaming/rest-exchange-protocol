# REST Exchange Protocol

REST Exchange Protocol (REP) is a protocol for exchanging data between a server and a client. It is based on the 
REST architectural style and the HTTP protocol, but also the Websocket protocol. It is designed to be simple and 
lightweight, and to be easy to implement. The unique thing that is the aim of this protocol is to provide an easy 
way to create REST apis that works in parallel with websockets to provide a real-time communication between the 
server and client. It also provides a faster communication between the server and client, because it does not need 
to negotiate a new TCP handshake between requests. Another key thing is *Reverse REST* which is a way to send 
REST requests from a server to a client using websockets.

## Installation

The JavaScript/TypeScript implementation ships as a single npm package, `rest-exchange-protocol`, with the
server and client as separate entry points:

```sh
npm install rest-exchange-protocol
```

```ts
import { REPServer } from 'rest-exchange-protocol';
import { REPClient } from 'rest-exchange-protocol/client';
```

See [packages/javascript](packages/javascript) for full usage docs, and [docs/protocol.md](docs/protocol.md) for
the language-neutral protocol specification.

## Contributions

REST Exchange Protocol is open to contributions, but it is recommended to create an issue or communicate with one of the maintainers to let everyone know what you are working on first that way we don't overwrite each other.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## Maintainers

- [@firecraftgaming](https://github.com/firecraftgaming)

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details on our code of conduct.