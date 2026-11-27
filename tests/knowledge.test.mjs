import assert from "node:assert/strict";
import {test} from "node:test";
import {buildKnowledge,curriculum,evidenceClass,findings,keyMeasurements,labConnection,searchEvidence} from "../apps/web/knowledge.mjs";
import {laboratories,researchStudies} from "../apps/web/research-registry.mjs";

const graph=buildKnowledge();
const collect=(entries,kind)=>entries.filter(e=>e.type===kind);

test("release graph connects every laboratory, finding and lesson to addressable evidence",()=>{
  const keys=new Set(graph.nodes.map(n=>n.id));
  assert.equal(keys.size,graph.nodes.length);
  assert.equal(collect(graph.nodes,"Laboratory").length,laboratories.length);
  assert.equal(collect(graph.nodes,"Result").length,researchStudies.length);
  assert.equal(collect(graph.nodes,"Lesson").length,curriculum.length);
  assert.ok(graph.edges.every(({from,to,type})=>keys.has(from)&&keys.has(to)&&type));
  assert.ok(researchStudies.every(study=>findings[study.id].length===3&&keyMeasurements[study.id].length===3&&evidenceClass(study)));
});

test("typed relationship labels distinguish implemented dependencies from research hypotheses",()=>{
  assert.equal(labConnection("artha","energia").type,"dependency");
  assert.equal(labConnection("morpheus","mirage").type,"question");
  assert.equal(labConnection("reflex","alpha-decay").type,"method");
  assert.equal(labConnection("chronos","civilizations").type,"proposed");
});

test("deterministic search recognizes scientific terms and applies an evidence type filter",()=>{
  const rail=searchEvidence(graph.nodes,"electrification");
  assert.ok(rail.some(item=>item.id==="study/chronos"));
  const mind=searchEvidence(graph.nodes,"consciousness");
  assert.ok(mind.some(item=>item.id==="lab/mirage"||item.id==="study/mirage"));
  assert.ok(searchEvidence(graph.nodes,"freight","Result").every(item=>item.type==="Result"));
  assert.deepEqual(searchEvidence(graph.nodes,"not-in-the-catalogue-xyzzzz"),[]);
  assert.equal(searchEvidence(graph.nodes,"").length,40);
});

test("mathematical prerequisites precede the lessons that rely on them",()=>{
  const preceding=new Set();
  for(const lesson of curriculum){
    for(const required of lesson.requires)assert.ok(preceding.has(required));
    preceding.add(lesson.id);
  }
});
