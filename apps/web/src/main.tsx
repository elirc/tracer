import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { SessionProvider } from "./lib/session";
import { KeyboardProvider } from "./lib/keyboard";
import { ToastProvider } from "./lib/toast";
import { UndoProvider } from "./lib/undo";
import { SyncProvider } from "./lib/sync";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ToastProvider>
      <KeyboardProvider>
        <UndoProvider>
          <SessionProvider>
            <SyncProvider>
              <App />
            </SyncProvider>
          </SessionProvider>
        </UndoProvider>
      </KeyboardProvider>
    </ToastProvider>
  </React.StrictMode>,
);
