await Bun.build({
  entrypoints: ["./src/index.ts", "./src/react-query/index.ts"],
  outdir: "./build",
});
