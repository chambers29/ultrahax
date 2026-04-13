from pathlib import Path


def _collect_json_files(source_dir: str, pattern: str) -> list[str]:
    source_path = Path(source_dir)

    if not source_path.exists():
        raise FileNotFoundError(f"Input directory not found: {source_path}")

    if not source_path.is_dir():
        raise NotADirectoryError(f"Input path is not a directory: {source_path}")

    files = sorted(source_path.glob(pattern))
    return [str(file) for file in files if file.is_file()]


def run(context: dict) -> dict:
    source_dir = context.get("source_dir")
    pattern = context.get("pattern", "*.json")

    if not source_dir:
        raise ValueError("Missing 'source_dir' in context.")

    json_files = _collect_json_files(source_dir, pattern)
    context["json_files"] = json_files

    return context