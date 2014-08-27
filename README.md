message-bus
===========

This package implements message bus using redis-based queue (resque).  It provides a convenient way of building asynchronous services in node.js based architecture.

## Install

```text
npm install message-bus
```

## Use

```js
var MessgeBus = require('message-bus');
```

### APIs

* [new MessageBus](#new-MessageBus)
* [messageBus.fire](#messageBus-fire)
* [messageBus.addListener](#messageBus-addListener)
* [messageBus.stop](#messageBus-stop)
* [messageBus.garbageCollect](#messageBus-garbageCollect)
* [messageBus.retry](#messageBus-retry)

<a name='new-MessageBus'></a>
#### new MessageBus(cfg)

This creates a message bus instance.  The configuration object is of the following format:

```json
{
    "type": "Object"
    "fields": {
        "mysql_config": {
            "type": "Alias"
            "alias": "MYSQL_CONFIG"
        },
        "resque_configs": {
            "type": "Array",
            "element": {
                "type": "Alias",
                "alias": "COFFEE_RESQUE_CONFIG"
            }
        },
        "retry_limit": {
            "type": "Number"
            "nullable": true,
            "default": 5
        }
    }
}
```

Please refer to the following packages:

* [mysql](https://www.npmjs.org/package/mysql)
* [coffee-resque](https://www.npmjs.org/package/coffee-resque)

for the format of the mysql configuration and coffee-resque configuration included in messge-bus configuration.  The configuration field "retry_limit" will be used in the [retry](#messageBus-retry) API.

__Example__
```js
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
    ],
    retry_limit: 10
});
```

A message bus relies on two types of storage: mysql and resque, where mysql is used to store the message body and resque is used to trigger the listeners registered on the message.  For the mysql storage, we enforce the following schema:

```sql
create table if not exists tasks (
  id bigint(20) not null primary key auto_increment,
  version bigint(20) not null default 0,
  date_created datetime not null,
  last_updated datetime not null,
  name varchar(255) not null,
  args text not null,
  status varchar(255) not null,
  retry_times int(11) not null default 0
);
```

to exist in the database specified in the configuration object.  For resque, we allow muliple queues to be included in the configuration, which will be used in a round-robin fashion to increased the availability and stability of the message bus.  Specifically, if one resque fails, the message load will be falling back to the rest resque(s).

<a name="messageBus-fire"/>
#### messageBus.fire(event, args, callback)

* event: a string that represents an event.
* args: the payload object of the event.  It will be passed into the listener function.
* callback: a callback function to continue with the rest of the program flow.

This API fires an consumable event to the message bus, which will be handled by registered listeners of this particular event.  Note that this is NOT a pub/sub model, in that the event is consumable.  Once it is handled by one of the listeners, it is consumed and no other listeners will further receive it.

__Example__
```js
mb.fire('test:foobar100', {foo: 'bar', text: 'This is the payload.'}, cb);
```
<a name="messageBus-addListener"/>
#### messageBus.addListener(event, handler_procedure, number_of_concurrency)

* event: a string that represents an event.
* handler_procedure: the handler procedure of the event.
* number_of_concurrency: the number of concurrent threads that are allowed to process the event stream simultaneously.  This parameter is optional with a default value to be 1.

This API attaches a listener to an event.  When the event is fired, this listener will be invoked if the event is consumed by it.

__Example__
```js
mb.addListener('test:foobar100', function(args, cb) {
    console.log('start to process args: ', args);
    setTimeout(function(){
        console.log('finish to process args: ', args);
    }, 1000);
}, 5);
````
<a name="messageBus-stop"/>
#### messageBus.stop(callback)

This API shuts down the message bus and clean up resources.  It

* drains the currently running handlers (by allowing them to finish);
* tears down the mysql connections;
* tears down the resque connections.

__Example__
```js
mb.stop(cb);
```

<a name="messageBus-garbageCollect"/>
#### messageBus.garbageCollect(callback)

This API performs garbage collection on the mysql database.  It sweeps out all the messages that are either done, or had failed with fatal errors.  This API is usually used in a cron job to clean up the message bus mysql storage periodically.

__Example__
```js
mb.garbageCollect(cb);
```

<a name='messageBus-retry'></a>
####  messageBus.retry(callback)

This API retries the messages that had failed with recoverable errors.  It is usually used in a cron job to increase the reliability of the message bus.  The number of retries before declaring fatal can be configured in the [constructor](#new-MessageBus) with the field "retry_limit", the default value of which is 5.

__Example__
```js
mb.retry(cb);
```



