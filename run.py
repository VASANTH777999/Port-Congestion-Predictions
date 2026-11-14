import sys
import os
import subprocess
import time
import webbrowser
import signal
import atexit
import urllib.request
import ctypes
from ctypes import wintypes

# Set terminal title
if sys.platform == "win32":
    os.system("title Aiqon Maritime AI Platform")

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

processes = []

def setup_windows_job_object():
    """Binds all child processes to a Windows Job Object so they terminate automatically if this terminal closes."""
    if sys.platform != "win32":
        return None
    try:
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        job = kernel32.CreateJobObjectW(None, None)
        if not job:
            return None

        class JOBOBJECT_BASIC_LIMIT_INFORMATION(ctypes.Structure):
            _fields_ = [
                ("PerProcessUserTimeLimit", wintypes.LARGE_INTEGER),
                ("PerJobUserTimeLimit", wintypes.LARGE_INTEGER),
                ("LimitFlags", wintypes.DWORD),
                ("MinimumWorkingSetSize", ctypes.c_size_t),
                ("MaximumWorkingSetSize", ctypes.c_size_t),
                ("ActiveProcessLimit", wintypes.DWORD),
                ("Affinity", ctypes.c_size_t),
                ("PriorityClass", wintypes.DWORD),
                ("SchedulingClass", wintypes.DWORD),
            ]

        class IO_COUNTERS(ctypes.Structure):
            _fields_ = [
                ("ReadOperationCount", ctypes.c_ulonglong),
                ("WriteOperationCount", ctypes.c_ulonglong),
                ("OtherOperationCount", ctypes.c_ulonglong),
                ("ReadTransferCount", ctypes.c_ulonglong),
                ("WriteTransferCount", ctypes.c_ulonglong),
                ("OtherTransferCount", ctypes.c_ulonglong),
            ]

        class JOBOBJECT_EXTENDED_LIMIT_INFORMATION(ctypes.Structure):
            _fields_ = [
                ("BasicLimitInformation", JOBOBJECT_BASIC_LIMIT_INFORMATION),
                ("IoInfo", IO_COUNTERS),
                ("ProcessMemoryLimit", ctypes.c_size_t),
                ("JobMemoryLimit", ctypes.c_size_t),
                ("PeakProcessMemoryLimit", ctypes.c_size_t),
                ("PeakJobMemoryLimit", ctypes.c_size_t),
            ]

        info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
        info.BasicLimitInformation.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE

        kernel32.SetInformationJobObject(
            job, 9, ctypes.byref(info), ctypes.sizeof(info)
        )
        kernel32.AssignProcessToJobObject(job, kernel32.GetCurrentProcess())
        return job
    except Exception as e:
        print(f"[WARN] Job Object initialization skipped: {e}")
        return None

def kill_child_processes():
    """Kill all child processes and their children immediately."""
    for p in processes:
        if p.poll() is None:
            try:
                if sys.platform == "win32":
                    subprocess.run(
                        ["taskkill", "/F", "/T", "/PID", str(p.pid)],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL
                    )
                else:
                    p.terminate()
            except Exception:
                pass

atexit.register(kill_child_processes)

def sig_handler(sig, frame):
    print("\n[INFO] Stopping all Aiqon services...")
    kill_child_processes()
    sys.exit(0)

signal.signal(signal.SIGINT, sig_handler)
signal.signal(signal.SIGTERM, sig_handler)

def wait_for_service(url, timeout=15):
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AiqonChecker"})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status in (200, 304):
                    return True
        except Exception:
            time.sleep(0.5)
    return False

def main():
    print("""
===============================================================================
           AIQON - PORT CONGESTION & SHIPMENT DELAYS AI PLATFORM
         Powered by AIS Telemetry, XGBoost Ensemble & NVIDIA Nemotron
===============================================================================
""")

    # 1. Setup Windows Job Object for bulletproof cleanup
    setup_windows_job_object()

    # 2. Check Node
    print("[1/4] Checking Node.js environment...")
    try:
        node_ver = subprocess.check_output(["node", "-v"], text=True).strip()
        print(f"      Node.js {node_ver} detected.")
    except Exception:
        print("[ERROR] Node.js was not found on PATH. Please install Node.js v18+.")
        sys.exit(1)

    # 3. Check ML Models & AIS Dataset
    print("[2/4] Verifying Machine Learning Models & AIS Dataset...")
    model_file = os.path.join(BACKEND_DIR, "models", "congestion_classifier.json")
    vessels_file = os.path.join(BACKEND_DIR, "all_unique_vessels.json")
    compact_file = os.path.join(BACKEND_DIR, "unique_vessels_compact.json")
    if not os.path.exists(model_file) or not os.path.exists(vessels_file) or not os.path.exists(compact_file):
        print("      Ingesting ais-2026-06-04.csv & Extracting All 20,690 Unique Vessels...")
        if not os.path.exists(model_file):
            subprocess.run([sys.executable, os.path.join(BACKEND_DIR, "ingest_and_train_ais.py")], check=True)
        if not os.path.exists(vessels_file):
            subprocess.run([sys.executable, os.path.join(BACKEND_DIR, "generate_all_unique_vessels.py")], check=True)
        if not os.path.exists(compact_file):
            subprocess.run([sys.executable, os.path.join(BACKEND_DIR, "prepare_compact_vessels.py")], check=True)
    else:
        print("      AIS-grounded Models & 20,690 Unique Vessels Telemetry verified.")

    # 4. Check Frontend node_modules
    print("[3/4] Verifying Frontend Dependencies...")
    frontend_node_modules = os.path.join(FRONTEND_DIR, "node_modules")
    if not os.path.exists(frontend_node_modules):
        print("      Installing frontend npm packages (First-time setup)...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        subprocess.run([npm_cmd, "install"], cwd=FRONTEND_DIR, check=True)
    else:
        print("      Frontend node_modules verified.")

    # 5. Launch Backend
    print("[4/4] Launching Aiqon Full-Stack Platform...")
    print("      -> Starting FastAPI Backend on http://localhost:8000...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=BACKEND_DIR
    )
    processes.append(backend_proc)

    # 6. Launch Frontend
    print("      -> Starting Vite React Frontend on http://localhost:5173...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR
    )
    processes.append(frontend_proc)

    print("\n[INFO] Waiting for web services to initialize...")
    wait_for_service("http://localhost:8000/api/health", timeout=12)
    wait_for_service("http://localhost:5173", timeout=12)

    print("""
===============================================================================
              AIQON PLATFORM IS NOW LIVE AND FULLY OPERATIONAL!
===============================================================================
 * Frontend Portal : http://localhost:5173
 * Backend API Docs: http://localhost:8000/docs
 * NVIDIA AI Model : nvidia/nemotron-3.5-lightning-30b-a3b
===============================================================================
[NOTE] Closing this terminal window or pressing Ctrl+C will automatically
       stop and terminate all running backend and frontend processes.
===============================================================================
""")

    # Launch browser
    try:
        webbrowser.open("http://localhost:5173")
    except Exception:
        pass

    # Monitor loop
    try:
        while True:
            time.sleep(1)
            # If any child process terminates unexpectedly
            if backend_proc.poll() is not None:
                print(f"[WARN] Backend process terminated with code {backend_proc.poll()}.")
                break
            if frontend_proc.poll() is not None:
                print(f"[WARN] Frontend process terminated with code {frontend_proc.poll()}.")
                break
    except KeyboardInterrupt:
        print("\n[INFO] KeyboardInterrupt received. Terminating all processes...")
    finally:
        kill_child_processes()
        print("[INFO] All Aiqon processes stopped cleanly.")

if __name__ == "__main__":
    main()

