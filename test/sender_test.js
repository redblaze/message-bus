var cps = require('cps');

var MessageBus = require('../lib/MessageBus');

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

var cb = function(err, res) {
    if (err) {
        console.log('ERROR: ', err);
        console.log(err.stack);
    } else {
        console.log('OK: ', err);
    }
};

cps.seq([
    function(_, cb) {
        var i = 0;
        cps.pwhile(
            function(cb) {
                cb(null, i++ < 20);
            },
            function(cb) {
                mb.fire('test:foobar100', 'abc' + i, cb);
            },
            cb
        );
    },
    function(_, cb) {
        mb.stop(cb);
    }
], cb);
