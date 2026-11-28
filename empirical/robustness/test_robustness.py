"""Explicit synthetic fixtures for the registered presentation mechanics."""
from collections import defaultdict
from itertools import permutations
import re
import unittest

from empirical.inference import digest
from empirical.robustness.analysis import paired
from empirical.robustness.archive import scoring
from empirical.robustness.design import IDS,LABELS,PROMPT_FILE,file_paths,load,options_for,render,validate_presentation
from empirical.robustness.reference import read_inputs


class RobustnessTests(unittest.TestCase):
    def setUp(self):
        self.task={"question":"What is two plus two?","options":dict(zip(IDS,("4","5","6","7")))}
        self.request={"mapping":{"physical":"0123","labels":"ABCD","grammar":"ABCD"},"cue":"none","target":None}
        self.prompt=load(PROMPT_FILE)

    def test_all_24_physical_permutations_invert_exactly(self):
        for order in permutations("0123"):
            mapping={**self.request["mapping"],"physical":"".join(order)}
            moved=options_for(self.task,mapping)
            inverse=[moved[order.index(str(i))] for i in range(4)]
            self.assertEqual([v for _,_,v in inverse],["4","5","6","7"])

    def test_all_24_labels_preserve_canonical_content(self):
        for order in permutations(LABELS):
            mapping={**self.request["mapping"],"labels":"".join(order)}
            options=options_for(self.task,mapping)
            inverse={label:cid for cid,label,_ in options}
            self.assertEqual([inverse[label] for label in order],list(IDS))

    def test_all_24_grammar_orders_define_the_same_control_language(self):
        seen=set()
        for order in permutations(LABELS):
            row={**self.request,"mapping":{**self.request["mapping"],"grammar":"".join(order)}}
            messages,tree=render(self.task,row,self.prompt)
            allowed=re.findall(r'"([ABCD]|ABSTAIN)"', tree)
            self.assertCountEqual(allowed,[*LABELS,"ABSTAIN"])
            self.assertEqual(messages,render(self.task,self.request,self.prompt)[0])
            seen.add(tree)
        self.assertEqual(len(seen),24)

    def test_cues_follow_canonical_target_and_control_has_no_label(self):
        mapping={**self.request["mapping"],"labels":"DACB"}
        right=render(self.task,{**self.request,"mapping":mapping,"cue":"correct","target":"c0"},self.prompt)[0]
        wrong=render(self.task,{**self.request,"mapping":mapping,"cue":"incorrect","target":"c2"},self.prompt)[0]
        matched=render(self.task,{**self.request,"mapping":mapping,"cue":"matched"},self.prompt)[0]
        self.assertIn("suggests option D",right[1]["content"])
        self.assertIn("suggests option C",wrong[1]["content"])
        self.assertNotIn("suggests option",matched[1]["content"])
        self.assertIn("reviewed this question",matched[1]["content"])

    def test_bad_mapping_and_synthetic_record_rejected(self):
        with self.assertRaises(ValueError):
            validate_presentation({**self.request["mapping"],"labels":"AABC"})
        with self.assertRaisesRegex(ValueError,"actual-model"):
            scoring([{"evidence":"synthetic"}]*36,"development")

    def test_realized_schedule_is_balanced_and_request_hashes_rebuild(self):
        tasks, _, plan, _ = read_inputs("heldout")
        lookup={row["id"]:row for row in tasks}
        for row in plan:
            messages,tree=render(lookup[row["taskId"]],row,self.prompt)
            self.assertEqual(digest({"messages":messages,"grammar":tree}),row["requestSha256"])

    def test_task_unit_and_full_plan_bound_when_observations_are_missing(self):
        fixture=defaultdict(dict)
        def put(task, variant, confidence, correct):
            fixture[task,variant]["matched"]={"family":"test","confidence":0,"correct":0}
            fixture[task,variant]["incorrect"]={"family":"test","confidence":confidence,"correct":correct}
        put("one","reference",1,0)
        put("one","physical",1,0)
        put("two","reference",0,0)
        put("two","physical",None,None)
        result=paired(fixture,{"bootstrapSeed":1,"bootstrapReplicates":20},"brier")
        self.assertEqual(result["difference"],.5)
        self.assertEqual(result["pairs"],2)
        self.assertEqual(result["eligiblePresentationPairs"],3)
        self.assertEqual(result["allPlannedBounds"],[.5,.75])


if __name__=="__main__":
    unittest.main()
