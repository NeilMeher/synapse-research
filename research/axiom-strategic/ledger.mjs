import {settleOffer} from "../../engine/polis2.mjs";
import {reconcileResources} from "../../engine/resources.mjs";

const branches = [];
for (const contract of ["prepay","delivery"]) {
  for (const success of [false,true]) {
    const buyer = [2,0];
    const seller = [0,2];
    const moved = settleOffer(buyer,seller,0,1,contract,success);
    const conserved = reconcileResources([2,2],[0,0],[0,0],[0,0],[buyer,seller]);
    branches.push({contract,success,buyer,seller,moved,conserved});
  }
}
console.log(JSON.stringify(branches));
