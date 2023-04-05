# Middlewares
Middlewares are used to extend the functionality of the framework. They can easily be added to the application by using the `use` method on the `REPServer` instance.

```ts
const app = new REPServer();
app.use((data) => {
    // do something with the data
});
```

The middleware works by returning when it is done, the middleware can be async and can also return a promise. If the middleware does not wish to continue the flow of the application, such as if it has already responded to the request, it can throw a `MiddlewareProhibitFurtherExecution` error.

## Data object

The data object is an object with varying properties depending on the `data.type` property, which is persistent and always exists, the property can be one of the following:
- websocket-connect
- websocket-message
- websocket-close
- http
- pre-route

### Websocket Connect
The websocket connect data object has the following properties:
- `type`: `websocket-connect`
- `client`: The websocket client object
- `request`: The websocket request object (from the `ws` package, a `http.IncomingMessage`)

### Websocket Message
The websocket message data object has the following properties:
- `type`: `websocket-message`
- `client`: The websocket client object
- `data`: The websocket message object (from the `ws` package, a `string` or `Buffer`)

### Websocket Close
The websocket close data object has the following properties:
- `type`: `websocket-close`
- `client`: The websocket client object

### HTTP
The HTTP data object has the following properties:
- `type`: `http`
- `request`: The HTTP request object (from the `http` package, a `http.IncomingMessage`)
- `response`: The HTTP response object (from the `http` package, a `http.ServerResponse`)

### Pre Route
The pre route data object has the following properties:
- `type`: `pre-route`
- `route`: The route object
- `responder`: The responder object

## Examples
Below you'll find an example of how a middleware could look like.
```ts
const app = new REPServer();
app.use((data) => {
    switch (data.type) {
        case 'websocket-connect':
            // do something with the websocket connection
            
            // data.client is the websocket client object
            // data.request is the websocket request object
            break;
        case 'websocket-message':
            // do something with the websocket message
            
            // data.client is the websocket client object
            // data.data is the websocket message object
            break;
        case 'websocket-close':
            // do something with the websocket close
            
            // data.client is the websocket client object
            break;
        case 'http':
            // do something with the HTTP request
            
            // data.request is the HTTP request object
            // data.response is the HTTP response object
            break;
        case 'pre-route':
            // do something with the route
            
            // data.route is the route object
            // data.responder is the responder object
            break;
    }
});
```

If you want to eg. send a custom response to the client on a route you could do the following:
```ts
const app = new REPServer();
app.use((data) => {
    if (data.type === 'pre-route' && data.route.path === '/custom') {
        data.responder.send('Hello World!');
        throw new MiddlewareProhibitFurtherExecution();
    }
});
```