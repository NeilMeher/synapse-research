"""Mathematical and synthetic fixtures. No fixtures enter empirical runs."""
from collections import Counter
from unittest import TestCase

from empirical.phase3.analysis import agreement,compare_models,entropy
from empirical.phase3.archive import scoring
from empirical.phase3.design import build_plan,render_request
from empirical.inference import digest,parse


class PhaseThreeTests(TestCase):
    def test_shannon_entropy_and_agreement(self):
        self.assertIsNone(entropy(Counter({"A":1})))
        self.assertIsNone(agreement(Counter()))
        self.assertAlmostEqual(entropy(Counter({"A":2,"B":2})),1)
        self.assertAlmostEqual(agreement(Counter({"A":2,"B":2})),1/3)
        self.assertEqual(entropy(Counter({"A":5})),0)

    def test_complete_model_mapping_and_no_hidden_repeated_inference(self):
        _,_,requests=build_plan("cross-model")
        self.assertEqual(len(requests),512)
        self.assertEqual([r["referenceSequence"] for r in requests],list(range(1,513)))
        self.assertEqual(set(r["arm"] for r in requests),{"greedy"})

    def test_format_changes_grammar_and_has_parseable_fields(self):
        tasks, _, plan=build_plan("development")
        item=next(r for r in plan if r["arm"]=="format")
        task=next(t for t in tasks if t["id"]==item["design"]["taskId"])
        message, grammar=render_request(task,item)
        self.assertIn('root ::= confidence "\\n" answer',grammar)
        self.assertEqual(parse("Confidence: 42%\nAnswer: C","stop")["confidence"],.42)
        self.assertEqual(item["requestSha256"],digest({"messages":message,"grammar":grammar,"generation":item["generation"]}))

    def test_distinct_registered_seeds(self):
        _,_,plan=build_plan("decoding")
        self.assertEqual(Counter(r["arm"] for r in plan),{"greedy":16,"low":80,"moderate":80,"format":16})
        self.assertEqual(len({r["generation"]["seed"] for r in plan}),192)

    def test_fixture_never_enters_actual_archive(self):
        fake=[{"evidence":"synthetic-testing"}]*16
        with self.assertRaisesRegex(ValueError,"Only actual-model"):
            scoring("development",fake)

    def test_matched_double_difference_and_missing_bounds(self):
        base,pilot=[],[]
        observed={"taskId":"fixture","family":"test","presentation":"reference","status":"scorable",
                  "position":1,"canonical":"c0","answer":"A","correct":1,"confidence":1}
        base.extend([{**observed,"cue":cue} for cue in ("matched","incorrect")])
        pilot.extend([{**observed,"cue":"matched"},{**observed,"cue":"incorrect","confidence":0}])
        config={"bootstrapSeed":1,"bootstrapReplicates":20,"confidenceBins":5}
        exact=compare_models(pilot,base,config)
        self.assertEqual(exact["primary"]["difference"],1)
        self.assertEqual(exact["newSmolLM2Requests"],0)
        pilot[-1]["confidence"]=None
        missing=compare_models(pilot,base,config)
        self.assertIsNone(missing["primary"]["difference"])
        self.assertEqual(missing["primary"]["allPlannedBounds"],[0,1])
