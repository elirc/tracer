import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { SessionProvider } from "./lib/session";
import { KeyboardProvider } from "./lib/keyboard";
import { ToastProvider } from "./lib/toast";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ToastProvider>
      <KeyboardProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </KeyboardProvider>
    </ToastProvider>
  </React.StrictMode>,
);
