# REST Exchange Protocol - Protocol Documentation

## Introduction

The REST Exchange Protocol is a RESTful API that is compatible with regular REST HTTP requests but also provides a 
great way to send REST requests over a WebSocket connection. This document is for anyone who wants to grasp how the 
protocol works and how to use it. This document is not meant to be a tutorial on how to use the protocol but rather 
to be an explanation of how the protocol works for the curios and those who want to implement it.

## Methods
In the REST Exchange Protocol there are 5 different methods that can be used to send messages to the server. They 
are easily translated to HTTP methods. Following are the methods and their corresponding HTTP methods.

- GET - GET
- CREATE - PUT
- DELETE - DELETE
- UPDATE - PATCH
- ACTION - POST
- REPLY - N/A (Only used for replies using the `req` property in websocket messages)

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
before).

### Data property

The `data` property is an **optional** property and can have any type.

### Request property

The `req` property is an **optional** property that if set should contain a **unique** key of any sort preferably a 
**UUID**. 

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