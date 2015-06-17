AjaxEsSio
======

AjaxEsSio allows seamless alteration between [socket.io](http://socket.io), [event source](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) and [long polling](https://en.wikipedia.org/wiki/Push_technology#Long_polling)
while maintaining a single client-side codebase.
jQuery is not required.

**This library is a successor of [AjaxIO](https://github.com/kamalkhan/ajaxio).**

## Why?
That's a good question. If you can setup and use a websocket server, then this library may not be for you. The sole reason for ajaxessio to be in existance is because of the fact that maintaing a websocket server is not quite maintainable for everyone. So this library is for those who want to distribute their apps to novice web users without enforcing them to setup their own websocket server implementation. It will enable you as a developer to provide all three alterations while maintaining a single client side javascript codebase so your app consumers may optionally opt in to websocket if needed. The only thing you need to do is provide the server implementations.

**This project came into existence for [Awesome Live Chat](http://bit.ly/awesome-live-chat).**

---
## Table of contents

- [Startup](#startup)
- [Usage](#usage)
 - [Create a connection](#create-a-connection)
   - [AJAX long polling](#ajax-long-polling)
   - [EventSource](#eventsource)
   - [Socket.IO](#socketio)
 - [Open the connection](#open-the-connection)
 - [Emit a message](#emit-a-message)
 - [Receive messages](#receive-messages)
 - [Receive a message (once) and stop](#receive-a-message-once-and-stop)
 - [Close the connection](#close-the-connection)
- [Development](#development)
 - [Compile coffeescript](#compile-coffeescript)
 - [Run tests](#run-tests)
 - [Build](#build)
- [License](#license)

# Startup

```html
<!-- socket.io -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.3.5/socket.io.min.js"></script>
<!-- eventsource polyfill -->
<script src="https://cdn.rawgit.com/Yaffle/EventSource/master/eventsource.min.js"></script>
<!-- ajaxessio -->
<script src="path/to/ajaxessio.min.js"></script>
```

# Usage

## Create a connection

---
### AJAX long polling

```js
/**
 * @param string 'ajax'.
 * @param string Url to server side ajax implementation.
 * @param object [optional] Arguments.
 */
conn = new ajaxessio('ajax', 'http://127.0.0.1:12345/ajax/', {
    response : 'json'
    timeout  : 30000
});
```

---
### EventSource

```js
/**
 * @param string 'es'.
 * @param string Url to server side eventsource implementation.
 * @param object [optional] Arguments.
 */
 conn = new ajaxessio('ajax', 'http://127.0.0.1:12345/es/', {
     response : 'json'
 });
```

---
### Socket.IO

```js
/**
 * @param string 'sio'.
 * @param string Url to socket server.
 * @param port   [optional] Server port.
 */
conn = new ajaxessio('sio', 'http://127.0.0.1:12345/socket', 3000);
```

---
## Open the connection

```js
conn.open().then(function(){
    // connection has been established.
});
```

---
## Emit a message

```js
conn.open().then(function(){
    conn
    .route('emit')
    .with({foo : 'bar'})
    .emit(function(response, status, statusText, xhr){
        // acknowledgement received.
    });
});
```

---
## Receive messages

```js
conn.open().then(function(){
    conn
    .route('do')
    .with({foo : 'bar'}) // GET parameters for AJAX
    .do(function(response, status, statusText, xhr){
        // message received.
    });
});
```

---
## Receive a message (once) and stop
Not available under eventsource and will fallback to .do

```js
conn.open().then(function(){
    conn
    .route('once')
    .with({foo : 'bar'}) // GET parameters for AJAX
    .once(function(response, status, statusText, xhr){
        // message received.
    });
});
```

---
## Close the connection

```js
conn.close().then(function(){
    // connection has been closed.
});
```

---
# Development

```bash
$ npm install
```

---
## Compile coffeescript
```
gulp js
```

---
## Run tests
```
gulp test
```

---
## Build
```
gulp
```

---
# License

Released under the [MIT License](http://opensource.org/licenses/MIT).
