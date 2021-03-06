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
    mb.stop(function() {});
};

mb.garbageCollect(cb);