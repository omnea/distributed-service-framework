# Dependencies

 - node > 6

# Installation

- Install dependencies
- `npm install` in the folder

# Testing

- npm test

# Fast start

This framework works defining subscriptions to services and allowing to emit messages in the process of the message.

``` javascript
    var SF = require('@omneagmbh/distributed-service-framework');

    SF.start({name: "test"})
    .then(service => {
        service.on('otherService', 'route.*.to.listen.#', (packet, emitter) => {
            return new Promise((resolve, reject) => {
                emitter.emit('route.to.emit.the.message', {data: "Hello :D"});
                resolve(); //or reject(error)
            });
        });
    });
```

The routes added with on MUST return a Promise, always. If not, the service will reject to continue and will close itself.
If the promise is resolved, the messages emitted with the emitter, will be published in amqp and the message will be ack, if the promise is rejected, nothing will be published and the message will be nack.

# Test cases

## Test the error handler
Run `CONFIG_FILE=../../test/rejectMessageConfig.json NODE_ENV=development DEBUG=* node ./lib/errorHandler/index.js` and `CONFIG_FILE=../test/rejectMessageConfig.json DEBUG=* node ./test/rejectMessage.js`

and then create a message in the exchange `test-reject` with route `hi`.
The message should be rejected and handled by the error handler process.

# Notes:

## The future structure of the messages. 

```

{
    "credentials": {
        "token": "sdfsdf",
        "bearer": "sdfsdfsdf",
        "user": {}
    },
    "data": {
        "modelA": {
            "__OmneaDataType": {
                "type": "model",
                "name": "User"
            },
            "data": {

            }
        },
        "hola": {
            "adios": 23,
            "fecha": 123124314123
        }
    },
    "metadata": {
        "job": {
            "id": "34242324",
        },
        "client": {
            "ip": "213.21.54.1",
            "user-agent": "Mozilla: Gecko like..."
        },
        "perf": {
            "steps": [
                {
                    "time": 2123423,
                    "server": "A1"
                },{
                    "time": 2123423,
                    "server": "B2"
                },{
                    "time": 2123423,
                    "server": "A2"
                }
            ]
        }
    }
}


```


# TODO

- Finish tests
- UPDATE documentation with second exchange
- Check configuration of services (on board)
- Add all the configuration of the docs in the config (maximun size of queues, etc)
