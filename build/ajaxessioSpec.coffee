describe 'AjaxEsSio', ->
    it 'should be defined', ->
        (expect window.ajaxessio).toBeDefined()

describe 'Long Polling', ->
    conn = null
    beforeEach ->
        conn = new ajaxessio 'ajax', 'http://127.0.0.1:12345/ajax/',
            response : 'json'
            timeout  : 20000
    it 'should open a connection', (done) ->
        conn.open().then -> done()
    it 'should emit a message', (done) ->
        conn.open().then ->
            conn.route 'emit'
            .with {foo : 'bar'}
            .emit (r,s,st,x) ->
                (expect r).toEqual
                    foo: 'bar'
                done()
    it 'should receive a message', (done) ->
        conn.open().then ->
            conn.route 'on'
            .with {foo : 'bar'}
            .once (r,s,st,x) ->
                (expect r).toEqual
                    foo: 'bar'
                done()
    it 'should poll for messages (1 + 2 x 02 sec)', (done) ->
        conn.open().then ->
            i = 0
            conn.route 'poll'
            .with {foo : 'bar'}
            .do (r,s,st,x) ->
                i++
                (expect r).toEqual
                    foo: 'bar'
                done() if i is 3
    , 10000
    it 'should throw an error when invalid url/route', (done) ->
        conn.open().then ->
            conn.route 'invalid'
            .with {foo : 'bar'}
            .error (r,s,st,x) ->
                done()
            .emit()
            conn.route 'invalid'
            .with {foo : 'bar'}
            .error (r,s,st,x) ->
                done()
    it 'should close the connection', (done) ->
        conn.open().then -> conn.close().then -> done()

describe 'Socket IO', ->
    conn = null
    beforeEach ->
        conn = new ajaxessio 'sio', 'http://127.0.0.1', 12345
    it 'should open a connection', (done) ->
        conn.open().then -> done()
    it 'should emit a message', (done) ->
        conn.open().then ->
            conn.route 'emit'
            .with {foo : 'bar'}
            .emit (r) ->
                (expect r).toEqual
                    foo: 'bar'
                done()
    it 'should receive a message', (done) ->
        conn.open().then ->
            conn.route 'on'
            .once (r) ->
                (expect r).toEqual
                    foo: 'bar'
                done()
            # hack! make socket emit 'on' for above
            conn.route '_on'
            .with {foo : 'bar'}
            .emit()
    it 'should poll for messages (1 + 2 x 02 sec)', (done) ->
        conn.open().then ->
            i = 0
            conn.route 'poll'
            .do (r) ->
                i++
                (expect r).toEqual
                    foo: 'bar'
                done() if i is 3
            # hack! make socket emit 'poll' for above
            conn.route '_poll'
            .with {foo : 'bar'}
            .emit()
    it 'should close the connection', (done) ->
        conn.open().then -> conn.close().then -> done()

describe 'EventSource', ->
    conn = null
    beforeEach ->
        conn = new ajaxessio 'es', 'http://127.0.0.1:12345/es/'
    it 'should open a connection', (done) ->
        conn.open().then ->
            conn.close().then -> done()
    it 'should emit a message', (done) ->
        conn.open().then ->
            conn.route 'emit'
            .with {foo : 'bar'}
            .emit (r,s,st,x) ->
                (expect r).toEqual
                    foo: 'bar'
                conn.close().then -> done()
    it 'should poll for messages (1 + 2 x 02 sec)', (done) ->
        conn.open().then ->
            i = 0
            conn.route 'poll'
            .do (r) ->
                i++
                (expect r).toEqual
                    foo: 'bar'
                if i is 3
                    conn.close().then -> done()
    it 'should close the connection', (done) ->
        conn.open().then -> conn.close().then -> done()
