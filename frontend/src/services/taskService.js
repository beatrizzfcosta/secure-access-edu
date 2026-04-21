import api from "./api";

export function fetchTasks() {
  return api.get("/tasks");
}

export function fetchAssignableUsers() {
  return api.get("/tasks/assignable-users");
}

export function createTask(payload) {
  return api.post("/tasks", payload);
}

export function updateTask(taskId, payload) {
  return api.put(`/tasks/${taskId}`, payload);
}

export function deleteTask(taskId) {
  return api.delete(`/tasks/${taskId}`);
}
