import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "module";

// Bundles src/main.ts to main.js; `production` builds once, otherwise watches.
const prod = process.argv[2] === "production";

const context = await esbuild.context({
	banner: { js: "/* Bundled by esbuild. Source: src/ */" },
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: ["obsidian", "electron", ...builtinModules],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
