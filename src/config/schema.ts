export default {
  default: {
    main: "src/main.js",
    outDir: "dist",
    outFile: "plugin.js",
    minify: true,
    sourcemap: false,
    typescript: false,
    bundler: null,
    plugins: [],
    external: [],
    hooks: {
      beforeBuild() {},
      afterBuild() {}
    }
  }
}