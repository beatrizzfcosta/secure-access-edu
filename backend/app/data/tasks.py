"""Tarefas em memória (placeholder até persistência na BD)."""

from __future__ import annotations

tasks: list[dict] = []
_next_id = 1


def get_tasks():
    return tasks


def create_task(task):
    global _next_id
    data = dict(task) if task else {}
    data.setdefault("title", "Sem título")
    data["id"] = _next_id
    _next_id += 1
    tasks.append(data)
    return data
