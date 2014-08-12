Error.stackTraceLimit = Infinity;

var MessageBus = require('../lib/MessageBus');
var cps = require('cps');

var cb = function(err, res) {
    if (err) {
        console.log('ERROR: ', err);
        console.log(err.stack);
    } else {
        console.log('OK: ', err);
    }
};


var mb = new MessageBus({
    mysql_config: {
        host     : 'localhost',
        user     : 'root',
        password : '',
        database: "message_bus"
    },
    resque_configs: [
        {
            "host": "localhost",
            "port": 6379,
            "timeout": 3000
        }
    ]
});


var tick = function() {
    var i = 0;
    return function() {
        return i++ % 20;
    };
}();

mb.addListener('test:foobar100', function(args, cb) {
    console.log('===== start with args: ', args, '========');
    setTimeout(function(){
        console.log('===== finish with args: ', args, '========');
        if (tick() > 5) {
            cb(new Error('fail 10'));
            // cb();
        } else {
            cb();
        }
    }, 1000);
}, 5);


setTimeout(function() {
    console.log('start to stop message bus');
    cps.seq([
        function(_, cb) {
            mb.stop(cb);
        },
        function(_, cb) {
            console.log('message bus stopped');
            cb();
        }
    ], cb);

}, 1000 * 1000);

/*
mb.addListener('test:foobar100', function(args, cb) {
    console.log('===== also getting args: ', args, '========');
    cb();
});
*/
