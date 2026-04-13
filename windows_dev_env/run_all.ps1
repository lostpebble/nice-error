wt -w 0 nt -d ".\packages\core" pwsh -NoExit -Command "bun run vitest" `; `
      nt -d ".\packages\core" pwsh -NoExit -Command "bun run type-check-watch" `; `
      nt -d ".\packages\common-errors" pwsh -NoExit -Command "bun run type-check-watch" `; `
      nt -d ".\packages\nice-action" pwsh -NoExit -Command "bun run vitest" `; `
      nt -d ".\packages\nice-action" pwsh -NoExit -Command "bun run type-check-watch" `; `
      nt -d ".\packages\demo-backend" pwsh -NoExit -Command "bun run type-check-watch" `; `
      nt -d ".\packages\demo-frontend" pwsh -NoExit -Command "bun run type-check-watch" `; `
      nt -d ".\packages\demo-backend" pwsh -NoExit -Command "bun run dev" `; `
      nt -d ".\packages\demo-frontend" pwsh -NoExit -Command "bun run dev"