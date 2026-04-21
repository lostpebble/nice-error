import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { act_domain_demo } from "demo-shared";
import { connect_requester } from "./connect/demo_action_connect.ts";
import { queryClient } from "./queryClient.ts";

act_domain_demo.setHandler(connect_requester);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
