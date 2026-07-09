import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { SessionProvider } from "./lib/session";
import { KeyboardProvider } from "./lib/keyboard";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <KeyboardProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </KeyboardProvider>
  </React.StrictMode>,
);
