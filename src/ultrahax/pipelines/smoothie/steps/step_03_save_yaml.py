from pathlib import Path


def _build_target_file(source_file: str, target_dir: str) -> Path:
    source_path = Path(source_file)
    return Path(target_dir) / f"{source_path.stem}.yaml"


def run(context: dict) -> dict:
    results = context.get("results")
    target_dir = context.get("target_dir")
    overwrite = context.get("overwrite", False)

    if results is None:
        raise ValueError("Missing 'results' in context.")
    if not target_dir:
        raise ValueError("Missing 'target_dir' in context.")

    saved_files = []

    for result in results:
        source_file = result["source_file"]
        inline_yaml = result["inline_yaml"]

        target_file = _build_target_file(source_file, target_dir)
        target_file.parent.mkdir(parents=True, exist_ok=True)

        if target_file.exists() and not overwrite:
            raise FileExistsError(f"Output file already exists: {target_file}")

        target_file.write_text(inline_yaml, encoding="utf-8")
        saved_files.append(str(target_file))

    context["saved_files"] = saved_files
    return context