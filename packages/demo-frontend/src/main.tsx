import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { createActionRuntime } from "@nice-code/action";
import { act_domain_demo_root } from "demo-shared";
import { actionConnect } from "./connect/demo_action_connect.ts";
import { queryClient } from "./queryClient.ts";

act_domain_demo_root.setRuntimeEnvironment(
  createActionRuntime({ envId: "frontend" }).addHandlers([actionConnect]),
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
