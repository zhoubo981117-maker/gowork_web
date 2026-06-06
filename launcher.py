"""Entry point: start uvicorn in a background thread, then open the browser."""

import os
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8000


def _wait_for_port(timeout: float = 10.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((HOST, PORT), timeout=0.1):
                return True
        except OSError:
            time.sleep(0.1)
    return False


def _data_dir() -> Path:
    if getattr(sys, "frozen", False):
        base = Path(sys.executable).parent
    else:
        base = Path(__file__).parent
    d = base / "data"
    d.mkdir(exist_ok=True)
    return d


def main() -> None:
    os.environ["DATA_DIR"] = str(_data_dir())

    import uvicorn
    from job_search_agent.main import app

    thread = threading.Thread(
        target=lambda: uvicorn.run(app, host=HOST, port=PORT, log_level="warning"),
        daemon=True,
    )
    thread.start()

    if not _wait_for_port():
        print("ERROR: server did not start within 10 seconds", file=sys.stderr)
        sys.exit(1)

    webbrowser.open(f"http://{HOST}:{PORT}")
    print(f"求职看板已启动: http://{HOST}:{PORT}")
    print("关闭此窗口即可停止服务。")

    try:
        thread.join()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
