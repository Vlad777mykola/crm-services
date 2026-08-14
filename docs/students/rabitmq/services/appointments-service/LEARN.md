# appointments-service — Student Guide

**CURRENT VERIFIED**

Largest messaging surface in the repo: publishes appointment lifecycle, consumes many projection events.

**Trace Example B:** `appointment.requested` from HTTP → outbox → three downstream consumers.

**Duplicate:** `processed_events` per inbound event.

**Gap:** Does not bind `specialist.created`, `specialist.updated`, `company-specialist.accepted` despite those events being published elsewhere.
