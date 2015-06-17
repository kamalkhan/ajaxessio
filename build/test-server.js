var express  = require('express');
var app  = express();
var router = express.Router();
var http = require('http').Server(app);
var io   = require('socket.io')(http);
app.use(require('cors')());

// long polling

app.get('/ajax', function (req, res){
    res.send('Hello World!');
});
app.post('/ajax/emit', function (req, res){
    res.json({ foo: 'bar' });
});
app.get('/ajax/on', function (req, res){
    res.json({ foo: 'bar' });
});
app.get('/ajax/poll', function (req, res){
    setTimeout(function(){
        res.json({ foo: 'bar' });
    }, 2000);
});

// event source

// esp bcz es uses es headers.
// route : emit
app.post('/es/emit', function (req, res){
    res.json({ foo: 'bar' });
});
router.use(function(request, response, next) {
    // event stream and disable caching
    response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'//,
        //'Access-Control-Allow-Origin': '*'
    });
    // 2kB padding for IE
    response.write(':' + Array(2049).join(' ') + '\n');
    // retry after 2 seconds
    response.write('retry: 2000\n');
    // next
    next();
});
app.use('/es', router);
app.get('/es', function (request, response){
    function fn(){
        response.write('event: poll\n');
        response.write('data: {\n');
        response.write('data: "foo" : "bar"\n');
        response.write('data: }\n\n');
        setTimeout(fn, 2000);
    }
    fn();
});

// socket io

io.on('connection', function(socket){
    socket.on('emit', function(data, fn){
        if(typeof fn === 'function')
            fn(data);
    });
    socket.on('_on', function(data){
        socket.emit('on', {foo: 'bar'});
        socket.emit('on', {foo: 'bar'});
        socket.emit('on', {foo: 'bar'});
    });
    socket.on('_poll', function(data){
        function fn(){
            socket.emit('poll', {foo: 'bar'});
            setTimeout(fn, 2000);
        }
        fn();
    });
});

module.exports = function(port, cb){
    var server = http.listen(port, function(){
        var host = server.address().address;
        var port = server.address().port;
        if(typeof cb === 'function') cb(host, port);
    });
    return server;
};
