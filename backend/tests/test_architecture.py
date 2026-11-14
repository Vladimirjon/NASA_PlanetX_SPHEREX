"""ADR 0008: dependency rule domain ← application ← adapters/api, enforced by import scanning."""

import ast
import sys
from pathlib import Path

import pytest

PKG = Path(__file__).resolve().parents[1] / "src" / "skyshift"

# For each layer: which skyshift layers it may import, and whether third-party imports are allowed.
RULES: dict[str, tuple[set[str], bool]] = {
    "domain": ({"domain"}, False),
    "ports": ({"domain", "ports"}, False),
    "application": ({"domain", "ports", "application"}, False),
    "adapters": ({"domain", "ports", "adapters"}, True),
    "api": ({"domain", "ports", "application", "adapters", "api", "config"}, True),
}


def _imports(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            names.add(node.module)
    return names


def _cases() -> list[tuple[str, Path]]:
    return [(layer, f) for layer in RULES for f in sorted((PKG / layer).rglob("*.py"))]


@pytest.mark.parametrize(("layer", "path"), _cases(), ids=lambda v: str(v).split("skyshift/")[-1])
def test_layer_imports_respect_dependency_rule(layer: str, path: Path):
    allowed_layers, third_party_ok = RULES[layer]
    for name in _imports(path):
        root = name.split(".")[0]
        if root == "skyshift":
            target = name.split(".")[1] if "." in name else ""
            assert target in allowed_layers, f"{layer} must not import {name}"
        elif root not in sys.stdlib_module_names:
            assert third_party_ok, f"{layer} must stay pure; imports third-party {name}"


def test_every_layer_exists():
    for layer in RULES:
        assert (PKG / layer).is_dir(), layer
