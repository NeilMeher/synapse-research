"""Bounded local chat adapter. It receives messages and emits observations."""
from contextlib import contextmanager
from datetime import datetime, timezone
from hashlib import file_digest, sha256
from http.client import HTTPConnection, HTTPException
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import time
import uuid


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")


def digest(value):
    return sha256(json_bytes(value)).hexdigest()


def file_hash(path):
    with Path(path).open("rb") as artifact:
        return file_digest(artifact, "sha256").hexdigest()


def now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


ANSWER = re.compile(r"^Answer:[ \t]*(ABSTAIN|[ABCD])[ \t]*$", re.M | re.I)
CONFIDENCE = re.compile(r"^Confidence:[ \t]*(\d{1,3}(?:\.\d{1,3})?)%[ \t]*$", re.M | re.I)


def parse(raw, finish):
    if finish == "length":
        return {"status": "truncated", "answer": None, "confidence": None}
    answers, confidence = ANSWER.findall(raw), CONFIDENCE.findall(raw)
    if len(answers) == 1:
        answer = answers[0].upper()
        if answer == "ABSTAIN":
            return {"status": "abstention", "answer": None, "confidence": None}
        if len(confidence) == 1 and float(confidence[0]) <= 100:
            return {"status": "scorable", "answer": answer, "confidence": float(confidence[0]) / 100}
        return {"status": "missingConfidence", "answer": answer, "confidence": None}
    status = "invalidOutput"
    if re.match(r"^\s*(?:I cannot|I can't|I am unable|I won't|I refuse)\b", raw, re.I):
        status = "explicitRefusal"
    elif not raw.strip() or (not re.search(r"^Answer:", raw, re.M | re.I) and confidence):
        status = "missingAnswer"
    return {"status": status, "answer": None, "confidence": None}


class LocalChat:
    """Minimal loopback adapter. No tools, redirects, proxies, or external endpoints."""

    def __init__(self, port, protocol):
        self.port = port
        self.protocol = protocol

    def request(self, path, payload=None, seconds=3):
        connection = HTTPConnection("127.0.0.1", self.port, timeout=seconds)
        try:
            if payload is None:
                connection.request("GET", path)
            else:
                connection.request("POST", path, json_bytes(payload), {"Content-Type": "application/json"})
            response = connection.getresponse()
            body = response.read(65537)
            if response.status != 200 or len(body) > 65536:
                raise ValueError(f"invalid HTTP result, status {response.status}")
            return json.loads(body)
        finally:
            connection.close()

    def infer(self, messages, grammar):
        model = self.protocol["model"]["servedId"]
        payload = {"model": model, "messages": messages, "stream": False, "cache_prompt": False, "grammar": grammar,
                   **self.protocol["generation"]}
        start = time.perf_counter()
        record = {"id": str(uuid.uuid4()), "timestamp": now(), "raw": None, "finishReason": None,
                  "answer": None, "confidence": None, "providerResponseId": None, "tokens": None, "error": None}
        try:
            result = self.request("/v1/chat/completions", payload, self.protocol["runtime"]["timeoutSeconds"])
            if result["model"] != model or len(result["choices"]) != 1:
                raise ValueError("unexpected model or response count")
            choice = result["choices"][0]
            if choice["message"].get("tool_calls"):
                raise ValueError("unexpected tool call")
            raw = choice["message"]["content"]
            if not isinstance(raw, str) or len(raw) > 4096:
                raise ValueError("invalid message content")
            finish = choice.get("finish_reason")
            usage = result.get("usage")
            tokens = None
            if isinstance(usage, dict) and all(type(usage.get(key)) is int and usage[key] >= 0
                                               for key in ("prompt_tokens", "completion_tokens")):
                tokens = {"input": usage["prompt_tokens"], "output": usage["completion_tokens"]}
            record.update(raw=raw, finishReason=finish, providerResponseId=result.get("id"), tokens=tokens)
            record.update(parse(raw, finish))
        except TimeoutError:
            record.update(status="timeout", error="local-inference-timeout")
        except (OSError, HTTPException, ValueError, KeyError, TypeError, AttributeError):
            record.update(status="infrastructureFailure", error="invalid-or-unavailable-local-server-response")
        record["latencyMs"] = round((time.perf_counter() - start) * 1000, 3)
        return record


@contextmanager
def serve(runtime_dir, weights, protocol, log_path, *, on_launch=None):
    exe = Path(runtime_dir).resolve() / ("llama-server.exe" if os.name == "nt" else "llama-server")
    weights = Path(weights).resolve()
    model = protocol["model"]
    if file_hash(weights) != model["weightsSha256"] or file_hash(exe) != model["runtimeExecutableSha256"]:
        raise ValueError("Runtime executable or model weights differ from the frozen Windows artifacts.")
    with socket.socket() as reserve:
        reserve.bind(("127.0.0.1", 0))
        port = reserve.getsockname()[1]
    settings = protocol["runtime"]
    command = [str(exe), "-m", str(weights), "--host", "127.0.0.1", "--port", str(port),
               "--alias", model["servedId"], "-c", str(settings["context"]), "-t", str(settings["threads"]),
               "-np", str(settings["slots"]), "-ngl", str(settings["gpuLayers"]),
               "--no-webui", "--no-context-shift", "--no-cache-prompt"]
    if settings.get("device"):
        command.extend(["--device", settings["device"], "--log-verbosity", "4"])
    env = {key: value for key, value in os.environ.items() if not key.upper().startswith("LLAMA_")}
    with log_path.open("ab") as log:
        process = subprocess.Popen(command, cwd=runtime_dir, env=env, stdin=subprocess.DEVNULL,
                                   stdout=log, stderr=log)
        try:
            if on_launch is not None:
                on_launch(process)
            adapter = LocalChat(port, protocol)
            adapter.pid = process.pid
            deadline = time.monotonic() + 45
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    raise RuntimeError("The pinned llama.cpp process exited during startup. See the local runtime log.")
                try:
                    data = adapter.request("/v1/models", seconds=1)
                    ready = [entry["id"] for entry in data["data"]] == [model["servedId"]]
                except (OSError, HTTPException, ValueError, KeyError):
                    ready = False
                if ready:
                    yield adapter
                    return
                time.sleep(0.2)
            raise RuntimeError("The pinned model did not become ready within 45 seconds.")
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=4)
