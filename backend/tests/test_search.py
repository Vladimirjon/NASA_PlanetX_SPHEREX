from hypothesis import given, settings
from hypothesis import strategies as st

from skyshift.adapters.popular_catalog import load_catalog
from skyshift.domain.search import Target, normalize, parse_coordinates, rank, similarity


@given(st.text(max_size=100))
def test_normalization_is_idempotent(text: str):
    assert normalize(normalize(text)) == normalize(text)


def test_common_names_and_typos():
    assert normalize("Messier 31") == normalize("M 31") == normalize("M31")
    assert normalize("\u03b1 Cen") == normalize("alf cen") == normalize("alpha cen")
    assert normalize("NGC224") == normalize("ngc 224")
    assert similarity("andromeada", "andromeda") > 0.7
    assert similarity("betelguese", "betelgeuse") > 0.7


def test_coordinates():
    assert parse_coordinates("10.68 41.27") == (10.68, 41.27)
    assert parse_coordinates("00:42:44 +41:16:09") == (10.683333333333334, 41.26916666666666)
    assert parse_coordinates("00h42m44s +41d16m09s") == parse_coordinates("00:42:44 +41:16:09")
    assert parse_coordinates("360 91") is None


def test_every_alias_finds_its_own_target_first():
    from skyshift.adapters.popular_catalog import load_catalog
    from skyshift.domain.search import normalize

    catalog = load_catalog()
    owner = {}
    for target in catalog:
        for alias in (target.name, *target.aliases):
            assert rank(alias, (target.name, *target.aliases))[0] == 1.0
            key = normalize(alias)
            assert key not in owner or owner[key] == target.name
            owner[key] = target.name


def test_each_catalog_name_with_one_deletion_in_top_three():
    from skyshift.adapters.popular_catalog import load_catalog
    from skyshift.domain.search import rank

    catalog = load_catalog()
    for target in catalog:
        if len(target.name) < 5:
            continue
        typo = target.name[:-1]
        ranked = sorted(
            catalog,
            key=lambda item: (
                -rank(typo, (item.name, *item.aliases))[0],
                item.name.casefold(),
                item.name,
            ),
        )
        assert target in ranked[:3], (target.name, typo)


@given(
    st.floats(min_value=0, max_value=359.99, allow_nan=False),
    st.floats(min_value=-90, max_value=90, allow_nan=False),
)
def test_decimal_coordinate_round_trip(ra: float, dec: float):
    assert parse_coordinates(f"{ra:.8f} {dec:.8f}") == (round(ra, 8), round(dec, 8))


def test_typo_transposition_and_exact_rank():
    from skyshift.domain.search import similarity

    assert similarity("betelguese", "betelgeuse") > similarity("betelguese", "beetle")
    assert similarity("betelguese", "betelgeuse") >= 0.75


_CATALOG = load_catalog()
_LONG_NAMES = tuple(target for target in _CATALOG if len(target.name) >= 5)


@settings(deadline=None, max_examples=150)
@given(st.sampled_from(_LONG_NAMES), st.data())
def test_single_deletion_tolerance(target: Target, data: st.DataObject):
    position = data.draw(st.integers(min_value=0, max_value=len(target.name) - 1))
    query = target.name[:position] + target.name[position + 1 :]
    results = sorted(
        _CATALOG,
        key=lambda item: (
            -rank(query, (item.name, *item.aliases))[0],
            item.name.casefold(),
            item.name,
        ),
    )
    assert target in results[:3], (target.name, query)
