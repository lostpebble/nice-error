// @ts-check

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE ?? "https://lostpebble.github.io/nice-code",
  base: process.env.BASE_PATH ?? "/",
  integrations: [
    starlight({
      title: "nice-code",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/lostpebble/nice-code" },
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "getting-started/introduction" },
            { label: "Quick Start", slug: "getting-started/quick-start" },
          ],
        },
        {
          label: "@nice-code/error",
          items: [
            { label: "Error Domains", slug: "nice-error/domains" },
            { label: "Type Guards & Narrowing", slug: "nice-error/type-guards" },
            { label: "Multi-ID Errors", slug: "nice-error/multi-id" },
            { label: "Handling & Routing", slug: "nice-error/handling" },
            { label: "Serialization", slug: "nice-error/serialization" },
            { label: "Error Packing", slug: "nice-error/packing" },
          ],
        },
        {
          label: "@nice-code/action",
          items: [
            { label: "Action Domains", slug: "nice-action/domains" },
            { label: "Executing Actions", slug: "nice-action/executing" },
            { label: "Requesters", slug: "nice-action/requesters" },
            { label: "Resolvers & Environments", slug: "nice-action/resolvers" },
            { label: "Wire Format", slug: "nice-action/wire-format" },
            { label: "Error Integration", slug: "nice-action/errors" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "@nice-code/error", slug: "reference/core" },
            { label: "@nice-code/action", slug: "reference/nice-action" },
          ],
        },
      ],
    }),
  ],
});
