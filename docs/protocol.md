# REST Exchange Protocol - Protocol Documentation

## Introduction

The REST Exchange Protocol is a RESTful API that is compatible with regular REST HTTP requests but also provides a 
great way to send REST requests over a WebSocket connection. This document is for anyone who wants to grasp how the 
protocol works and how to use it. This document is not meant to be a tutorial on how to use the protocol but rather 
to be an explanation of how the protocol works for the curios and those who want to implement it.

## Methods
In the REST Exchange Protocol there are 5 different methods that can be used to send messages to the server. Each 
one is accepted equally as either its REP name or its corresponding HTTP method — the two spellings are aliases 
of one another everywhere a method is accepted (over HTTP, in the websocket `method` field, and when registering 
routes).

| REP method | HTTP method (accepted as an alias) |
|---|---|
| GET | GET |
| CREATE | PUT |
| DELETE | DELETE |
| UPDATE | PATCH |
| ACTION | POST |
| REPLY | N/A (Only used for replies using the `req` property in websocket messages) |

Aliases exist so tools like `curl` are unsurprising: `curl -X PUT` and a route registered with `Method.CREATE` 
refer to the same route, and a websocket message may set `"method": "PUT"` instead of `"method": "CREATE"`. The 
REP names remain canonical — they are what route-registration shortcuts (`get`/`create`/`delete`/`update`/`action`) 
produce and what the rest of this document uses.

## Protocol

Using HTTP the protocol is no different from a regular REST API. The difference comes in how websocket requests are 
sent. The structure of those messages look like the following:

```json
{
  "target": "<URL>",
  "method": "<METHOD>",

  "data": {},

  "req": "<REQUEST ID>"
}
```

### Target property

The `target` property is a **required** property that should be set to the path.

### Method property

The `method` property is a **required** property and should be set to a **valid** method (one of the methods listed 
before, or one of their HTTP aliases).

### Data property

The `data` property is an **optional** property and can have any type.

### Request property

The `req` property is an **optional** property that if set should contain a **unique** key of any sort such as a **UUID**. 

## Replies

One should only reply with a `req` present if the `req` property was set on the incoming message, and 
should send the same `req` value back. This is used to identify the request that the reply is for. Replies should be 
sent with a method type of **REPLY**. The `target` property should be set to the same value as the incoming message.

The `data` property in a reply should be formatted as following:

```json
{
  "status": 999,

  "data": {},
  "error": {}
}
```

The `status` property should be set to any **HTTP Status Code** as a **number**. The `error` property should only be 
present and has to be present when the **status** does not start with a **2**. Similarly, the `data` property should 
only be present and has to be present when the **status** starts with a **2**. The `error` property can similarly 
to the `data` property have any type such as `string` or `array` but also `null`.

## Passive routes

A normal route is matched exclusively — of every registered route matching a request's path and
method, only the single most specific one runs, and its return value becomes the response.

Implementations may additionally support **passive** routes, matched the same way (path and
method) but not exclusively: every passive route matching a request runs, in the order it was
registered, in a first pass that precedes normal route dispatch. A passive handler cannot produce
a response body directly — it either throws, which aborts the request and sends that error as the
reply, or returns normally, in which case dispatch continues to the next passive and, after all of
them pass, to the normal route (if any).

This lets multiple independent handlers all observe the same server-pushed request — such as
several listeners reacting to the same real-time event — without one having to fan out to the
others itself.

Dispatch, when passive routes are supported, follows:

1. Find every passive route matching the request's path and method; run them in registration order.
   If any throws, that error is sent as the reply and no further handler runs. An implementation
   may additionally offer an escape hatch (such as the JS client's `MiddlewareProhibitFurtherExecution`)
   for a passive to abort the request without sending any reply at all.
2. Find the single most specific normal route matching the request, as today. If one matched, run
   it and send its return value (or thrown error) as the reply, exactly as without passive routes.
3. If no normal route matched but at least one passive route did, reply with status `200` and an
   empty `data` object (`{}`).
4. If neither a normal route nor any passive route matched, reply with `404`.

## Authentication and Headers

The REST Exchange Protocol does not specify how authentication should be handled. It is up to the developer to 
decide. Even thought we do not specify how authentication should be handled we do however recommend that you 
authenticate websocket connections using a special request instead of adding it onto all requests. This could be 
done either by defining a special route or by using a middleware.

## Examples

If we look at the following HTTP request (which would be a fully valid request to REST Exchange Protocol as well):

```http
GET /users/1 HTTP/1.1
Host: example.com
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 1,
  "name": "John Doe"
}
```

This would be sent using websockets and REST Exchange Protocol as the following:

```json
{
  "target": "/users/1",
  "method": "GET",
  
  "req": "1234"
}
```

```json
{
  "target": "/users/1",
  "method": "REPLY",

  "data": {
    "status": 200,

    "data": {
      "id": 1,
      "name": "John Doe"
    }
  },
  
  "req": "1234"
}
```