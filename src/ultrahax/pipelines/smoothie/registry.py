from .steps import step_01_collect_json_files, step_02_convert_to_inline_yaml

from .steps import (
    step_03_save_yaml,
)

STEP_REGISTRY = {
    "01_collect_json_files": step_01_collect_json_files.run,
    "02_convert_to_inline_yaml": step_02_convert_to_inline_yaml.run,
    "03_save_yaml": step_03_save_yaml.run,
}