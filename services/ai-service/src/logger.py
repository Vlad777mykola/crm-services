"""Structured (JSON) logging for ai-service - see docs/architecture/observability-baseline.md
(Phase 13 Task 13.2: every service writes structured logs, matching the pino JSON logs
every Node.js service already writes via `logger.ts`/`pino`)."""
from __future__ import annotations

import json
import sys
import time
from typing import Any


def _emit(stream: Any, level: str, message: str, **fields: Any) -> None:
    record = {"level": level, "time": time.time(), "service": "ai-service", "message": message, **fields}
    print(json.dumps(record, default=str), file=stream)


def info(message: str, **fields: Any) -> None:
    _emit(sys.stdout, "info", message, **fields)


def warn(message: str, **fields: Any) -> None:
    _emit(sys.stdout, "warn", message, **fields)


def error(message: str, **fields: Any) -> None:
    _emit(sys.stderr, "error", message, **fields)
