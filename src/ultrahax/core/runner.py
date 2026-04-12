def run_pipeline(config: dict, step_registry: dict, context: dict | None = None) -> dict:
    if context is None:
        context = {}

    if not config.get("enabled", True):
        print("Pipeline is disabled.")
        return context

    verbose = config.get("verbose", False)
    stop_on_error = config.get("settings", {}).get("stop_on_error", True)
    dry_run = config.get("settings", {}).get("dry_run", False)

    for step_config in config.get("steps", []):
        step_name = step_config["name"]
        step_enabled = step_config.get("enabled", True)

        if not step_enabled:
            if verbose:
                print(f"Skipping disabled step: {step_name}")
            continue

        if step_name not in step_registry:
            raise ValueError(f"Step '{step_name}' is not registered.")

        step_function = step_registry[step_name]

        if verbose:
            print(f"Running step: {step_name}")

        if dry_run:
            continue

        try:
            context = step_function(context)
        except Exception as error:
            print(f"Step failed: {step_name} -> {error}")
            if stop_on_error:
                raise

    return context