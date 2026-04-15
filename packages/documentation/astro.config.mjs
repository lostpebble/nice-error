// @ts-check

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE ?? "https://lostpebble.github.io",
  base: process.env.BASE_PATH ?? "/nice-error",
  integrations: [
    starlight({
      title: "nice-error",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/lostpebble/nice-error" },
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
          label: "@nice-error/core",
          items: [
            { label: "Error Domains", slug: "core/domains" },
            { label: "Type Guards & Narrowing", slug: "core/type-guards" },
            { label: "Multi-ID Errors", slug: "core/multi-id" },
            { label: "Handling & Routing", slug: "core/handling" },
            { label: "Serialization", slug: "core/serialization" },
            { label: "Error Packing", slug: "core/packing" },
          ],
        },
        {
          label: "@nice-error/nice-action",
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
            { label: "@nice-error/core", slug: "reference/core" },
            { label: "@nice-error/nice-action", slug: "reference/nice-action" },
          ],
        },
      ],
    }),
  ],
});
