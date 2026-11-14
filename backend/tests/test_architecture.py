"""ADR 0008: dependency rule domain ← application ← adapters/api, enforced by import scanning."""

import ast
import sys
from pathlib import Path

import pytest

PKG = Path(__file__).resolve().parents[1] / "src" / "skyshift"

# Pure computation libraries the science core may use (no network, no web framework).
SCIENCE = {"numpy", "astropy", "reproject"}
ANY = {"*"}

# For each layer: which skyshift layers it may import, and which third-party roots.
RULES: dict[str, tuple[set[str], set[str]]] = {
    "domain": ({"domain"}, SCIENCE),
    "ports": ({"domain", "ports"}, {"numpy"}),
    "application": ({"domain", "ports", "application"}, SCIENCE),
    "adapters": ({"domain", "ports", "adapters"}, ANY),
    "api": ({"domain", "ports", "application", "adapters", "api", "config"}, ANY),
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
    allowed_layers, third_party = RULES[layer]
    for name in _imports(path):
        root = name.split(".")[0]
        if root == "skyshift":
            target = name.split(".")[1] if "." in name else ""
            assert target in allowed_layers, f"{layer} must not import {name}"
        elif root not in sys.stdlib_module_names:
            assert third_party == ANY or root in third_party, f"{layer} must not import {name}"
            assert not name.startswith("astropy.utils.data"), f"{layer}: no downloads in core"


def test_every_layer_exists():
    for layer in RULES:
        assert (PKG / layer).is_dir(), layer
