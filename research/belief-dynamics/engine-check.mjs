import {readFileSync} from "node:fs";
import {beliefDecision} from "../../engine/belief-dynamics.mjs";

const config = JSON.parse(readFileSync(new URL("protocol.json",import.meta.url)));
const inputs = JSON.parse(readFileSync(0,"utf8"));
console.log(JSON.stringify(inputs.map(cell => beliefDecision(config,cell))));
