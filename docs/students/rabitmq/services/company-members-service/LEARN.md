# company-members-service — Student Guide

**CURRENT VERIFIED**

When a company is created, this service ensures an owner member exists and notifies auth via `company-member.added`.

Trace: `company.created` handler in `handlers/company-created.ts`.

**Exercise:** Explain why one inbound event can produce an outbound event in the same transaction.
