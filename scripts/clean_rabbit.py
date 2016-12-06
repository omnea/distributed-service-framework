# -*- coding: utf-8 -*-
import pika
import pyrabbit


class StructureManager(object):
    _host = '88.99.15.151'
    _port = 5672
    _username = 'test'
    _password = 'test'
    _connection = None
    _channel = None
    _api_client = None

    def __init__(self):
        super().__init__()
        self._configure()

    def __del__(self):
        self._connection.close()

    def _configure(self):
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=self._host,
                port=self._port,
                heartbeat_interval=20,
                credentials=pika.PlainCredentials(
                    username=self._username,
                    password=self._password
                )
            )
        )

        channel = connection.channel()

        self._connection = connection
        self._channel = channel

        self._api_client = pyrabbit.Client(
            "{host}:15672".format(host=self._host),
            self._username, self._password
        )

    def clean_all(self):
        self._clean_queues()
        self._clean_exchanges()

    def _clean_exchanges(self):
        exchanges_list = self._api_client.get_exchanges()
        for exchange in exchanges_list:
            exchange_name = exchange['name']
            is_system_exchange = (
                exchange_name == '' or exchange_name.startswith('amq.')
            )
            if is_system_exchange:
                continue

            self._channel.exchange_delete(exchange_name)
            print("Exchange `{name}` deleted".format(name=exchange_name))

    def _clean_queues(self):
        queues_list = self._api_client.get_queues()
        for queue in queues_list:
            queue_name = queue['name']
            self._channel.queue_delete(queue_name)

            print("Queue `{name}` deleted".format(name=queue_name))


if __name__ == '__main__':
    manager = StructureManager()
    manager.clean_all()
