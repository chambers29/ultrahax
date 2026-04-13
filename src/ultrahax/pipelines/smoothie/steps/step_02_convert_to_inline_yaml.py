import json
import yaml


class SmartYamlDumper(yaml.SafeDumper):
    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)


class RootBlockDict(dict):
    pass


class TopLevelBlockList(list):
    pass


def _is_scalar(value) -> bool:
    return isinstance(value, (str, int, float, bool, type(None)))


def _is_inline_compatible(value) -> bool:
    if _is_scalar(value):
        return True

    if isinstance(value, list):
        return all(_is_inline_compatible(item) for item in value)

    if isinstance(value, dict):
        return all(_is_inline_compatible(item) for item in value.values())

    return False


def _prepare_structure(value, is_root=False, is_top_level_value=False):
    if isinstance(value, dict):
        prepared = {
            key: _prepare_structure(val, is_top_level_value=is_root)
            for key, val in value.items()
        }
        if is_root:
            return RootBlockDict(prepared)
        return prepared

    if isinstance(value, list):
        prepared = [
            _prepare_structure(item, is_root=False, is_top_level_value=False)
            for item in value
        ]
        if is_top_level_value:
            return TopLevelBlockList(prepared)
        return prepared

    return value


def _should_use_flow_style_for_list(data: list) -> bool:
    return all(_is_inline_compatible(item) for item in data)


def _should_use_flow_style_for_dict(data: dict) -> bool:
    return all(_is_inline_compatible(value) for value in data.values())


def _represent_list(dumper: yaml.SafeDumper, data: list):
    flow_style = _should_use_flow_style_for_list(data)
    return dumper.represent_sequence(
        "tag:yaml.org,2002:seq",
        data,
        flow_style=flow_style,
    )


def _represent_top_level_block_list(dumper: yaml.SafeDumper, data: TopLevelBlockList):
    return dumper.represent_sequence(
        "tag:yaml.org,2002:seq",
        data,
        flow_style=False,
    )


def _represent_dict(dumper: yaml.SafeDumper, data: dict):
    flow_style = _should_use_flow_style_for_dict(data)
    return dumper.represent_mapping(
        "tag:yaml.org,2002:map",
        data,
        flow_style=flow_style,
    )


def _represent_root_block_dict(dumper: yaml.SafeDumper, data: RootBlockDict):
    return dumper.represent_mapping(
        "tag:yaml.org,2002:map",
        data,
        flow_style=False,
    )


SmartYamlDumper.add_representer(list, _represent_list)
SmartYamlDumper.add_representer(TopLevelBlockList, _represent_top_level_block_list)
SmartYamlDumper.add_representer(dict, _represent_dict)
SmartYamlDumper.add_representer(RootBlockDict, _represent_root_block_dict)


def _convert_json_to_inline_yaml(raw_json: str) -> str:
    parsed = json.loads(raw_json)
    prepared = _prepare_structure(parsed, is_root=True)

    yaml_text = yaml.dump(
        prepared,
        Dumper=SmartYamlDumper,
        sort_keys=False,
        allow_unicode=True,
        width=999999,
        indent=2,
    )

    return yaml_text


def run(context: dict) -> dict:
    json_files = context.get("json_files")
    target_dir = context.get("target_dir")
    overwrite = context.get("overwrite", False)

    if json_files is None:
        raise ValueError("Missing 'json_files' in context.")
    if not target_dir:
        raise ValueError("Missing 'target_dir' in context.")

    results = []

    for source_file in json_files:
        with open(source_file, "r", encoding="utf-8") as file:
            raw_json = file.read()

        inline_yaml = _convert_json_to_inline_yaml(raw_json)

        results.append(
            {
                "source_file": source_file,
                "inline_yaml": inline_yaml,
            }
        )

    context["results"] = results
    return context