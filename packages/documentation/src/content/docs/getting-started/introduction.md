---
title: Introduction
description: What nice-code is, what problem it solves, and when to reach for it.
---

**nice-code** is two small TypeScript packages that solve a single annoying problem:

> Errors and RPC responses that _should_ be typed, serialized, and round-tripped safely — but almost never are.

If you've ever:

- `throw new Error("something happened")` and had to parse the message on the other end,
- invented your own `{ ok: false, code: "...", ...etc }` envelope for the third time,
- or lost type information the moment a response crossed the network,

…then nice-code is for you.

## The packages

- **`@nice-code/error`** — declare error _domains_ once. Every variant has a typed context payload, a typed ID, and survives `JSON.stringify` / `JSON.parse` with its identity intact.
- **`@nice-code/action`** — declare server actions with typed input, output, and errors. Call them from anywhere with full inference. No codegen, no OpenAPI, no schema drift.
- **`@nice-code/common-errors`** — shared error domains for Standard Schema validation errors and Hono middleware.

## What you won't find here

- A built-in validator. Use [Valibot](https://valibot.dev) or [Zod](https://zod.dev) at boundaries — `@nice-code/action` accepts any [Standard Schema](https://standardschema.dev)-compatible validator.
- An HTTP framework. Actions plug into whatever you use — fetch, Hono, Elysia, Next.js, custom transports.
- Magic. The libraries are readable TypeScript built on plain classes and functions.

## When to reach for it

| You have… | Reach for… |
|---|---|
| A typed RPC / action layer you keep reinventing | `@nice-code/action` |
| Errors that cross a boundary (HTTP, worker, IPC, queue) | `@nice-code/error` |
| A codebase where `try/catch` gives you `unknown` and nothing more | `@nice-code/error` |
| Standard Schema validation errors you want typed and routable | `@nice-code/common-errors` |
| Server actions in Next.js / Remix / TanStack Start | both |

Next: [Quick start →](/getting-started/quick-start/)
