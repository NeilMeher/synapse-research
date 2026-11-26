import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from "node:fs";
import {posix} from "node:path";
import {validateResults} from "../engine/contracts.mjs";

const root = new URL("../", import.meta.url);
const from = path => new URL(path, root);
const output = path => from("dist/" + path);
const text = path => readFileSync(from(path), "utf8");
const result = validateResults(JSON.parse(text("results/confirmatory.json")));
const manifest = JSON.parse(text("results/confirmatory.manifest.json"));
if (result.config.experimentId !== manifest.experimentId || manifest.status !== "completed") {
  throw new Error("The release artifacts do not identify a completed confirmatory run.");
}

const copies = [];
for (const file of readdirSync(from("apps/web/"))) copies.push(["apps/web/" + file, file]);
for (const file of readdirSync(from("engine/"))) {
  if (["echo.mjs", "contracts.mjs", "dependence.mjs"].includes(file)) copies.push(["engine/" + file, "engine/" + file]);
}
for (const file of ["pilot.json", "pilot.manifest.json", "confirmatory.json", "confirmatory.manifest.json", "echo2-pilot.json", "echo2-pilot.manifest.json", "echo2-confirmatory.json", "echo2-confirmatory.manifest.json", "mirage-pilot.json", "mirage-pilot.manifest.json", "mirage-confirmatory.json", "mirage-confirmatory.manifest.json"]) {
  copies.push(["results/" + file, "data/" + file], ["results/" + file, "results/" + file]);
}
for (const file of readdirSync(from("research/"))) copies.push(["research/" + file, "research/" + file]);
for (const file of ["REPRODUCIBILITY.md", "PORTFOLIO_AUDIT.md", "CONTRIBUTION_REGISTER.md"]) {
  copies.push([file, "docs/" + file], [file, file]);
}
for (const file of ["docs/echo-learning.md", "docs/echo2-learning.md", "docs/mirage-learning.md", "papers/mirage.md", "papers/echo.md", "papers/echo2.md", "LICENSE"]) copies.push([file, file]);
for (const [source, target] of copies) {
  const directory = posix.dirname(target);
  mkdirSync(output(directory === "." ? "" : directory + "/"), {recursive:true});
  cpSync(from(source), output(target));
}
writeFileSync(output(".nojekyll"), "");

const markup = readFileSync(output("index.html"), "utf8");
const ids = new Set(Array.from(markup.matchAll(/\bid="([^"]+)"/g), match => match[1]));
for (const [, url] of markup.matchAll(/(?:href|src)="([^"]+)"/g)) {
  if (url.startsWith("#") && !ids.has(url.slice(1))) throw new Error("Broken anchor: " + url);
  if (url.startsWith("./") && !existsSync(output(url.slice(2)))) throw new Error("Missing static resource: " + url);
}
console.log("Built " + copies.length + " public files with checked local links.");
