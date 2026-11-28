"""Synthetic infrastructure fixtures. These records are never model observations."""
from pathlib import Path
import tempfile
import unittest

from empirical.analysis import analyze, contrast, summary
from empirical.archive import score
from empirical.inference import parse
from empirical.run import journal, load, messages_for, PROMPT_FILE, prepare
from empirical.tasks import generate

CONFIG = {"bootstrapSeed": 1, "bootstrapReplicates": 20, "confidenceBins": 5, "minimumPairedCoverage": .75}


class EmpiricalTests(unittest.TestCase):
    def test_parse_boundaries_and_failures(self):
        self.assertEqual(parse("Answer: C\nConfidence: 0%", "stop")["confidence"], 0)
        self.assertEqual(parse("Answer: B\nConfidence: 100%", "stop")["confidence"], 1)
        self.assertEqual(parse("Answer: B\nConfidence: 101%", "stop")["status"], "missingConfidence")
        self.assertEqual(parse("Answer: A\nAnswer: B\nConfidence: 80%", "stop")["status"], "invalidOutput")
        self.assertEqual(parse("Answer: ABSTAIN\nConfidence: 50%", "stop")["status"], "abstention")
        self.assertEqual(parse("I can't comply.", "stop")["status"], "explicitRefusal")
        self.assertEqual(parse("Confidence: 70%", "stop")["status"], "missingAnswer")
        self.assertEqual(parse("Answer: C\nConfidence: 50%", "length")["status"], "truncated")

    def test_frozen_inputs_and_model_boundary(self):
        prepare()
        dataset, key = generate("pilot")
        prompt = load(PROMPT_FILE)
        for task, answer in zip(dataset["tasks"], key):
            neutral, cue = (messages_for(task, arm, prompt) for arm in ("neutral", "incorrectCue"))
            self.assertEqual(neutral[0], cue[0])
            self.assertNotIn(task["id"], neutral[1]["content"])
            self.assertNotIn("suggests", neutral[1]["content"])
            self.assertIn("suggests option " + task["incorrectCueOption"], cue[1]["content"])
            self.assertNotEqual(answer["correct"], task["incorrectCueOption"])

    def test_exact_metrics(self):
        rows = [{"status": "scorable", "confidence": p, "correct": c} for p, c in ((.8, 1), (.6, 0), (.6, 1), (.3, 0))]
        rows += [{"status": "missingConfidence", "confidence": None, "correct": 1},
                 {"status": "timeout", "confidence": None, "correct": None}]
        result = summary(rows, 5)
        self.assertEqual((result["answered"], result["scorable"]), (5, 4))
        self.assertAlmostEqual(result["accuracy"], .6)
        self.assertAlmostEqual(result["scorableAccuracy"], .5)
        self.assertAlmostEqual(result["confidence"], .575)
        self.assertAlmostEqual(result["calibrationGap"], .075)
        self.assertAlmostEqual(result["brier"], .1625)
        self.assertAlmostEqual(result["errorAUROC"], .875)
        self.assertAlmostEqual(result["ece"], .175)
        self.assertEqual([point["count"] for point in result["riskCoverage"]], [1, 3, 4])

    def test_missing_refusal_and_endpoint_behaviour(self):
        zero = summary([{"status": "explicitRefusal", "confidence": None, "correct": None}], 5)
        self.assertEqual((zero["answerCoverage"], zero["brier"], zero["errorAUROC"]), (0, None, None))
        extremes = summary([{"status": "scorable", "confidence": 1, "correct": 0},
                            {"status": "scorable", "confidence": 0, "correct": 1}], 5)
        self.assertEqual((extremes["clippedCount"], extremes["errorAUROC"], extremes["brier"]), (2, 0, 1))
        self.assertAlmostEqual(extremes["logLoss"], 13.815510558, places=7)

    def test_stratified_contrast_and_missing(self):
        precise = contrast([("a", 1), ("a", 1), ("b", -1), ("b", -1)], 5, CONFIG)
        self.assertEqual((precise["coverage"], precise["difference"], precise["interval95"]), (.8, 0, [0, 0]))
        self.assertIsNone(contrast([], 5, CONFIG)["difference"])
        item = {"id": "fixture", "family": "test", "incorrectCueOption": "B"}
        rows = [{"taskId": "fixture", "taskFamily": "test", "condition": arm,
                 "status": "scorable" if c else "timeout", "answer": "A" if c else None,
                 "correct": 1 if c else None, "confidence": .8 if c else None}
                for arm, c in (("neutral", True), ("incorrectCue", False))]
        out = analyze(rows, {"tasks": [item]}, CONFIG)
        self.assertFalse(out["primaryCoverageMet"])
        self.assertEqual(out["paired"]["answerCoverage"]["difference"], -1)

    def test_synthetic_cannot_enter_archive(self):
        with self.assertRaisesRegex(ValueError, "actual-model"):
            score([{"evidence": "synthetic-fixture", "schemaVersion": 1, "replicate": 1}]*128)

    def test_durable_pending_entry_and_provenance(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.sqlite"
            with journal(path, {"fixture": True}) as db:
                db.execute("INSERT INTO record VALUES (1, 'fixture', NULL)")
            with journal(path, {"fixture": True}) as db:
                self.assertEqual(db.execute("SELECT * FROM record").fetchall(), [(1, "fixture", None)])
            with self.assertRaisesRegex(ValueError, "provenance"), journal(path, {"other": True}):
                pass


if __name__ == "__main__":
    unittest.main()
