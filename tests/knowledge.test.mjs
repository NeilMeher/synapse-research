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
  const empirical=searchEvidence(graph.nodes,"misleading","Empirical pilot");
  assert.deepEqual(empirical.map(record=>record.id),["empirical/mirage"]);
  assert.equal(searchEvidence(graph.nodes,"MIRAGE","Empirical pilot")[0].id,"empirical/mirage");
  assert.ok(graph.edges.some(edge=>edge.from==="empirical/mirage"&&edge.to==="study/mirage"&&edge.type==="extends synthetic research"));
  const mind=searchEvidence(graph.nodes,"consciousness");
  assert.ok(mind.some(item=>item.id==="lab/mirage"||item.id==="study/mirage"));
  assert.ok(searchEvidence(graph.nodes,"freight","Result").every(item=>item.type==="Result"));
  assert.deepEqual(searchEvidence(graph.nodes,"not-in-the-catalogue-xyzzzz"),[]);
  assert.equal(searchEvidence(graph.nodes,"").length,40);
});

test("MIRAGE 002 exposes verified evidence separately from proposed ensembles",()=>{
  const robustness=searchEvidence(graph.nodes,"response bias","Empirical study");
  assert.equal(robustness[0].id,"empirical/mirage-002");
  assert.ok(graph.edges.some(e=>e.from==="empirical/mirage-002"&&e.to==="study/axiom"));
  assert.ok(graph.edges.some(e=>e.from==="future/echo-empirical"&&e.type==="depends on readiness"));
});

test("MIRAGE 004 is searchable and Qwen preparation remains a distinct evidence class",()=>{
  assert.equal(searchEvidence(graph.nodes,"decoding","Empirical study")[0].id,"empirical/mirage-004");
  assert.equal(graph.nodes.find(record=>record.id==="future/mirage-003").type,"Prepared study");
  assert.ok(graph.edges.some(edge=>edge.from==="empirical/mirage-004"&&edge.to==="empirical/mirage-002"));
});

test("the Qwen capability archive and prepared matched study have separate evidence classes",()=>{
  const evidence=graph.nodes.find(record=>record.id==="development/mirage-qwen");
  assert.equal(evidence.type,"Development evidence");
  assert.equal(graph.nodes.find(record=>record.id==="future/mirage-003").type,"Prepared study");
  assert.ok(graph.edges.some(edge=>edge.from===evidence.id&&edge.to==="future/mirage-003"));
});

test("mathematical prerequisites precede the lessons that rely on them",()=>{
  const preceding=new Set();
  for(const lesson of curriculum){
    for(const required of lesson.requires)assert.ok(preceding.has(required));
    preceding.add(lesson.id);
  }
});
