# Middlewares
Middlewares are used to extend the functionality of the framework. They can easily be added to the application by using the `use` method on the `REPClient` instance.

```ts
const app = new REPClient();
app.use((data) => {
    // do something with the data
});
```

The middleware works by returning when it is done, the middleware can be async and can also return a promise. If the middleware does not wish to continue the flow of the application, such as if it has already responded to the request, it can throw a `MiddlewareProhibitFurtherExecution` error.

## Data object

The data object is an object with varying properties depending on the `data.type` property, which is persistent and always exists, the property can be one of the following:
- websocket-message
- pre-route

### Websocket Message
The websocket message data object has the following properties:
- `type`: `websocket-message`
- `data`: The websocket message object (from the `ws` package, a `string` or `Buffer`)

### Pre Route
The pre route data object has the following properties:
- `type`: `pre-route`
- `route`: The route object
- `request`: The request object

## Examples
Below you'll find an example of how a middleware could look like.
```ts
const app = new REPClient();
app.use((data) => {
    switch (data.type) {
        case 'websocket-message':
            // do something with the websocket message
            
            // data.data is the websocket message object
            break;
        case 'pre-route':
            // do something with the route
            
            // data.route is the route object
            // data.request is the request object
            break;
    }
});
```

If you want to eg. send a custom response to the client on a route you could do the following:
```ts
const app = new REPClient();
app.use((data) => {
    if (data.type === 'pre-route' && data.route.path === '/custom') {
        // Some custom response
        throw new MiddlewareProhibitFurtherExecution();
    }
});
```