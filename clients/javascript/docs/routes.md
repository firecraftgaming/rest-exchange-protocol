# Routes
Routes are the way to define the URL structure of your application. One route handles a certain action on a certain URL. The route can be a static route, such as `/`, or a dynamic route, such as `/user/:id`. They are specific to the REP method (`GET`, `CREATE`, `DELETE`, `UPDATE`, `ACTION`), so a route for `GET` is not the same as a route for `CREATE`, but the same handler can be used for multiple routes, giving the same effect. A route's method can also be registered using its HTTP alias (`PUT` for `CREATE`, `PATCH` for `UPDATE`, `POST` for `ACTION`) — see the [protocol documentation](../../../docs/protocol.md) for the full mapping. Registering the same path with both a REP method and its alias (e.g. `CREATE` and `PUT`) produces two identical routes, so avoid doing that.

Use register a route like this:

```ts
const app = new REPClient();
app.routes.register({
    path: '/user/:id', 
    method: 'GET',
    handler: (request) => {
        return `Hello, user ${request.params.id}!`;
    },
});
```

There are also shortcuts for all the methods, such as:

```ts
const app = new REPClient();
app.routes.get('/user/:id', (request) => {
    return `Hello, user ${request.params.id}!`;
});
```

Note that the handler can be an async function, so you can use `await` in the handler.
Also note that the handler can return any type of data and this will send a successful response (200) with the data as the body. If you want to send a different status code throw an `WebError` with the status code you want.

```ts
const app = new REPClient();
app.routes.get('/user/:id', async (request) => {
    const user = await getUser(request.params.id); // getUser, does not exist but is used as an example
    if (!user) {
        throw new WebError('User not found', 404);
    }
    return user;
});
```

## Static routes

Static routes are the simplest routes, they are just a string that matches the URL exactly. For example, the route `/` will match the URL `/`, but not `/about` or `/about/`.

## Dynamic routes

Dynamic routes are routes that can have a variable part, such as `/user/:id`. The variable part is defined by a colon (`:`) followed by the name of the variable. The variable part can be any string, but it is recommended to use a descriptive name. The variable part can be used in the handler by using the `params` property on the `request` object.

```ts
const app = new REPClient();
app.routes.get('/user/:id', (request) => {
    return `Hello, user ${request.params.id}!`;
});
```

## Passive routes

A normal route is matched exclusively — the most specific match wins and only its handler runs.
Sometimes you want the opposite: several independent pieces of code all reacting to the same
server-pushed request, such as multiple listeners for a real-time event. That's what a **passive**
route is for.

Register one with `routes.listen`, or by setting `passive: true` on `register`:

```ts
const app = new REPClient();
app.routes.listen('ACTION', '/events/order/:id', (request) => {
    // do something with the event
});
```

Passive routes are matched the same way normal routes are (static segments, `:params`), but every
passive route matching the incoming request runs, in the order they were registered, before the
normal route (if any) is dispatched. A passive handler's return value is discarded — it cannot
produce the response. It can only affect the outcome by throwing: throw a `WebError` (or any error,
which becomes a 500) to abort the request and send that error as the response; a plain `return` lets
the chain continue. A passive can also throw `MiddlewareProhibitFurtherExecution` to abort the
request without sending any reply at all, the same escape hatch middleware has.

If every passive handler passes and no normal route matched the request, the client replies with
`200 {}`. A 404 is only sent when neither a normal route nor any passive route matched.