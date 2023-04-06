# Routes
Routes are the way to define the URL structure of your application. One route handles a certain action on a certain URL. The route can be a static route, such as `/`, or a dynamic route, such as `/user/:id`. The route can also be a regular expression, such as `/user/[0-9]+`. They are specific to the HTTP method, so a route for `GET` is not the same as a route for `POST`, but the same handler can be used for multiple routes, giving the same effect.

Use register a route like this:

```ts
const app = new REPServer();
app.registerRoute({
    path: '/user/:id', 
    method: 'GET',
    handler: (request) => {
        return `Hello, user ${request.params.id}!`;
    },
});
```

There are also shortcuts for all the methods, such as:

```ts
const app = new REPServer();
app.get('/user/:id', (request) => {
    return `Hello, user ${request.params.id}!`;
});
```

Note that the handler can be an async function, so you can use `await` in the handler.
Also note that the handler can return any type of data and this will send a successful response (200) with the data as the body. If you want to send a different status code throw an `WebError` with the status code you want.

```ts
const app = new REPServer();
app.get('/user/:id', async (request) => {
    const user = await getUser(request.params.id); // getUser, does not exist but is used as an example
    if (!user) {
        throw new WebError(404, 'User not found');
    }
    return user;
});
```

## Static routes

Static routes are the simplest routes, they are just a string that matches the URL exactly. For example, the route `/` will match the URL `/`, but not `/about` or `/about/`.

## Dynamic routes

Dynamic routes are routes that can have a variable part, such as `/user/:id`. The variable part is defined by a colon (`:`) followed by the name of the variable. The variable part can be any string, but it is recommended to use a descriptive name. The variable part can be used in the handler by using the `params` property on the `request` object.

```ts
const app = new REPServer();
app.get('/user/:id', (request) => {
    return `Hello, user ${request.params.id}!`;
});
```