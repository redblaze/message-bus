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

mb.addListener('test:foobar100', function(args, cb) {
    console.log('===== start with args: ', args, '========');
    setTimeout(function(){
        console.log('===== finish with args: ', args, '========');
        if (args.length > 4) {
            // cb(new Error('greater than 4'));
            cb();
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

}, 2 * 1000);

/*
mb.addListener('test:foobar100', function(args, cb) {
    console.log('===== also getting args: ', args, '========');
    cb();
});
*/
