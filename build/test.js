var gulp   = require('gulp');
var karma  = require('karma').server;
var port   = 12345;
var server;

var test_server = function(){
    return require('./test-server')(port, function(h, p){
        console.log('Server listening at http://%s:%s', h, p);
    });
};

var close = function(done){
    server.close(function(){
        console.log('Server closed.');
        done();
        process.exit();
    });
};

gulp.task('test', function (done) {
    server = test_server();
    karma.start({
        configFile: __dirname + '/karma.conf.coffee',
        singleRun: true
    }, function(){ close(done); });
});

gulp.task('test-watch', function (done) {
    server = test_server();
    karma.start({
        configFile: __dirname + '/karma.conf.coffee'
    }, function(){ close(done); });
});
