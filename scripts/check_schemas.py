"""Check the registered JSON Schema contracts and matching archives."""
import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
FAMILIES = {
    "experiment-v1": tuple(f"{directory}/{phase}{suffix}.json"
                           for phase in ("pilot", "confirmatory")
                           for directory, suffix in (("experiments", ""), ("results", ""), ("results", ".manifest"))),
    "echo-dependence-v1": ("results/echo2-pilot.json", "results/echo2-confirmatory.json"),
    "scientia-v1": ("results/scientia-pilot.json", "results/scientia-confirmatory.json"),
    "episteme-v1": ("results/episteme-pilot.json", "results/episteme-confirmatory.json"),
    "axiom-finite-v1": ("results/axiom-pilot.json",),
    "civilizations-v1": ("results/civilizations-pilot.json", "results/civilizations-confirmatory.json"),
    "polis-v1": ("results/polis-pilot.json", "results/polis-confirmatory.json"),
    "source-v1": ("sources/artha-adb-india.json", "sources/energia-l40s-design.json"),
    "scenario-manifest-v1": tuple(f"results/{name}-scenario.manifest.json" for name in ("artha", "energia", "nexus", "chronos")),
    "chronos-v1": ("results/chronos-scenario.json",),
    "nexus-v1": ("results/nexus-scenario.json",),
    "energia-v1": ("results/energia-scenario.json",),
    "artha-v1": ("results/artha-scenario.json",),
    "polis2-v1": ("results/polis2-pilot.json", "results/polis2-confirmatory.json"),
    "echo-public-predictions-v1": ("empirical/archives/echo-public-empirical-001/predictions.json",),
    "echo-hindi-paired-v1": ("empirical/archives/echo-hindi-economics-001/predictions.json",),
}

for name, paths in FAMILIES.items():
    schema = json.loads((ROOT / "schemas" / f"{name}.json").read_bytes())
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    for path in paths:
        validation_error = next(validator.iter_errors(json.loads((ROOT / path).read_bytes())), None)
        if validation_error:
            location = "/".join(map(str, validation_error.absolute_path))
            raise ValueError(f"{path} at /{location}: {validation_error.message}")
        print(f"{name} verified {path}")

schema = json.loads((ROOT / "schemas/empirical-response-v1.json").read_bytes())
Draft202012Validator.check_schema(schema)
validator = Draft202012Validator(schema, format_checker=FormatChecker())
path = ROOT / "empirical/archives/mirage-empirical-pilot-001/responses.ndjson"
lines = path.read_bytes().splitlines()
for line in lines:
    validator.validate(json.loads(line))
print(f"empirical-response-v1 verified {len(lines)} actual observation records.")

schema = json.loads((ROOT / "schemas/empirical-robustness-v1.json").read_bytes())
Draft202012Validator.check_schema(schema)
validator = Draft202012Validator(schema, format_checker=FormatChecker())
for suffix in ("", "-development"):
    path = ROOT / "empirical/archives" / ("mirage-empirical-robustness-002" + suffix) / "responses.ndjson"
    lines = path.read_bytes().splitlines()
    for line in lines:
        validator.validate(json.loads(line))
    print(f"empirical-robustness-v1 verified {len(lines)} request records from {path.parent.name}.")

for suffix in ("", "-development"):
    path = ROOT / "empirical/archives" / ("mirage-empirical-decoding-004" + suffix) / "responses.ndjson"
    lines = path.read_bytes().splitlines()
    for line in lines:
        validator.validate(json.loads(line))
    print(f"empirical-robustness-v1 verified {len(lines)} request records from {path.parent.name}.")
gpu = json.loads((ROOT / "empirical/phase3/vulkan-development.json").read_bytes())
for record in gpu["records"]:
    validator.validate(record["response"])
print(f"empirical-robustness-v1 verified {len(gpu['records'])} Vulkan development records.")
qwen = ROOT / "empirical/archives/mirage-empirical-cross-model-003-development/responses.ndjson"
qwen_lines = qwen.read_bytes().splitlines()
for line in qwen_lines:
    validator.validate(json.loads(line))
print(f"empirical-robustness-v1 verified {len(qwen_lines)} real Qwen development records.")
