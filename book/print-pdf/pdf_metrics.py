"""Physical spread measurements for locally rendered PDFs."""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import fitz


SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "print_config.json"


@dataclass(frozen=True)
class SpreadMeasurement:
    pages: int
    final_fill: float
    blank_pages: tuple[int, ...]
    overflow_blocks: int
    passed: bool
    visual_checked: bool = False
    artwork_on_first: bool = False
    black_panel_on_first: bool = False
    opening_quote_first_only: bool = False
    closing_quote_on_second: bool = False
    required_fonts_embedded: bool = False
    failure_reasons: tuple[str, ...] = ()


def load_metrics_config(config_path: Path = CONFIG_PATH) -> dict[str, Any]:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    metrics = config["metrics"]
    required = ("left", "right", "top", "bottom")
    body_bounds = metrics["bodyBounds"]
    for parity in ("odd", "even"):
        bounds = body_bounds.get(parity, {})
        if any(key not in bounds for key in required):
            raise ValueError(f"metrics.bodyBounds.{parity} must define left, right, top, and bottom")
        if bounds["left"] >= bounds["right"] or bounds["top"] >= bounds["bottom"]:
            raise ValueError(f"metrics.bodyBounds.{parity} must be a positive rectangle")
    if float(metrics["overflowTolerance"]) < 0:
        raise ValueError("metrics.overflowTolerance cannot be negative")
    folio = metrics["numericFolio"]
    if int(folio["maxDigits"]) < 1:
        raise ValueError("metrics.numericFolio.maxDigits must be positive")
    for label, region in (
        ("openingCentered", folio["openingCentered"]),
        ("continuationOuter.odd", folio["continuationOuter"]["odd"]),
        ("continuationOuter.even", folio["continuationOuter"]["even"]),
    ):
        if any(key not in region for key in required) or region["left"] >= region["right"] or region["top"] >= region["bottom"]:
            raise ValueError(f"metrics.numericFolio.{label} must define a positive rectangle")
    visual = metrics["visual"]
    if float(visual["firstColumnRight"]) <= float(body_bounds["even"]["left"]):
        raise ValueError("metrics.visual.firstColumnRight must extend beyond the even-page left bound")
    if not visual["requiredFonts"]:
        raise ValueError("metrics.visual.requiredFonts cannot be empty")
    return metrics


def _bounds_for_page(metrics: dict[str, Any], page_number: int) -> fitz.Rect:
    configured = metrics["bodyBounds"]["odd" if page_number % 2 else "even"]
    return fitz.Rect(configured["left"], configured["top"], configured["right"], configured["bottom"])


def _block_text(block: dict[str, Any]) -> str:
    return "".join(span["text"] for line in block.get("lines", []) for span in line.get("spans", [])).strip()


def _rect_from_config(configured: dict[str, Any]) -> fitz.Rect:
    return fitz.Rect(configured["left"], configured["top"], configured["right"], configured["bottom"])


def _is_numeric_folio(block: dict[str, Any], metrics: dict[str, Any], local_page: int, physical_page: int) -> bool:
    folio = metrics["numericFolio"]
    if block.get("type") != 0 or not re.fullmatch(rf"\d{{1,{int(folio['maxDigits'])}}}", _block_text(block)):
        return False
    rect = fitz.Rect(block["bbox"])
    configured = folio["openingCentered"] if local_page == 1 else folio["continuationOuter"]["odd" if physical_page % 2 else "even"]
    return not _outside_body(rect, _rect_from_config(configured), 0.5)


def _outside_body(rect: fitz.Rect, bounds: fitz.Rect, tolerance: float) -> bool:
    return rect.x0 < bounds.x0 - tolerance or rect.x1 > bounds.x1 + tolerance or rect.y0 < bounds.y0 - tolerance or rect.y1 > bounds.y1 + tolerance


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).replace("\u00ad", "")
    return re.sub(r"\s+", " ", normalized).strip().casefold()


def _quote_body(expected_entry: dict[str, Any], position: str) -> str:
    quote = str(expected_entry.get("quotes", {}).get(position, ""))
    return _normalize_text(quote.split("\n\n", 1)[0])


def _drawing_fill_is_black(drawing: dict[str, Any], maximum_channel: float) -> bool:
    fill = drawing.get("fill")
    if fill is None:
        return False
    channels = fill if isinstance(fill, (tuple, list)) else (fill,)
    return bool(channels) and max(float(channel) for channel in channels) <= maximum_channel


def _artwork_rect_passes(rect: fitz.Rect, bounds: fitz.Rect, metrics: dict[str, Any]) -> bool:
    artwork = metrics["visual"]["artwork"]
    rail = fitz.Rect(bounds.x0, bounds.y0, float(metrics["visual"]["firstColumnRight"]), bounds.y1)
    visible = rect & rail
    return visible.width >= float(artwork["minimumWidth"]) and visible.height >= float(artwork["minimumHeight"])


def _font_evidence(document: fitz.Document) -> list[tuple[Any, ...]]:
    fonts: list[tuple[Any, ...]] = []
    for page in document:
        fonts.extend(page.get_fonts(full=True))
    return fonts


def _required_fonts_embedded(document: fitz.Document, required: list[str]) -> tuple[bool, list[str]]:
    evidence = _font_evidence(document)
    missing: list[str] = []
    for required_name in required:
        needle = re.sub(r"[^a-z0-9]", "", required_name.casefold())
        matched = False
        for font in evidence:
            xref, extension = font[0], str(font[1]).casefold()
            names = " ".join(str(value) for value in font[3:5])
            normalized_names = re.sub(r"[^a-z0-9]", "", names.casefold())
            if needle in normalized_names and int(xref) > 0 and extension not in {"", "n/a"}:
                matched = True
                break
        if not matched:
            missing.append(required_name)
    return not missing, missing


def measure_pdf(
    path: Path | str,
    config_path: Path = CONFIG_PATH,
    expected_entry: dict[str, Any] | None = None,
    physical_start_page: int = 2,
) -> SpreadMeasurement:
    """Measure a standalone entry PDF against the configured two-page contract."""
    metrics = load_metrics_config(config_path)
    minimum_fill = float(metrics["minimumFinalFill"])
    maximum_fill = float(metrics["maximumFinalFill"])
    tolerance = float(metrics["overflowTolerance"])
    document = fitz.open(path)
    try:
        blank_pages: list[int] = []
        overflow_blocks = 0
        final_fill = 0.0
        page_texts: list[str] = []
        artwork_on_first = False
        black_panel_on_first = False
        black_panel_outside = False
        for local_page, page in enumerate(document, start=1):
            physical_page = physical_start_page + local_page - 1
            bounds = _bounds_for_page(metrics, physical_page)
            blocks: list[fitz.Rect] = []
            page_dict = page.get_text("dict")
            page_texts.append(_normalize_text(page.get_text("text", flags=fitz.TEXTFLAGS_TEXT | fitz.TEXT_DEHYPHENATE)))
            for block in page_dict["blocks"]:
                if block.get("type") not in (0, 1) or _is_numeric_folio(block, metrics, local_page, physical_page):
                    continue
                rect = fitz.Rect(block["bbox"])
                if _outside_body(rect, bounds, tolerance):
                    overflow_blocks += 1
                if rect.intersects(bounds):
                    blocks.append(rect & bounds)
                if local_page == 1 and block.get("type") == 1:
                    artwork_on_first = artwork_on_first or _artwork_rect_passes(rect, bounds, metrics)
            if local_page == 1:
                for image in page.get_images(full=True):
                    for rect in page.get_image_rects(image[0]):
                        artwork_on_first = artwork_on_first or _artwork_rect_passes(rect, bounds, metrics)
                panel = metrics["visual"]["blackPanel"]
                for drawing in page.get_drawings():
                    rect = fitz.Rect(drawing["rect"])
                    if (
                        rect.width < float(panel["minimumWidth"])
                        or rect.height < float(panel["minimumHeight"])
                        or not _drawing_fill_is_black(drawing, float(panel["maximumChannel"]))
                    ):
                        continue
                    inside = (
                        rect.x0 >= bounds.x0 - tolerance
                        and rect.x1 <= float(metrics["visual"]["firstColumnRight"]) + tolerance
                        and not _outside_body(rect, bounds, tolerance)
                    )
                    black_panel_on_first = black_panel_on_first or inside
                    black_panel_outside = black_panel_outside or not inside
            if not blocks:
                blank_pages.append(local_page)
                continue
            if local_page == len(document):
                final_fill = max(0.0, min(1.0, (max(block.y1 for block in blocks) - bounds.y0) / bounds.height))

        visual_checked = expected_entry is not None
        opening_quote_first_only = False
        closing_quote_on_second = False
        required_fonts_embedded = False
        missing_fonts: list[str] = []
        if visual_checked:
            opening = _quote_body(expected_entry, "opening")
            closing = _quote_body(expected_entry, "closing")
            opening_quote_first_only = bool(opening and page_texts and opening in page_texts[0] and all(opening not in text for text in page_texts[1:]))
            closing_quote_on_second = bool(closing and len(page_texts) >= 2 and closing in page_texts[1])
            required_fonts_embedded, missing_fonts = _required_fonts_embedded(document, list(metrics["visual"]["requiredFonts"]))

        failure_reasons: list[str] = []
        if len(document) != 2:
            failure_reasons.append(f"expected exactly 2 pages, found {len(document)}")
        if blank_pages:
            failure_reasons.append("blank pages: " + ", ".join(str(page) for page in blank_pages))
        if overflow_blocks:
            failure_reasons.append(f"content exceeds configured body bounds in {overflow_blocks} block(s)")
        if final_fill < minimum_fill:
            failure_reasons.append(f"final fill {final_fill:.4f} is below minimum {minimum_fill:.4f}")
        if final_fill > maximum_fill:
            failure_reasons.append(f"final fill {final_fill:.4f} is above maximum {maximum_fill:.4f}")
        if visual_checked:
            if not artwork_on_first:
                failure_reasons.append("missing artwork on first page")
            if not black_panel_on_first:
                failure_reasons.append(
                    "black profile panel outside first-page body bounds"
                    if black_panel_outside
                    else "missing black profile panel on first page"
                )
            if not opening_quote_first_only:
                failure_reasons.append("opening quote must appear on first page only")
            if not closing_quote_on_second:
                failure_reasons.append("closing quote must appear on second page")
            if not required_fonts_embedded:
                if missing_fonts == ["Cinzel Decorative"]:
                    failure_reasons.append("required Cinzel font is not embedded")
                else:
                    failure_reasons.append("required fonts are not embedded: " + ", ".join(missing_fonts))
        return SpreadMeasurement(
            pages=len(document),
            final_fill=round(final_fill, 4),
            blank_pages=tuple(blank_pages),
            overflow_blocks=overflow_blocks,
            passed=not failure_reasons,
            visual_checked=visual_checked,
            artwork_on_first=artwork_on_first if visual_checked else False,
            black_panel_on_first=black_panel_on_first if visual_checked else False,
            opening_quote_first_only=opening_quote_first_only,
            closing_quote_on_second=closing_quote_on_second,
            required_fonts_embedded=required_fonts_embedded,
            failure_reasons=tuple(failure_reasons),
        )
    finally:
        document.close()


def measurement_dict(measurement: SpreadMeasurement) -> dict[str, Any]:
    """Produce stable JSON-ready measurements for reports."""
    result = asdict(measurement)
    result["blank_pages"] = list(measurement.blank_pages)
    result["failure_reasons"] = list(measurement.failure_reasons)
    return result
