# ai-service — Developer Guide

Python modules: `rabbitmq/topology.py`, `consumer.py`, `publisher.py`, `messaging/direct_publish.py`, `outbox/repository.py`.

Config: `config.py` — `MESSAGING_MODE`, `AI_DATABASE_URL`.

**TARGET RFC1:** prefer transactional outbox over direct publish.
