# REST Exchange Protocol

This is the host library for REST Exchange Protocol (REP) which is a protocol for exchanging data between a server and a client. It is based on the 
REST architectural style and the HTTP protocol, but also the Websocket protocol. It is designed to be simple and 
lightweight, and to be easy to implement. The unique thing that is the aim of this protocol is to provide an easy 
way to create REST apis that works in parallel with websockets to provide a real-time communication between the 
server and client. It also provides a faster communication between the server and client, because it does not need 
to negotiate a new TCP handshake between requests. Another key thing is *Reverse REST* which is a way to send 
REST requests from a server to a client using websockets.