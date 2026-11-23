#!/usr/bin/env python3
"""Create a self-contained source/build transfer ZIP using only Python's stdlib."""
import hashlib
import json
import os
from pathlib import Path
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "outputs" / "transfer"
ARCHIVE = DEST / "catacomb-cats-portable.zip"
MANIFEST = DEST / "manifest.json"
SKIP_DIRS = {".git", "node_modules", "test-results", "playwright-report", ".cache", "__pycache__", ".venv"}


def include(path):
    rel = path.relative_to(ROOT)
    return not (
        rel.parts[:2] == ("outputs", "transfer")
        or path.name == ".DS_Store"
        or path.name == ".env"
        or path.name.startswith(".env.")
        or path.suffix in {".pem", ".key"}
    )


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    files = []
    for current, dirs, names in os.walk(ROOT, followlinks=False):
        current = Path(current)
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS and include(current / d))
        for name in dirs + names:
            item = current / name
            if include(item) and item.is_symlink():
                raise RuntimeError(f"External/symlink dependency must be resolved before transfer: {item.relative_to(ROOT)}")
        for name in sorted(names):
            item = current / name
            if include(item):
                files.append(item)
    files.sort(key=lambda p: p.relative_to(ROOT).as_posix())
    manifest = {
        "format": 1,
        "project": "catacomb-cats",
        "hashAlgorithm": "sha256",
        "excluded": sorted(SKIP_DIRS) + ["outputs/transfer (except manifest.json)", ".env*", "*.pem", "*.key", ".DS_Store"],
        "files": [
            {"path": p.relative_to(ROOT).as_posix(), "bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
            for p in files
        ],
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    with tempfile.NamedTemporaryFile(dir=DEST, suffix=".zip", delete=False) as temp:
        temp_path = Path(temp.name)
    try:
        with zipfile.ZipFile(temp_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
            for path in files + [MANIFEST]:
                bundle.write(path, "catacomb-cats/" + path.relative_to(ROOT).as_posix())
        temp_path.replace(ARCHIVE)
    finally:
        temp_path.unlink(missing_ok=True)
    checksum = hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()
    (DEST / (ARCHIVE.name + ".sha256")).write_text(f"{checksum}  {ARCHIVE.name}\n", encoding="utf-8")
    print(f"Created {ARCHIVE.relative_to(ROOT)}: {len(files)} files + manifest, {ARCHIVE.stat().st_size:,} bytes")
    print(f"SHA-256: {checksum}")


if __name__ == "__main__":
    main()
