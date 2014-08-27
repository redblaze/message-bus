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

* new MessageBus
* messageBus.fire
* messageBus.addListener
* messageBus.stop
* messageBus.garbageCollect
* messageBus.retry

#### new MessageBus(cfg)

#### messageBus.fire(event, args, callback)

#### messageBus.addListener(event, handler_procedure, number_of_concurrency)

#### messageBus.stop(callback)

### messageBus.garbageCollect(callback)

### messageBus.retry(callback)

### 
