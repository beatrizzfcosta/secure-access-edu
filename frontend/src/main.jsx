// src/main.jsx
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import AppRoutes from "./app/routes";
import { AuthProvider } from "./context/AuthContext";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </React.StrictMode>
);