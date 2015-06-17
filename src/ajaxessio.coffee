###
AjaxEsSio v0.0.1
Seamless Socket.IO/WebSocket with EventSource and AJAX long polling fallbacks.
http://bhittani.com/javascript/ajaxessio

Copyright (c) 2015 M. Kamal Khan <shout@bhittani.com>

The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
###

# https://gist.github.com/briancavalier/814318
`
function Promise() {
    var callbacks = [],
    promise = {
        resolve: resolve,
        reject: reject,
        then: then,
        safe: {
            then: function safeThen(resolve, reject) {
                promise.then(resolve, reject);
            }
        }
    };
    function complete(type, result) {
        promise.then = type === 'reject'
        ? function(resolve, reject) { reject(result); }
        : function(resolve)         { resolve(result); };

        promise.resolve = promise.reject = function() {
            throw new Error("Promise already completed");
        };

        var i = 0, cb;
        while(cb = callbacks[i++]) { cb[type] && cb[type](result); }

        callbacks = null;
    }

    function resolve(result) {
        complete('resolve', result);
    }
    function reject(err) {
        complete('reject', err);
    }
    function then(resolve, reject) {
        callbacks.push({ resolve: resolve, reject: reject });
    }

    return promise;
};
`

ajaxessioAJAX =

    open : off

    open : () ->
        promise = new Promise()
        if not @open then @open = on
        promise.resolve()
        promise

    close : () ->
        promise = new Promise()
        if @open then @open = off
        promise.resolve()
        promise

    emit : (fn) ->
        @_errors fn, 'emit'
        @_ajax 'POST', @__namespace, @__data, @_callbacks fn
        @_reset()
        @

    do   : (fn) ->
        @_errors fn, if @__once then 'once' else 'do'
        @_ajax 'GET', @__namespace, @__data, @_callbacks fn
        @_reset()
        @

    once : (fn) ->
        @__once = yes
        @do fn

ajaxessioEventSource =

    es : null

    open : () ->
        promise = new Promise()
        @es = new EventSource @path
        @es.addEventListener 'open', =>
            promise.resolve()
            @es.addEventListener 'error', (r) =>
                callbacks.fail e.toString() if callbacks.fail?
        promise

    close : () ->
        promise = new Promise()
        @es.close()
        promise.resolve()
        promise

    emit : (fn) ->
        @_errors fn, 'emit'
        @_ajax 'POST', @__namespace, @__data, @_callbacks fn
        @_reset()
        @

    do : (fn) ->
        @_errors fn, 'do'
        callbacks = @_callbacks fn
        @es.addEventListener @__namespace, (r) =>
            response = r.data
            responseType = @args.response
            try
                if responseType is 'json'
                    response = @_json response
                else if responseType is 'xml'
                    response = @_xml response
            catch e
                callbacks.fail e.toString() if callbacks.fail?
                return -1
            callbacks.done response if callbacks.done?
        @_reset()
        @

    once : (fn) ->
        @do fn

ajaxessioSocketIO =

    socket : null

    open : () ->
        promise = new Promise()
        s = @path
        if @port then s = "#{@path}:#{@port}"
        @socket = new io s,
            'forceNew': yes
        @socket.on 'connect', ->
            promise.resolve()
        promise

    close : () ->
        promise = new Promise()
        @socket.close()
        promise.resolve()
        promise

    emit : (fn) ->
        @_errors fn, 'emit'
        callbacks = @_callbacks fn
        @socket.emit @__namespace, @__data, (r) ->
            callbacks.done r if callbacks.done?
        @_reset()
        @

    do : (fn) ->
        @_errors fn, 'do'
        callbacks = @_callbacks fn
        @socket.on @__namespace, (r) ->
            callbacks.done r if callbacks.done?
        @_reset()
        @

    once : (fn) ->
        @_errors fn, 'once'
        callbacks = @_callbacks fn
        @socket.once @__namespace, (r) ->
            callbacks.done r if callbacks.done?
        @_reset()
        @

class window.ajaxessio

    __fail      : null
    __namespace : null
    __data      : []

    # polling
    __delay : 250
    __once  : no

    _isEmpty : (obj) ->
        if typeof obj is 'object'
            for key of obj
                return no
            yes
        obj? and obj

    _errors : (fn, action = 'do') ->
        if @__namespace is null
            throw
                name     : 'No route defined'
                message  : 'route should be set by calling .route("namespace")'
                toString : -> "#{@name}:#{@message}"
        if action is 'emit' and @_isEmpty @__data
            throw
                name     : 'No data found'
                message  : 'empty data can not be sent. Set data by calling .with([object])'
                toString : -> "#{@name}:#{@message}"
        if @__fail and typeof @__fail isnt 'function'
            throw
                name     : 'Error callback invalid'
                message  : 'error should be set by calling .error([function])'
                toString : -> "#{@name}:#{@message}"
        if @__fail and typeof @__fail isnt 'function'
            throw
                name     : 'Error callback invalid'
                message  : 'error should be set by calling .error([function])'
                toString : -> "#{@name}:#{@message}"
        if @__fail and typeof @__fail isnt 'function'
            throw
                name     : 'Error callback invalid'
                message  : 'error should be set by calling .error([function])'
                toString : -> "#{@name}:#{@message}"
        if fn and (typeof fn isnt 'function')
            throw
                name     : 'Success callback invalid'
                message  : "success callback should be set by calling .#{action}([function])"
                toString : -> "#{@name}:#{@message}"

    _callbacks : (fn) ->
        callbacks = {}
        if typeof @__fail is 'function'
            callbacks['fail'] = @__fail
        if typeof fn is 'function'
            callbacks['done'] = fn
        callbacks

    _reset : () ->
        @__fail      = null
        @__namespace = null
        @__data      = []
        @__delay     = 250
        @__once      = no

    # beta
    _xml : (str) ->
        if window.DOMParser?
            xml = new window.DOMParser()
            xml.parseFromString str.trim(), 'text/xml'
        else if window.ActiveXObject? and (xml = new window.ActiveXObject 'Microsoft.XMLDOM')
            xml.async = 'false'
            xml.loadXML str.trim()
            xml
        else
            throw
                name     : 'XML Parser not available'
                message  : 'this browser does not support XML parsing.'
                toString : -> "#{@name}:#{@message}"

    _json : (str) ->
        try
            data = JSON.parse str.trim()
        catch e
            throw
                name     : 'Invalid json or url/route'
                message  : 'the json response was invalid. ' + e
                toString : -> "#{@name}:#{@message}"
        data

    # placed here because used by both 'ajax' and 'es'
    _ajax : (type, route, data, callbacks, force = no) ->
        if not force and not @open then return -1
        poll = yes
        x = new XMLHttpRequest() if window.XMLHttpRequest?
        x = new ActiveXObject 'Microsoft.XMLHTTP' if not window.XMLHttpRequest?
        x.onreadystatechange = =>
            if not force and not @open
                x.abort()
                return -1
            if x.readyState is 4
                response = x.response || x.responseText
                if not response
                    x.abort()
                    return -1
                responseType = 'text'
                contentType = if not @args.response
                    (x.getResponseHeader 'Content-Type').toLowerCase()
                else @args.response.toLowerCase()

                # clean response: json, xml or text?
                try
                    if contentType.indexOf 'json' > -1
                        response = @_json response
                        responseType = 'json'
                    else if contentType.indexOf 'json' > -1
                        response = @_xml response
                        responseType = 'xml'
                catch e
                    callbacks.fail e.toString() if callbacks.fail?
                    x.abort()
                    return -1

                # Success
                if 200 >= x.status < 300 or x.status is 304
                    if @__once and not @_isEmpty response
                        poll = no
                    if (not @_isEmpty response) and callbacks.done?
                        callbacks.done response, x.status, x.statusText, x
                # Error
                else if callbacks.fail?
                        callbacks.fail response, x.status, x.statusText, x
                x.abort()
                # Polling
                if type is 'GET' and poll
                    setTimeout =>
                        @_ajax type, route, data, callbacks
                    , @__delay

        q = []
        q = for key, val of data
            val = if typeof val is 'function' then val() else val
            "#{encodeURIComponent key}=#{encodeURIComponent val}"

        if type is 'GET'
            a = document.createElement 'a'
            a.href = @path
            search = if a.search isnt '' then '&' else '?'
            q = if q.length then search + q.join '&' else ''
            x.open type, "#{@path}#{route}#{q}", true
            x.timeout = @args.timeout
            try
                x.send null
            catch e
                #
        else if type is 'POST'
            x.open type, "#{@path}#{route}", true
            x.timeout = @args.timeout
            x.setRequestHeader 'Content-type', 'application/x-www-form-urlencoded'
            try
                x.send q.join '&'
            catch e
                #
        x.ontimeout = =>
            if type is 'GET' and poll
                setTimeout =>
                    @_ajax type, route, data, callbacks
                , @__delay
        x

    route : (namespace) ->
        @__namespace = namespace
        @

    with : (data) ->
        @__data = data
        @

    error : (fn) ->
        @__fail = fn
        @

    delay : (ms) ->
        # http://stackoverflow.com/questions/14636536/#14794066
        @__delay = parseInt ms if (not isNaN ms) and (((x) -> (x | 0) is x ) parseFloat ms)
        @

    @include : (obj) ->
        for key, value of obj when key not in ['included']
            @::[key] = value
        obj.included?.apply @
        @

    constructor: (type, path, port_args) ->
        @type = type
        @path = path

        if type is 'ajax'
            @args =
                response : 'json'
                timeout : 30000
            @args.response = port_args.response if port_args and 'response' of port_args
            @args.timeout = port_args.timeout if port_args and 'timeout' of port_args
            ajaxessio.include ajaxessioAJAX
        else if type is 'es'
            @args =
                response : 'json'
            @args.response = port_args.response if port_args and 'response' of port_args
            ajaxessio.include ajaxessioEventSource
        else if type is 'sio'
            @port = port_args || off
            ajaxessio.include ajaxessioSocketIO
        else
            throw
                name     : 'Invalid connection type'
                message  : 'type should either be "ajax" for long polling, "es" for EventSource or "sio" Socket.IO/WebSockets'
                toString : -> "#{@name}:#{@message}"

# support AMD
if typeof window.define is "function" && window.define.amd
    window.define "ajaxessio", [], -> window.ajaxessio
