# Introduction

This framework provices a convention and abstract the necessary practiques for using RabbitMQ safely and easily. It works like express and handles all the queues and exchange creation. More documentation about the internal of this framework can be found in the docs folder.

# Dependencies

- latest node 6 LTS or newest LTS.


# Installation

- `npm install @omneagmbh/distributed-service-framework --save` in the project that uses this framework

# Testing

- `npm test` inside the folder of the framework

# Using the framework

The framework is used like express with the difference that the user must connect with RabbitMQ before.

``` javascript
    var SF = require('@omneagmbh/distributed-service-framework');

    SF.start() //if not JSON object config is provided, `.start()` will check for the file in the route in process.env.CONFIG_FILE. Is recomended to use the CONFIG_FILE environment variable
    .then(service => {

        service.on('SERVICE_TO_LISTEN_EVENT', 'route.*.of.event.*.rabbitmq.patterns.#', (packet, emitter) =>{

            return new Promise((resolve, reject) => { //The callbacks MUST return a promise

                emitter.emit('route.to.emit.the.message', {data: "Hello :D"});

                resolve(); //or reject(error)
            });
        });
    });
```

After the connection the user declare the routes providing a callback. 

The routes added with `on` **MUST** return a Promise, **always**. If not, the service will reject to continue and will close itself.

If the promise is resolved, the messages emitted with the emitter, will be published in amqp and the message will be ack, if the promise is rejected, nothing will be published and the message will be nack.

# Launch

There is only one environment variable: `CONFIG_FILE`. This is the route to the config file. The file will be merged with the predefined config file, is only required to provide the attributes that changes. 

An example:

```json
{
    "environment": "development",
    "amqp": {
        "url": "rabbitmq_ip",
        "port": 5672,
        "user": "rabbitmq_user",
        "pass": "rabbitmq_password"
    },
    "service": {
        "name": "submitter",
    }
}

```

The rest of the parameters **SHOULD NOT** be changed unless there is a good reason.

# Deloying

The program that uses this framework required two processes to be launch. One is the main process that uses the framework. The other is the error handler process.

Both need a supervisor for handling errors and unexpected exits. The code is done assuming that there is a supervisor. In some operations, instead of reseting itself, the process it kill itself and assumes that the supervisor will launch it again.

The main service is the one that the developer uses. 

The other service is the error service and can be obtained with `require('@omneagmbh/distributed-service-framework/error')`. The process will take the environment variable `CONFIG_FILE` as the main process. Only doing the `require` launch the process.

One possible configuration for launching the error process is to create in the project that uses this framework a file with this content:

```javascrip
require('@omneagmbh/distributed-service-framework/error');
```

And launch the file with node and the `CONFIG_FILE` environment variable.



