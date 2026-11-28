import {readFileSync} from "node:fs";
import {verificationPath} from "../../engine/scientia-sequential.mjs";
const {inputs,parameters}=JSON.parse(readFileSync(0,"utf8"));
console.log(JSON.stringify(inputs.map(cs=>verificationPath(cs.path,cs.method,parameters))));
