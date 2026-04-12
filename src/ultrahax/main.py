from pathlib import Path
import argparse
import importlib

from ultrahax.core.config import load_yaml_config
from ultrahax.core.runner import run_pipeline


BASE_DIR = Path(__file__).resolve().parent
PIPELINES_DIR = BASE_DIR / "pipelines"


def get_available_pipelines() -> list[str]:
    pipelines = []

    if not PIPELINES_DIR.exists():
        return pipelines

    for path in PIPELINES_DIR.iterdir():
        if not path.is_dir():
            continue

        has_config = (path / "config.yaml").exists()
        has_registry = (path / "registry.py").exists()

        if has_config and has_registry:
            pipelines.append(path.name)

    return sorted(pipelines)


def choose_pipeline_interactively(pipelines: list[str]) -> str:
    if not pipelines:
        raise ValueError(f"No pipelines found in {PIPELINES_DIR}.")

    print("Available pipelines:")
    for index, pipeline_name in enumerate(pipelines, start=1):
        print(f"{index}. {pipeline_name}")

    while True:
        choice = input("Choose pipeline number: ").strip()

        if not choice.isdigit():
            print("Please enter a valid number.")
            continue

        selected_index = int(choice)

        if 1 <= selected_index <= len(pipelines):
            return pipelines[selected_index - 1]

        print("Selected number is out of range.")


def load_step_registry(pipeline_name: str) -> dict:
    try:
        registry_module = importlib.import_module(
            f"ultrahax.pipelines.{pipeline_name}.registry"
        )
    except ModuleNotFoundError as error:
        raise ModuleNotFoundError(
            f"Registry module not found for pipeline '{pipeline_name}'."
        ) from error

    if not hasattr(registry_module, "STEP_REGISTRY"):
        raise AttributeError(
            f"Pipeline '{pipeline_name}' does not define STEP_REGISTRY in registry.py."
        )

    return registry_module.STEP_REGISTRY


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a pipeline.")
    parser.add_argument(
        "pipeline",
        nargs="?",
        help="Pipeline name, e.g. count_to_five",
    )
    args = parser.parse_args()

    pipeline_name = args.pipeline

    if pipeline_name is None:
        available_pipelines = get_available_pipelines()
        pipeline_name = choose_pipeline_interactively(available_pipelines)

    config_path = PIPELINES_DIR / pipeline_name / "config.yaml"
    if not config_path.exists():
        raise FileNotFoundError(
            f"Config not found for pipeline '{pipeline_name}': {config_path}"
        )

    config = load_yaml_config(config_path)
    step_registry = load_step_registry(pipeline_name)

    initial_context = {
        **config.get("input", {}),
        **config.get("output", {}),
        **config.get("context", {}).get("initial_values", {}),
    }

    run_pipeline(
        config=config,
        step_registry=step_registry,
        context=initial_context,
    )


if __name__ == "__main__":
    main()