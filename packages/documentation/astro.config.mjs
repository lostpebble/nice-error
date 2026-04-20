// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://nicecode.io",
  integrations: [
    starlight({
      title: "nice-code",
      description: "Typed, serializable errors and actions for TypeScript.",
      logo: {
        src: "./src/assets/logo.svg",
        replacesTitle: false,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/lostpebble/nice-code",
        },
      ],
      customCss: [
        "./src/styles/theme.css",
        "./src/styles/starlight-overrides.css",
        "./src/styles/syntax.css",
      ],
      components: {
        // Custom hero on the splash page
        Hero: "./src/components/Hero.astro",
        // Custom page-level extras
        Head: "./src/components/Head.astro",
        Footer: "./src/components/Footer.astro",
      },
      // Starlight ships Pagefind-based search out of the box. Tweak its label + placeholder.
      pagefind: true,
      // Site-wide search bar sits in the header by default.
      expressiveCode: {
        themes: ["github-dark"],
        styleOverrides: {
          borderRadius: "10px",
          codeFontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
          codeFontSize: "13px",
          codeLineHeight: "1.6",
          frames: {
            shadowColor: "transparent",
          },
        },
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", link: "/getting-started/introduction/" },
            { label: "Quick Start", link: "/getting-started/quick-start/" },
          ],
        },
        {
          label: "@nice-code/error",
          items: [
            { label: "Error Domains", link: "/nice-error/domains/" },
            { label: "Multi-ID Errors", link: "/nice-error/multi-id/" },
            { label: "Domain Hierarchy", link: "/nice-error/hierarchy/" },
            { label: "Serialization", link: "/nice-error/serialization/" },
            { label: "Handling & Matching", link: "/nice-error/handling/" },
            { label: "Type Guards", link: "/nice-error/type-guards/" },
            { label: "Packing", link: "/nice-error/packing/" },
          ],
        },
        {
          label: "@nice-code/action",
          items: [
            { label: "Action Domains", link: "/nice-action/domains/" },
            { label: "Executing", link: "/nice-action/executing/" },
            { label: "Requesters", link: "/nice-action/requesters/" },
            { label: "Resolvers", link: "/nice-action/resolvers/" },
            { label: "Wire Format", link: "/nice-action/wire-format/" },
            { label: "Errors in Actions", link: "/nice-action/errors/" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "@nice-code/error", link: "/reference/nice-error/" },
            { label: "@nice-code/action", link: "/reference/nice-action/" },
            { label: "@nice-code/common-errors", link: "/reference/common-errors/" },
            { label: "Recipes", link: "/reference/core/" },
          ],
        },
      ],
    }),
  ],
});
