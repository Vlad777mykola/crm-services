# auth-service — Testing Guide

## Status

**CURRENT VERIFIED**

## Test matrix

| Scenario | Type | Expected result |
| -------- | ---- | --------------- |
| Register user | Integration | outbox row pending → published → users profile |
| `company-member.added` valid | Integration | projection row created, ACK |
| Duplicate `company-member.added` | Integration | no duplicate projection, ACK |
| Handler exception | Integration | TX rollback, NACK → `auth.dead.q` |

## Test: registration publishes event

**PRECONDITIONS:** auth-service + outbox-publisher-auth + RabbitMQ running.

**ACTION:** `POST /auth/register` with valid body.

**EXPECTED DB:** `auth_schema.outbox_events` row `status=published` (after poll); identity row exists.

**EXPECTED BROKER:** Message on `domain.events` with routing key `auth.user_registered`.

**EXPECTED ACK/NACK:** N/A (publisher side).

**CLEANUP:** Test data per project conventions.

## Commands

Run from `services/auth-service/`: `yarn test` (verify in `package.json`).
