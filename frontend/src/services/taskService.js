import api from "./api";

export function fetchTasks() {
  return api.get("/tasks");
}

export function createTask(payload) {
  return api.post("/tasks", payload);
}
