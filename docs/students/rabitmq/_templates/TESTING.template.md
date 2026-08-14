# <service-name> — Testing Guide

## Status

CURRENT VERIFIED

## Test matrix

| Scenario | Type | Expected result |
| -------- | ---- | --------------- |
| Valid event | Integration | business effect committed |
| Duplicate event | Integration | no duplicate effect |
| Handler exception | Integration | transaction rolled back |
| Invalid payload | Integration | rejected per current stage |
| Rabbit unavailable | Messaging integration | reconnect/failure behavior |
| Wrong routing key | Broker test | consumer receives nothing |
| Correct routing key | Broker test | service receives event |

## Test: <scenario name>

**PRECONDITIONS**

**ACTION**

**EXPECTED DATABASE STATE**

**EXPECTED RABBITMQ STATE**

**EXPECTED LOG**

**EXPECTED ACK/NACK RESULT**

**CLEANUP**

## RFC1 tests (not current)

**TARGET RFC1 — NOT IMPLEMENTED YET**

| Scenario | Expected |
| -------- | -------- |
| Retry tier progression | message moves 5s → 30s → 5m → parking |
| Replay | parked event safely redelivered |
