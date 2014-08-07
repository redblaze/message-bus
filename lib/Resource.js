var Class = require('better-js-class');
var cps = require('cps');
var EventEmitter = require('events').EventEmitter;

var Resource = Class({
    _init: function(cfg) {
        this._max = cfg['max'];
        this._used = 0;
        this._queue = [];

        this.events = new EventEmitter();
    },

    acquire: function(cb) {
        var me = this;

        if (me._used < me._max) {
            me._used++;
            cb();
        } else {
            me._queue.push(cb);
        }
    },

    release: function() {
        var me = this;

        me._used--;
        while (me._queue.length > 0 && me._used < me._max) {
            var cb = me._queue.shift();
            me._used++;
            cb();
        }
        if (me.isIdling()) {
            me.events.emit('idle');
        }
    },

    isIdling: function() {
        return this._used == 0 && this._queue.length == 0
    }
});

module.exports = Resource;