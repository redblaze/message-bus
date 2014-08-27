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

* [new MessageBus](#new-Message)
* messageBus.fire
* messageBus.addListener
* messageBus.stop
* messageBus.garbageCollect
* messageBus.retry

<a name='new-Message'/>
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
        }
    }
}
```

Please refer to the following packages:

* [mysql](https://www.npmjs.org/package/mysql)
* [coffee-resque](https://www.npmjs.org/package/coffee-resque)

for the format of the mysql configuration and coffee-resque configuration included in messge-bus configuration.

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
    ]
});
```

A message bus relies on two types of storage: mysql and redis, where mysql is used to store the message body and redis is used to trigger the listeners registered on the message.  For the mysql storage, we enforce the following schema:

```sql
drop database if exists `message_bus`;
create database `message_bus`;
use `message_bus`;

drop table if exists tasks;
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

#### messageBus.fire(event, args, callback)

#### messageBus.addListener(event, handler_procedure, number_of_concurrency)

#### messageBus.stop(callback)

### messageBus.garbageCollect(callback)

### messageBus.retry(callback)

### 
