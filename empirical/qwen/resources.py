"""Bounded Windows resource monitoring for the registered Vulkan subprocess."""
import ctypes
from ctypes import wintypes
from pathlib import Path
import re
import subprocess
from threading import Event, Thread
from time import monotonic

from empirical.inference import file_hash
from empirical.robustness.collect import peak_working_set

MIB=1024**2


class MemoryStatus(ctypes.Structure):
    _fields_=[("size",wintypes.DWORD),("load",wintypes.DWORD)]+[
        (name,ctypes.c_ulonglong) for name in ("total","available","pageTotal","pageAvailable","virtualTotal","virtualAvailable","reserved")]


def available_ram():
    info=MemoryStatus()
    info.size=ctypes.sizeof(info)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(info)):
        raise OSError("Host memory telemetry unavailable.")
    return info.available//MIB


def gpu_memory():
    text=subprocess.check_output(["nvidia-smi","-i","0","--query-gpu=name,memory.free",
                                  "--format=csv,noheader,nounits"],text=True,timeout=3,
                                 creationflags=subprocess.CREATE_NO_WINDOW)
    device, free=text.strip().rsplit(",",1)
    return device,int(free)


def check_artifacts(runtime, archive, weights, spec, model):
    checks=((runtime/"llama-server.exe",spec["executableSha256"]),
            (runtime/"ggml-vulkan.dll",spec["backendSha256"]),(archive,spec["packageSha256"]),
            (weights,model["weightsSha256"]))
    if weights.stat().st_size!=model["weightSize"] or any(file_hash(path)!=expected for path,expected in checks):
        raise ValueError("A pinned Qwen or Vulkan artifact failed verification.")
    devices=subprocess.check_output([str(runtime/"llama-server.exe"),"--list-devices"],text=True,timeout=10,
                                    cwd=runtime,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
    if not re.search(r"Vulkan0:.*NVIDIA GeForce GTX 1650",devices):
        raise RuntimeError("The pinned executable did not enumerate the registered Vulkan device.")


def verify_offload(path):
    text=Path(path).read_text(encoding="utf-8",errors="replace")
    if not re.search(r"offloaded\s+25/25\s+layers\s+to\s+GPU",text,re.I):
        raise RuntimeError("The server did not confirm offloading all 25 Qwen layers.")
    return "25/25 layers offloaded to Vulkan0 (GTX 1650)"


class ResourceGuard:
    def __init__(self,spec):
        self.spec=spec
        ram=available_ram()
        name,vram=gpu_memory()
        if name!=spec["expectedGpu"] or ram<spec["minimumFreeRamStartMiB"] or vram<spec["minimumFreeVramStartMiB"]:
            raise RuntimeError(f"Vulkan preflight failed: {ram} MiB host RAM and {vram} MiB free VRAM ({name}).")
        self.summary={"hostFreeStartMiB":ram,"gpuFreeStartMiB":vram,"minimumHostFreeMiB":ram,
                      "minimumGpuFreeMiB":vram,"peakServerWorkingSetBytes":0,"resourceStop":None}
        self.shutdown=Event()
        self.worker=None

    def launch(self,process):
        self.worker=Thread(target=self.monitor,args=(process,),daemon=True)
        self.worker.start()

    def monitor(self,process):
        next_gpu=0
        while not self.shutdown.is_set() and process.poll() is None:
            try:
                ram=available_ram()
                self.summary["minimumHostFreeMiB"]=min(self.summary["minimumHostFreeMiB"],ram)
                if ram<self.spec["minimumFreeRamRunningMiB"]:
                    raise RuntimeError("host-memory-reserve")
                peak=peak_working_set(process.pid)
                if peak is None:
                    if process.poll() is not None:
                        return
                    raise RuntimeError("process-memory-telemetry")
                self.summary["peakServerWorkingSetBytes"]=max(self.summary["peakServerWorkingSetBytes"],peak)
                if peak>self.spec["maximumPeakServerMiB"]*MIB:
                    raise RuntimeError("server-working-set-limit")
                if monotonic()>=next_gpu:
                    device,vram=gpu_memory()
                    self.summary["minimumGpuFreeMiB"]=min(self.summary["minimumGpuFreeMiB"],vram)
                    if device!=self.spec["expectedGpu"] or vram<self.spec["minimumFreeVramRunningMiB"]:
                        raise RuntimeError("device-memory-reserve")
                    next_gpu=monotonic()+self.spec["gpuPollSeconds"]
            except RuntimeError as exc:
                self.summary["resourceStop"]=str(exc)
            except (OSError,ValueError,subprocess.SubprocessError):
                self.summary["resourceStop"]="resource-telemetry-unavailable"
            if self.summary["resourceStop"]:
                if process.poll() is None:
                    process.terminate()
                return
            self.shutdown.wait(self.spec["hostPollSeconds"])

    def stop(self):
        self.shutdown.set()
        if self.worker is not None:
            self.worker.join()
