
/*
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
 */

(function() {
  
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
;
  var ajaxessioAJAX, ajaxessioEventSource, ajaxessioSocketIO;

  ajaxessioAJAX = {
    open: false,
    open: function() {
      var promise;
      promise = new Promise();
      if (!this.open) {
        this.open = true;
      }
      promise.resolve();
      return promise;
    },
    close: function() {
      var promise;
      promise = new Promise();
      if (this.open) {
        this.open = false;
      }
      promise.resolve();
      return promise;
    },
    emit: function(fn) {
      this._errors(fn, 'emit');
      this._ajax('POST', this.__namespace, this.__data, this._callbacks(fn));
      this._reset();
      return this;
    },
    "do": function(fn) {
      this._errors(fn, this.__once ? 'once' : 'do');
      this._ajax('GET', this.__namespace, this.__data, this._callbacks(fn));
      this._reset();
      return this;
    },
    once: function(fn) {
      this.__once = true;
      return this["do"](fn);
    }
  };

  ajaxessioEventSource = {
    es: null,
    open: function() {
      var promise;
      promise = new Promise();
      this.es = new EventSource(this.path);
      this.es.addEventListener('open', (function(_this) {
        return function() {
          promise.resolve();
          return _this.es.addEventListener('error', function(r) {
            if (callbacks.fail != null) {
              return callbacks.fail(e.toString());
            }
          });
        };
      })(this));
      return promise;
    },
    close: function() {
      var promise;
      promise = new Promise();
      this.es.close();
      promise.resolve();
      return promise;
    },
    emit: function(fn) {
      this._errors(fn, 'emit');
      this._ajax('POST', this.__namespace, this.__data, this._callbacks(fn));
      this._reset();
      return this;
    },
    "do": function(fn) {
      var callbacks;
      this._errors(fn, 'do');
      callbacks = this._callbacks(fn);
      this.es.addEventListener(this.__namespace, (function(_this) {
        return function(r) {
          var e, response, responseType;
          response = r.data;
          responseType = _this.args.response;
          try {
            if (responseType === 'json') {
              response = _this._json(response);
            } else if (responseType === 'xml') {
              response = _this._xml(response);
            }
          } catch (_error) {
            e = _error;
            if (callbacks.fail != null) {
              callbacks.fail(e.toString());
            }
            return -1;
          }
          if (callbacks.done != null) {
            return callbacks.done(response);
          }
        };
      })(this));
      this._reset();
      return this;
    },
    once: function(fn) {
      return this["do"](fn);
    }
  };

  ajaxessioSocketIO = {
    socket: null,
    open: function() {
      var promise, s;
      promise = new Promise();
      s = this.path;
      if (this.port) {
        s = this.path + ":" + this.port;
      }
      this.socket = new io(s, {
        'forceNew': true
      });
      this.socket.on('connect', function() {
        return promise.resolve();
      });
      return promise;
    },
    close: function() {
      var promise;
      promise = new Promise();
      this.socket.close();
      promise.resolve();
      return promise;
    },
    emit: function(fn) {
      var callbacks;
      this._errors(fn, 'emit');
      callbacks = this._callbacks(fn);
      this.socket.emit(this.__namespace, this.__data, function(r) {
        if (callbacks.done != null) {
          return callbacks.done(r);
        }
      });
      this._reset();
      return this;
    },
    "do": function(fn) {
      var callbacks;
      this._errors(fn, 'do');
      callbacks = this._callbacks(fn);
      this.socket.on(this.__namespace, function(r) {
        if (callbacks.done != null) {
          return callbacks.done(r);
        }
      });
      this._reset();
      return this;
    },
    once: function(fn) {
      var callbacks;
      this._errors(fn, 'once');
      callbacks = this._callbacks(fn);
      this.socket.once(this.__namespace, function(r) {
        if (callbacks.done != null) {
          return callbacks.done(r);
        }
      });
      this._reset();
      return this;
    }
  };

  window.ajaxessio = (function() {
    ajaxessio.prototype.__fail = null;

    ajaxessio.prototype.__namespace = null;

    ajaxessio.prototype.__data = [];

    ajaxessio.prototype.__delay = 250;

    ajaxessio.prototype.__once = false;

    ajaxessio.prototype._isEmpty = function(obj) {
      var key;
      if (typeof obj === 'object') {
        for (key in obj) {
          return false;
        }
        true;
      }
      return (obj != null) && obj;
    };

    ajaxessio.prototype._errors = function(fn, action) {
      if (action == null) {
        action = 'do';
      }
      if (this.__namespace === null) {
        throw {
          name: 'No route defined',
          message: 'route should be set by calling .route("namespace")',
          toString: function() {
            return this.name + ":" + this.message;
          }
        };
      }
      if (action === 'emit' && this._isEmpty(this.__data)) {
        throw {
          name: 'No data found',
          message: 'empty data can not be sent. Set data by calling .with([object])',
          toString: function() {
            return this.name + ":" + this.message;
          }
        };
      }
      if (this.__fail && typeof this.__fail !== 'function') {
        throw {
          name: 'Error callback invalid',
          message: 'error should be set by calling .error([function])',
          toString: function() {
            return this.name + ":" + this.message;
          }
        };
      }
      if (this.__fail && typeof this.__fail !== 'function') {
        throw {
          name: 'Error callback invalid',
          message: 'error should be set by calling .error([function])',
          toString: function() {
            return this.name + ":" + this.message;
          }
        };
      }
      if (this.__fail && typeof this.__fail !== 'function') {
        throw {
          name: 'Error callback invalid',
          message: 'error should be set by calling .error([function])',
          toString: function() {
            return this.name + ":" + this.message;
          }
        };
      }
      if (fn && (typeof fn !== 'function')) {
        throw {
          name: 'Success callback invalid',
          message: "success callback should be set by calling ." + action + "([function])",
          toString: function() {
            return this.name + ":" + this.message;
          }
        };
      }
    };

    ajaxessio.prototype._callbacks = function(fn) {
      var callbacks;
      callbacks = {};
      if (typeof this.__fail === 'function') {
        callbacks['fail'] = this.__fail;
      }
      if (typeof fn === 'function') {
        callbacks['done'] = fn;
      }
      return callbacks;
    };

    ajaxessio.prototype._reset = function() {
      this.__fail = null;
      this.__namespace = null;
      this.__data = [];
      this.__delay = 250;
      return this.__once = false;
    };

    ajaxessio.prototype._xml = function(str) {
      var xml;
      if (window.DOMParser != null) {
        xml = new window.DOMParser();
        return xml.parseFromString(str.trim(), 'text/xml');
      } else if ((window.ActiveXObject != null) && (xml = new window.ActiveXObject('Microsoft.XMLDOM'))) {
        xml.async = 'false';
        xml.loadXML(str.trim());
        return xml;
      } else {
        throw {
          name: 'XML Parser not available',
          message: 'this browser does not support XML parsing.',
          toString: function() {
            return this.name + ":" + this.message;
          }
        };
      }
    };

    ajaxessio.prototype._json = function(str) {
      var data, e;
      try {
        data = JSON.parse(str.trim());
      } catch (_error) {
        e = _error;
        throw {
          name: 'Invalid json or url/route',
          message: 'the json response was invalid. ' + e,
          toString: function() {
            return this.name + ":" + this.message;
          }
        };
      }
      return data;
    };

    ajaxessio.prototype._ajax = function(type, route, data, callbacks, force) {
      var a, e, key, poll, q, search, val, x;
      if (force == null) {
        force = false;
      }
      if (!force && !this.open) {
        return -1;
      }
      poll = true;
      if (window.XMLHttpRequest != null) {
        x = new XMLHttpRequest();
      }
      if (window.XMLHttpRequest == null) {
        x = new ActiveXObject('Microsoft.XMLHTTP');
      }
      x.onreadystatechange = (function(_this) {
        return function() {
          var contentType, e, ref, response, responseType;
          if (!force && !_this.open) {
            x.abort();
            return -1;
          }
          if (x.readyState === 4) {
            response = x.response || x.responseText;
            if (!response) {
              x.abort();
              return -1;
            }
            responseType = 'text';
            contentType = !_this.args.response ? (x.getResponseHeader('Content-Type')).toLowerCase() : _this.args.response.toLowerCase();
            try {
              if (contentType.indexOf('json' > -1)) {
                response = _this._json(response);
                responseType = 'json';
              } else if (contentType.indexOf('json' > -1)) {
                response = _this._xml(response);
                responseType = 'xml';
              }
            } catch (_error) {
              e = _error;
              if (callbacks.fail != null) {
                callbacks.fail(e.toString());
              }
              x.abort();
              return -1;
            }
            if ((200 >= (ref = x.status) && ref < 300) || x.status === 304) {
              if (_this.__once && !_this._isEmpty(response)) {
                poll = false;
              }
              if ((!_this._isEmpty(response)) && (callbacks.done != null)) {
                callbacks.done(response, x.status, x.statusText, x);
              }
            } else if (callbacks.fail != null) {
              callbacks.fail(response, x.status, x.statusText, x);
            }
            x.abort();
            if (type === 'GET' && poll) {
              return setTimeout(function() {
                return _this._ajax(type, route, data, callbacks);
              }, _this.__delay);
            }
          }
        };
      })(this);
      q = [];
      q = (function() {
        var results;
        results = [];
        for (key in data) {
          val = data[key];
          val = typeof val === 'function' ? val() : val;
          results.push((encodeURIComponent(key)) + "=" + (encodeURIComponent(val)));
        }
        return results;
      })();
      if (type === 'GET') {
        a = document.createElement('a');
        a.href = this.path;
        search = a.search !== '' ? '&' : '?';
        q = q.length ? search + q.join('&') : '';
        x.open(type, "" + this.path + route + q, true);
        x.timeout = this.args.timeout;
        try {
          x.send(null);
        } catch (_error) {
          e = _error;
        }
      } else if (type === 'POST') {
        x.open(type, "" + this.path + route, true);
        x.timeout = this.args.timeout;
        x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        try {
          x.send(q.join('&'));
        } catch (_error) {
          e = _error;
        }
      }
      x.ontimeout = (function(_this) {
        return function() {
          if (type === 'GET' && poll) {
            return setTimeout(function() {
              return _this._ajax(type, route, data, callbacks);
            }, _this.__delay);
          }
        };
      })(this);
      return x;
    };

    ajaxessio.prototype.route = function(namespace) {
      this.__namespace = namespace;
      return this;
    };

    ajaxessio.prototype["with"] = function(data) {
      this.__data = data;
      return this;
    };

    ajaxessio.prototype.error = function(fn) {
      this.__fail = fn;
      return this;
    };

    ajaxessio.prototype.delay = function(ms) {
      if ((!isNaN(ms)) && ((function(x) {
        return (x | 0) === x;
      })(parseFloat(ms)))) {
        this.__delay = parseInt(ms);
      }
      return this;
    };

    ajaxessio.include = function(obj) {
      var key, ref, value;
      for (key in obj) {
        value = obj[key];
        if (key !== 'included') {
          this.prototype[key] = value;
        }
      }
      if ((ref = obj.included) != null) {
        ref.apply(this);
      }
      return this;
    };

    function ajaxessio(type, path, port_args) {
      this.type = type;
      this.path = path;
      if (type === 'ajax') {
        this.args = {
          response: 'json',
          timeout: 30000
        };
        if (port_args && 'response' in port_args) {
          this.args.response = port_args.response;
        }
        if (port_args && 'timeout' in port_args) {
          this.args.timeout = port_args.timeout;
        }
        ajaxessio.include(ajaxessioAJAX);
      } else if (type === 'es') {
        this.args = {
          response: 'json'
        };
        if (port_args && 'response' in port_args) {
          this.args.response = port_args.response;
        }
        ajaxessio.include(ajaxessioEventSource);
      } else if (type === 'sio') {
        this.port = port_args || false;
        ajaxessio.include(ajaxessioSocketIO);
      } else {
        throw {
          name: 'Invalid connection type',
          message: 'type should either be "ajax" for long polling, "es" for EventSource or "sio" Socket.IO/WebSockets',
          toString: function() {
            return this.name + ":" + this.message;
          }
        };
      }
    }

    return ajaxessio;

  })();

  if (typeof window.define === "function" && window.define.amd) {
    window.define("ajaxessio", [], function() {
      return window.ajaxessio;
    });
  }

}).call(this);
