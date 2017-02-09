# Service framework

<!-- MarkdownTOC autolink=true autoanchor=true bracket=round depth=0 -->

- [Introduction](#introduction)
- [Responsibilities](#responsibilities)
- [Conceptual Structure](#conceptual-structure)
    - [Normal Queue](#normal-queue)
    - [Own Queue](#own-queue)
    - [Delay Queue](#delay-queue)
    - [Error Queue](#error-queue)
    - [Global Error Queue](#global-error-queue)
    - [Normal Exchange](#normal-exchange)
    - [Error Exchange](#error-exchange)
    - [Delay Exchange](#delay-exchange)
    - [Service Process](#service-process)
    - [Error Process](#error-process)
    - [Processess](#processess)
        - [Message Consumption](#message-consumption)
        - [Error Handling](#error-handling)
- [Technical Structure](#technical-structure)
    - [API](#api)
        - [ServiceClass.start\(\[config\]\)](#serviceclassstartconfig)
        - [ServiceInstance.on\(serviceName, route, callback\)](#serviceinstanceonservicename-route-callback)
        - [ServiceInstance.off\(serviceName, route, callback\)](#serviceinstanceoffservicename-route-callback)
        - [ServiceInstance.middleware\(callback, \[isPostMiddleware\]\)](#serviceinstancemiddlewarecallback-ispostmiddleware)
    - [Technical details](#technical-details)
        - [Routing messages internally](#routing-messages-internally)
        - [ACK on the correct moment](#ack-on-the-correct-moment)
        - [AMQP reconnection](#amqp-reconnection)
        - [Division of channels](#division-of-channels)
        - [Pause, resume and exiting normally](#pause-resume-and-exiting-normally)
    - [Planning](#planning)
    - [Servers configuration](#servers-configuration)
        - [Configure rabbitmq servers](#configure-rabbitmq-servers)
        - [Configure balancer server](#configure-balancer-server)

<!-- /MarkdownTOC -->

<a name="introduction"></a>
# Introduction

This document defines the service framework. This is a framework that handles all the communication between the services of Omnea inside of and AMQP net.

The framework makes easy adding new logic to the code without worry about the complexities of AMQP and distributed services.

<a name="responsibilities"></a>
# Responsibilities

The framework handles:

* Communication between services
    * Send events
    * RPC
* Error handling (retry and send to global error queue for registering an unrecoverable error)
* Routing and processing of the messages by the developer code
* Acknowledgment/rejection of the messages after processing
* Middlewares for before and after processing
* Queue/Exchange infrastructure declaration for the service
* Service error recovery (reconnection)
The framework will ensure that no message is lost and the logic will work correctly if all this conditions are satisfied:
* The messages are idempotent
* The developer code tells in the correct moment when is finish of processing the message (make all the queries, communicate with external services, and other tasks)
* The queue system has enough ram and resources for handling all the messages

<a name="conceptual-structure"></a>
# Conceptual Structure

The framework defined the entity "Service". A service is a set of queues and exchanges and processes that work together for receiving and sending messages in a safe way ensuring at least one delivery.

![](./Service_AMQP_entities.png)

<a name="normal-queue"></a>
## Normal Queue

It have all the bindings with other services. All the normal communication between services goes through this queue. When a subscriptions to a queue is declared, a new binding is done in this queue. The bindings are dynamically declared and undeclared over the queue. This queue dead letters to the **error queue**.

* Durable: true
* Exclusive: false
* Auto-delete: false
* Max-capacity: 10000

<a name="own-queue"></a>
## Own Queue

Behaves as the **normal queue** but is associated with the concrete instance of the service. That means that every process will have a queue and when the process dies, the queue will be deleted. 

* Durable: true
* Exclusive: true
* Auto-delete: false
* Max-capacity: 10000

<a name="delay-queue"></a>
## Delay Queue

The only purpose of this queue is to insert a delay before the requeued messages enter in the **normal queue**.

* Durable: true
* Exclusive: false
* Auto-delete: false
* Ttl: 5 seconds

<a name="error-queue"></a>
## Error Queue

This queue receives all the rejections, the timeouts and max capacity dead lettering of the **normal queue**. This queue is durable and not exclusive. This queue deadletters to **global error queue**.

* Durable: true
* Exclusive: false
* Auto-delete: false
* Max-capacity: 10000

<a name="global-error-queue"></a>
## Global Error Queue

This queue is global and there is only one in all the rabbitmq cluster. If an error is retried several times or the **error queue **reach their maximum capacity the messages are sended to this queue for store and analyzing. 

* Durable: true
* Exclusive: false
* Auto-delete: false

<a name="normal-exchange"></a>
## Normal Exchange

All services have an exchange with the name of the service. The events of the service are published in this exchange. If other service wants to listen from this service, it must subscribe in this exchange.

Now every service have its own exchange. That means that we can’t have several services publishing in the same exchange. Maybe in the future this can be an option for moving from services to microservices, but not for now. 

<a name="error-exchange"></a>
## Error Exchange

This exchange receives all the messages rejected from the **normal queue** and **own queue**. It sends the all messages to the **error queue**. This exchange is of type **fanout** that means that every message is delivered to all subscripted queues maintaining all the message’s data, in this case, only the **error queue**. 

<a name="delay-exchange"></a>
## Delay Exchange

This exchange receives the messages that need to be requeued from the **error process**. It sends all the messages to the delay queue. Is a **fanout** exchange too.

<a name="service-process"></a>
## Service Process

This is the part that abstracts the developer from the complexities of the AMQP system.

Here is where the queues, exchanges and **error handling** process are declared and launched. This Process consumes the messages in the **normal queue**. It contains the application itself.

<a name="error-process"></a>
## Error Process

This is a parallel process that and consumes the messages in the **error queue**. It decides when to requeue a message and when to send a message to the **global error queue**.

<a name="processess"></a>
## Processess

<a name="message-consumption"></a>
### Message Consumption

![](./Service_framework.png)

<a name="error-handling"></a>
### Error Handling

When a message is rejected from the user code process, the error handling process will take this message and decide if to send to the global error queue or request again in the normal queue. 

There is three possible processes:

* Success 
    * Message arrives to normal queue 
    * Consumed by  service
    * The service acknowledge the message
* Rejected-success
    * Message arrives to normal queue 
    * Consumed by service 
    * Rejected by service (timeout/process crash/noack)
    * Send to error queue
    * Consumed by error handler 
        * First time in error queue, the message must be requeued 
    * Send to delay queue 
    * Send to normal queue
    * Consumed by service 
    * Processed with success
* Rejected-rejected
    * Message arrives to normal queue 
    * Consumed by service 
    * Rejected by service (timeout/process crash/noack)
    * Send to error queue
    * Consumed by error handler 
        * First time in error queue, the message must be requeued 
    * Send to delay queue 
    * Send to normal queue
    * Consumed by service
    * Rejected by service (timeout/process crash/noack)
    * Send to error queue
    * Consumed by error handler 
        * Second time in the error queue, the message should be send to the global error queue. 
    * Send to global error queue. 
        * Message can't be processed

The case rejected-rejected is an extension of the case rejected-success. 

For the error handling process is very simple to know what to do with a message. If the message was more of one time in the error queue, it must be send to the global error queue.  In any other case it should be send to the delay queue. 

<a name="technical-structure"></a>
# Technical Structure

The structure of the framework try to be as standalone and simple as possible (small in code and low dependencies). It provides an API for subscribe to messages and for emitting other messages. 

<a name="api"></a>
## API

The service API is very simple:

```
var error = require('debug')('Omnea:SF:error');

var Service = require('@Omneagmbh/service-framework');

Service.start()
.catch(error)
.then(service => {
    service.on('service-name', 'route.to.service', log)
    .catch(err => {error('Error adding route', err);});
});
```

<a name="serviceclassstartconfig"></a>
### ServiceClass.start([config])

This method creates the instance, connects with the server, declare all the queues, exchanges and bindings and gives the instance ready for use. It returns a promise that is satisfied with the instance and reject the promise if any error occurs.

<a name="serviceinstanceonservicename-route-callback"></a>
### ServiceInstance.on(serviceName, route, callback)

This method adds a subscription to one service on one route. 

The routes accept patterns like "*.orange.*",  "*.*.rabbit" and "lazy.#".

* * (star) can substitute for exactly one word.
* # (hash) can substitute for zero or more words.

The route is created by adding a binding the the exchange with the name of the Service and with the route provided. All the exchanges are topic, that means that accepts patterns.

When a consumed message satisfies the service and route, the callback is called. Only one callback will be called, no matter how many callbacks matches with the message service and route. (This can be changed in the future, but for maintain it simple, only one callback. The reason is to not fail to ensure that all callbacks finish before making the ack, with one callback is simple and less error prone)

<a name="serviceinstanceoffservicename-route-callback"></a>
### ServiceInstance.off(serviceName, route, callback)

Delete the binding of the queue and delete the callback from the internal states. If the queue still has messages with this service and route and any other route can process this message, the message is discarded and sended to the global error queue.

<a name="serviceinstancemiddlewarecallback-ispostmiddleware"></a>
### ServiceInstance.middleware(callback, [isPostMiddleware])

Add a middleware that will be applied to all messages. The middleware must return a promise. 

If the second argument is set, the middleware is configured for executing after the message process.

<a name="technical-details"></a>
## Technical details

<a name="routing-messages-internally"></a>
### Routing messages internally

The messages are always consumed from the **normal queue** and **own queue**. The bindings of this queue are changed dynamically for reflecting the subscriptions of the service. 

When a message is received, the the exchange name and the route are readed and then is matched with **one** callback. This callback is the function that the developer provides on the **service.on()** method.

For routing the pattern system of the RabbitMQ topic exchange are recreated on the code.

* If a message has more than one callback:
    * A warn is show and logged
    * The first specified callback by the developer is chosen for processing the message.

<a name="ack-on-the-correct-moment"></a>
### ACK on the correct moment

The acknowledgment of the message is done **after all dev code actions are done**. The callback provided by the developer must return a Promise that is satisfied **only when all sync/async action are finish**. 

If the promise is rejected, the message will be rejected and reprocess one more time (by the same or other process in the service cluster).

The framework can use other system for checking if some action is performed after the promise is satisfied ([https://github.com/strongloop/zone](https://github.com/strongloop/zone)). In that case and Error will be launch and the process will be **exited normally**. That must be understand as the service rejecting to operate with this kind of bug.

<a name="amqp-reconnection"></a>
### AMQP reconnection

If the connection is lost, a reconnection is done. This have several implications. Any message consumed and not rejected or acknowledged can’t be rejected or acknowledged anymore. For that reason the service will ignore any a satisfied promise belonging to a message of a previous connection.

That means that when a message process is finish by the dev code, the service will check if is from the actual connection, if not, it will do nothing and will forget about it.

This message will be consumed by the same or any other process on the service cluster.

<a name="division-of-channels"></a>
### Division of channels

For recovering faster and avoiding error, the bindings declarations and the consumption will be done from different channels + another channel for the emission.

* If a binding fails, and is in the initialization phase, the service launch will be cancelled and **exited normally** with an Error logged.
* If a binding fails after the initialization phase, the service will continue, will rebuild the channel and continue normally. An error will be logged and the service.on() method returned promise will be rejected.
* If any other kind of error happens that close the channel of consumption, the service will log the error and try to rebuild the channel. 
* In case that any channel rebuild fail one time more, the service will exit normally and log the error again as **fail on recovery.**

<a name="pause-resume-and-exiting-normally"></a>
### Pause, resume and exiting normally

The service can stop and resume their activity. We have a normal exit when the process is close when stopped. 

* For stopping, the service will:
    * Stop consumption
    * Wait for all consumed messages for finish their process
    * Send all the events of all the messages
    * Log their stop
* For starting (after stopping)
    * Start the consumption
* For normal exiting
    * Stop the process
    * Log the process as **normally exit**
    * Close all the channels
    * Close the process

<a name="planning"></a>
## Planning

* V0.x
    * AMQP ✓
    * Event ✓
    * Middlewares ✓
* V1.0
    * Error handling ✓
    * Queues creation (configuration of the service) ✓
    * Reconnection/Recovery

<a name="servers-configuration"></a>
## Servers configuration

<a name="configure-rabbitmq-servers"></a>
### Configure rabbitmq servers

1. Give a consistent hostname for the server (i.e. for the cluster rabbitmq-n)
    * set hostname
`sudo hostname rabbitmq-1`
    * change it in next files
`/etc/hostname/`
`/etc/hosts`
2. Install rabbitmq ([debian docs](https://www.rabbitmq.com/install-debian.html))
    * add repo
`echo 'deb http://www.rabbitmq.com/debian/ testing main' | sudo tee /etc/apt/sources.list.d/rabbitmq.list`
    * add key
`wget -O- https://www.rabbitmq.com/rabbitmq-release-signing-key.asc | sudo apt-key add -`
    * update pkg list
`sudo aptitude update`
    * install rabbitmq-server
`sudo aptitude install rabbitmq-server`
3. Configure rabbitmq ([Production Checklist](https://www.rabbitmq.com/production-checklist.html))
    * for example create custom config file (`/etc/rabbitmq/rabbitmq.config`) and configure RAM limits
`[{rabbit, [{vm_memory_high_watermark, 0.9}]}]`.
4. Configure cluster ([Clustering Guide](http://www.rabbitmq.com/clustering.html))
    * general
        * hostnames of all cluster members must be resolvable from all cluster nodes (through DNS records or Local host files (`/etc/hosts`))
        * copy cookie (`/var/lib/rabbitmq/.erlang.cookie`) from master to another nodes (in order to communicate between them)
    * for the master
        * create new user in rabbit:
`sudo rabbitmqctl add_user test test`
`sudo rabbitmqctl set_user_tags test administrator`
`sudo rabbitmqctl set_permissions -p / test ".*" ".*" ".*"`
        * enable management plugin (for the web interface, default on the port 15672)
`sudo rabbitmq-plugins enable rabbitmq_management`
        * call cluster status
`sudo rabbitmqctl cluster_status`
        * describe HA queues ([Highly Available Queues](https://www.rabbitmq.com/ha.html)). For example:
`rabbitmqctl set_policy HA ".*" '{"ha-mode": "all"}'`
    * for the other nodes:
        * enable management agent plugin
`sudo rabbitmq-plugins enable rabbitmq_management_agent`
        * join to the cluster sudo rabbitmqctl cluster_status
`sudo rabbitmqctl stop_app`
`sudo rabbitmqctl join_cluster rabbit@rabbitmq-1`
`sudo rabbitmqctl start_app`
        * where "rabbit@rabbitmq-1" is a “user@hostname” of existing member of cluster (for example master)
5. Security
    * rabbitmq ports (5672 and 15672 on the server with web-interface) must be accessible between all nodes (including balancer);
    * port for the ssh must be opened if required.

<a name="configure-balancer-server"></a>
### Configure balancer server

1. Hostnames
    * set hostname
sudo hostname rabbitmq-balancer
    * change it in next files
`/etc/hostname/`
`/etc/hosts`
    * hostnames of all cluster members must be resolvable from balancer (or need refers by ip in config)
2. Install HAProxy
    * Install stable version for Ubuntu ([or follow by official site](http://haproxy.debian.net/))
`sudo aptitude update`
`sudo aptitude install haproxy`
3. Configure HAProxy
    * Add to configuration file (`/etc/haproxy/haproxy.cfg`)

```
listen rabbitmq
    bind *:5672
    mode tcp
    log global
    retries 3
    option tcplog
    option persist
    balance leastconn
    server rabbitmq-1 rabbitmq-1:5672 check inter 5s rise 2 fall 3
    ...
    server rabbitmq-n rabbitmq-n:5672 check inter 5s rise 2 fall 3
listen rabbitmq-management
    bind *:15672
    mode http
    server rabbitmq-1 rabbitmq-1:15672
```
    * section "rabbitmq-management" refers to the node with web interface

4. Security
    * all proxying ports (5672 and 15672) must be opened (for external connects);
    * port for t
    * he ssh must be opened if required.

