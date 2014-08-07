var cps = require('cps');
var Class = require('better-js-class');
var mysql = require('mysql');
var resque = require('coffee-resque');
var EventEmitter = require('events').EventEmitter;
var $U = require('underscore');

var Resource = require('./Resource');

var MessageBus = Class({
    _init: function(cfg) {
        this._mysqlCfg = cfg['mysql_config'];
        this._resqueCfgs = cfg['resque_configs'];
        this._events = new EventEmitter();
        this._queueCursor = 0;

        this._resources = [];
        this._workers = [];
        this._setupResque();

        this._status = 'running';
    },

    _setupResque: function() {
        var me = this;

        me._queues = [];
        $U.each(me._resqueCfgs, function(cfg) {
            cfg['timeout'] = cfg['timeout'] || 3000;
            var queue = resque.connect(cfg);
            me._queues.push(queue);
        });
    },

    _getResque: function() {
        var l = this._queues.length;
        return this._queues[this._queueCursor++ % l];
    },

    _saveEntry: function(name, args, cb) {
        var me = this;

        var id;
        var conn;

        cps.seq([
            function(_, cb) {
                conn = mysql.createConnection(me._mysqlCfg);
                var q = mysql.format('insert into tasks set name = ?, status = ?, args = ?', [name, 'start', JSON.stringify(args)]);
                conn.query(q, cb);
            },
            function(_, cb) {
                id = _.insertId;
                conn.end(cb);
            },
            function(_, cb) {
                cb(null, id);
            }
        ], cb);
    },

    _getArgs: function(id, cb) {
        var me = this;
        var row;
        var conn;
        cps.seq([
            function(_, cb) {
                conn = mysql.createConnection(me._mysqlCfg);
                var q = mysql.format('select * from tasks where id = ?', [id]);
                conn.query(q, cb);
            },
            function(_, cb) {
                row = _[0];
                conn.end(cb);
            },
            function(_, cb) {
                cb(null, JSON.parse(row['args']));
            }
        ], cb);
    },

    _enque: function(name, id, cb) {
        var me = this;

        var i = 0;
        var successful = false;

        cps.seq([
            function(_, cb) {
                cps.pwhile(
                    function(cb) {
                        cb(null, i < me._queues.length && !successful)
                    },
                    function(cb) {
                        cps.rescue({
                            'try': function(cb) {
                                cps.seq([
                                    function(_, cb) {
                                        var queue = me._getResque();
                                        queue.enqueue(name, 'process', [id], cb);
                                    },
                                    function(_, cb) {
                                        successful = true;
                                        cb();
                                    }
                                ], cb);
                            },
                            'catch': function(err, cb) {
                                i++;
                                cb();
                            }
                        }, cb);
                    },
                    cb
                );
            },
            function(_, cb) {
                if (!successful) {
                    throw new Error('all_queues_failed');
                } else {
                    cb();
                }
            }
        ], cb);
    },

    fire: function(name, args, cb) {
        var me = this;

        cps.seq([
            function(_, cb) {
                me._saveEntry(name, args, cb);
            },
            function(id, cb) {
                me._enque(name, id, cb);
            }
        ], cb);
    },

    _taskFailed: function(id, cb) {
        var me = this;
        var conn;
        cps.seq([
            function(_, cb) {
                conn = mysql.createConnection(me._mysqlCfg);
                var q = mysql.format('update tasks set status = ? where id = ?', ['failed', id]);
                conn.query(q, cb);
            },
            function(_, cb) {
                conn.end(cb);
            }
        ], cb);
    },

    _taskSucceeded: function(id, cb) {
        var me = this;
        var conn;
        cps.seq([
            function(_, cb) {
                conn = mysql.createConnection(me._mysqlCfg);
                var q = mysql.format('update tasks set status = ? where id = ?', ['done', id]);
                conn.query(q, cb);
            },
            function(_, cb) {
                conn.end(cb);
            }
        ], cb);
    },

    _applyProcessFn: function(fn, id, resource, cb) {
        var me = this;

        cps.rescue({
            'try': function(cb) {
                cps.seq([
                    function(_, cb) {
                        me._getArgs(id, cb);
                    },
                    function(args, cb) {
                        cps.rescue({
                            'try': function(cb) {
                                fn(args, cb);
                            },
                            'catch': function(err, cb) {
                                cps.seq([
                                    function(_, cb) {
                                        me._taskFailed(id, cb);
                                    },
                                    function(_, cb) {
                                        throw err;
                                    }
                                ], cb);
                            }
                        }, cb);
                    },
                    function(_, cb) {
                        me._taskSucceeded(id, cb);
                    }
                ], cb);
            },
            'finally': function(cb) {
                resource.release();
                cb();
            }
        }, cb);
    },

    addListener: function(name, fn, parallelism) {
        var me = this;

        parallelism = parallelism || 1;

        var resource = new Resource({
            max: parallelism
        });

        me._resources.push(resource);

        $U.each(me._queues, function(queue) {
            var worker = queue.worker(name, {process: function(id, _cb) {
                var cb = function(err, res) {
                    try {
                        if (err) {
                            console.log('ERROR with message ' + name + ':', err);
                            if (err.stack) {
                                console.log(err.stack);
                            }
                            _cb();
                        } else {
                            console.log('OK with message ' + name + ':', res);
                            _cb();
                        }
                    } catch (e) {
                        console.log('Resque process error with message ' + name + ':', e);
                    }
                };

                cps.seq([
                    function(_, cb) {
                        resource.acquire(cb);
                    },
                    function(_, cb) {
                        var _cb = function(err, res) {
                            console.log('exits');
                            try {
                                if (err) {
                                    console.log('ERROR processing message: ' + name + ':', err);
                                    if (err.stack) {
                                        console.log(err.stack);
                                    }
                                } else {
                                    console.log('OK processing message: ' + name);
                                }
                            } catch(e) {
                                console.log('top level error: ', e);
                            }
                        };
                        me._applyProcessFn(fn, id, resource, _cb);
                        cb();
                    }
                ], cb);
            }});
            me._workers.push(worker);
            worker.start();
        });
    },

    _allResourcesIdling: function() {
        for (var i = 0; i < this._resources.length; i++) {
            var resource = this._resources[i];
            if (!resource.isIdling()) {
                return false;
            }
        }

        return true;
    },

    stop: function(cb) {
        var me = this;

        $U.each(me._workers, function(worker) {
            worker.end();
        });

        $U.each(me._queues, function(queue) {
            queue.end();
        });

        if (me._allResourcesIdling()) {
            me._status = 'stopped';
            cb();
        } else {
            $U.each(me._resources, function(resource) {
                resource.events.on('idle', function() {
                    if (me._allResourcesIdling()  && me._status != 'stopped') {
                        me._status = 'stopped';
                        cb();
                    }
                });
            });
        }
    }
});

module.exports = MessageBus;
