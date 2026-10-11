"""Start the local FinSight workspace and stop both servers together."""
import argparse
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen
import webbrowser

ROOT = Path(__file__).resolve().parent


def available_port(port):
    with socket.socket() as connection:
        try:
            connection.bind(("127.0.0.1", port))
        except OSError:
            raise RuntimeError(f"Port {port} is already in use. Close the existing server or choose another port.")


def ready(url):
    try:
        with urlopen(url, timeout=1) as response:
            return response.status == 200
    except (URLError, OSError):
        return False


def stop(process):
    if process.poll() is not None:
        return
    if os.name == "nt":
        # Only stop the process tree created by this launcher, including reload workers.
        subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    else:
        os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        if os.name != "nt":
            os.killpg(process.pid, signal.SIGKILL)
        else:
            process.kill()
        process.wait()


def main():
    parser = argparse.ArgumentParser(description="Run FinSight Backend and Frontend together.")
    parser.add_argument("--backend-port", type=int, default=8000)
    parser.add_argument("--frontend-port", type=int, default=5173)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--check", action="store_true", help="Check startup and stop both servers without opening a browser.")
    args = parser.parse_args()
    processes = []
    try:
        for port in (args.backend_port, args.frontend_port):
            if not 1 <= port <= 65535:
                raise RuntimeError("Ports must be between 1 and 65535.")
            available_port(port)
        if args.backend_port == args.frontend_port:
            raise RuntimeError("Backend and Frontend must use different ports.")
        python = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        node = shutil.which("node")
        vite = ROOT / "frontend/node_modules/vite/bin/vite.js"
        if not python.is_file():
            raise RuntimeError("Backend is not installed. Follow the first-time setup in README.md.")
        if not node or not vite.is_file():
            raise RuntimeError("Frontend is not installed. Install Node.js and run: npm.cmd --prefix frontend ci")
        env = os.environ.copy()
        env["FINSIGHT_BACKEND_PORT"] = str(args.backend_port)
        options = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt" else {"start_new_session": True}
        print("Starting FinSight Backend and Frontend...", flush=True)
        commands = [
            ([str(python), "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", str(args.backend_port), "--reload"], ROOT),
            ([node, str(vite), "--host", "127.0.0.1", "--port", str(args.frontend_port), "--strictPort"], ROOT / "frontend"),
        ]
        for command, directory in commands:
            processes.append(subprocess.Popen(command, cwd=directory, env=env, **options))
        site = f"http://127.0.0.1:{args.frontend_port}"
        checks = [f"http://127.0.0.1:{args.backend_port}/api/health", site, site + "/api/health"]
        deadline = time.monotonic() + 45
        while True:
            if any(process.poll() is not None for process in processes):
                raise RuntimeError("A server stopped during startup. See the error above.")
            if all(ready(url) for url in checks):
                break
            if time.monotonic() >= deadline:
                raise RuntimeError("Startup timed out. See the server output above.")
            time.sleep(0.4)
        print(f"FinSight is ready: {site} | Stop both servers with Ctrl+C.", flush=True)
        if args.check:
            print("Startup check passed: Frontend, Backend, and API proxy are ready.", flush=True)
            return 0
        if not args.no_browser:
            webbrowser.open(site)
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
        raise RuntimeError("A server stopped. Restart FinSight after checking the error above.")
    except KeyboardInterrupt:
        print("\nStopping FinSight...", flush=True)
        return 0
    except (RuntimeError, OSError) as error:
        print(f"FinSight: {error}", file=sys.stderr, flush=True)
        return 1
    finally:
        # Ignore a second Ctrl+C while cleaning up our own process trees.
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        for process in reversed(processes):
            stop(process)


if __name__ == "__main__":
    raise SystemExit(main())
