"""RFC 9457 problem+json responses and the mapping from domain/cache errors."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from skyshift.application.tiered_cache import UpstreamUnavailable
from skyshift.domain.hips import InvalidTileAddress
from skyshift.domain.position import InvalidPosition
from skyshift.ports.origin import InvalidPayload, OriginNotFound

PROBLEM_TYPE = "https://skyshift.invalid/problems/"


def problem(status: int, slug: str, title: str, detail: str | None = None) -> JSONResponse:
    body: dict[str, str | int] = {"type": PROBLEM_TYPE + slug, "title": title, "status": status}
    if detail:
        body["detail"] = detail
    return JSONResponse(body, status_code=status, media_type="application/problem+json")


def install_problem_handlers(app: FastAPI) -> None:
    async def invalid_input(_: Request, exc: Exception) -> JSONResponse:
        return problem(422, "invalid-input", "Invalid input", str(exc))

    async def validation(_: Request, exc: Exception) -> JSONResponse:
        assert isinstance(exc, RequestValidationError)
        fields = ", ".join(".".join(str(p) for p in err["loc"]) for err in exc.errors())
        return problem(422, "invalid-input", "Invalid input", f"invalid field(s): {fields}")

    async def not_found(_: Request, exc: Exception) -> JSONResponse:
        return problem(404, "not-found", "Not found upstream", str(exc))

    async def unavailable(_: Request, exc: Exception) -> JSONResponse:
        return problem(
            503,
            "upstream-unavailable",
            "IRSA is unavailable and no cached copy exists",
            str(exc),
        )

    async def bad_payload(_: Request, exc: Exception) -> JSONResponse:
        return problem(503, "upstream-invalid", "IRSA returned an invalid payload", str(exc))

    app.add_exception_handler(RequestValidationError, validation)
    app.add_exception_handler(InvalidTileAddress, invalid_input)
    app.add_exception_handler(InvalidPosition, invalid_input)
    app.add_exception_handler(OriginNotFound, not_found)
    app.add_exception_handler(UpstreamUnavailable, unavailable)
    app.add_exception_handler(InvalidPayload, bad_payload)
