"""Limite de criação de tarefas por utilizador (mitigação DoS / abuso)."""

from __future__ import annotations

import os
import threading
import time
from collections import defaultdict

_lock = threading.Lock()
# Timestamps monótonos por utilizador (ordem cronológica)
_events: dict[str, list[float]] = defaultdict(list)


def _window_seconds() -> float:
    return float(os.environ.get("TASK_CREATE_RATE_WINDOW_SECONDS", "60"))


def _max_per_window() -> int:
    return int(os.environ.get("TASK_CREATE_MAX_PER_WINDOW", "5"))


def check_and_record_task_create(user_id: str) -> tuple[bool, int | None]:
    """
    Regista uma tentativa de criação se ainda houver quota na janela.

    Returns:
        (True, None) se permitido.
        (False, retry_after_seconds) se bloqueado (valor aproximado para Retry-After).
    """
    now = time.monotonic()
    window = _window_seconds()
    max_n = _max_per_window()
    uid = str(user_id)

    with _lock:
        times = _events[uid]
        cutoff = now - window
        while times and times[0] < cutoff:
            times.pop(0)

        if len(times) >= max_n:
            oldest = times[0]
            retry_after = int(max(1, round(window - (now - oldest))))
            return False, retry_after

        times.append(now)
        return True, None
