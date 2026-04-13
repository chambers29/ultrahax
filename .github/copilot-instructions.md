 # ultrahax — Copilot Instructions

## Project Overview

Step-based pipeline runner framework (Python 3.11+) paired with a Node.js stadium generator for HaxBall `.json` stadium files.

## Tech Stack

- **Python 3.11+** — pipeline framework (`src/ultrahax/`)
- **Node.js** — stadium generator (`stadium_generator.js`, uses `js-yaml`)
- **Package manager**: pip (editable install via `pyproject.toml`), npm for JS deps
- **No test framework yet** — `test/` directory exists but is empty

## Project Structure

```
src/ultrahax/
  main.py              — CLI entry point (run-pipeline command)
  core/
    runner.py          — Pipeline executor (sequential steps, verbose/dry_run/stop_on_error)
    config.py          — YAML config loader
    paths.py           — Directory path constants
    utils.py           — Interactive file chooser helper
  pipelines/<name>/
    config.yaml        — Pipeline definition (steps, input/output, settings)
    registry.py        — Maps step names → run() callables
    steps/
      step_NN_name.py  — Each step exports run(context: dict) -> dict

stadium_generator.js   — YAML templates → .json stadiums (inverse of smoothie pipeline)

data/
  dirty_json/          — Raw .json stadium input files
  dirty_yamls/         — Smoothie pipeline output
  final_templates/     — Curated YAML templates for JS generator
  generated_stadiums/  — JS generator output .json files
  samples/             — Example HaxBall maps
```

## Conventions

### Pipeline Steps
- Every step is a module with `def run(context: dict) -> dict`
- Steps receive and return a shared mutable context dict
- Step file naming: `step_NN_description.py` (NN = zero-padded order)
- Registry maps short names (e.g. `"01_collect_json_files"`) to `step_module.run`

### Config YAML Schema
```yaml
name: pipeline_name
description: ...
enabled: true
verbose: true
version: 1
input: { source_dir: ..., pattern: "*.json" }
output: { target_dir: ..., overwrite: true }
settings: { stop_on_error: true, dry_run: false }
context: { initial_values: {} }
steps:
  - name: "01_step_name"
    enabled: true
```

### Code Style
- Type hints on function signatures (use `dict`, `list`, `str | None` — not `Optional`)
- No docstrings unless complex logic warrants it
- Raise specific exceptions (`ValueError`, `FileNotFoundError`) with clear messages
- Use `pathlib.Path` for all filesystem operations in Python
- Use `yaml.safe_load` for reading YAML

### Naming
- Python: `snake_case` for everything (files, functions, variables)
- JS: `camelCase` for functions/variables, file names use `snake_case`
- Pipeline dirs use `snake_case`

## HaxBall Domain Reference

### Wikis
- [Chat Commands](https://github.com/haxball/haxball-issues/wiki/Chat-Commands)
- [Stadium File (.hbs)](https://github.com/haxball/haxball-issues/wiki/Stadium-(.hbs)-File)
- [Collision Flags](https://github.com/haxball/haxball-issues/wiki/Collision-Flags)
- [Headless Host](https://github.com/haxball/haxball-issues/wiki/Headless-Host)

### Key Facts
- Stadium files are **valid JSON** (`.json` extension)
- Stadium objects have specific field types: `bg`, `traits`, `playerPhysics`, `ballPhysics` (objects); `vertexes`, `segments`, `goals`, `discs`, `planes`, `joints` (arrays)
- `cMask` and `cGroup` are collision flag fields (string or array of strings)

## Commands

```bash
# Run a pipeline
run-pipeline smoothie
run-pipeline count_to_five

# Generate stadium from YAML template
node stadium_generator.js [template.yaml] [output.json]
```