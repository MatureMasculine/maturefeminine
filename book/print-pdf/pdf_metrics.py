"""Physical spread measurements for locally rendered PDFs."""

from __future__ import annotations

import json
import re
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
    return metrics


def _bounds_for_page(metrics: dict[str, Any], page_number: int) -> fitz.Rect:
    configured = metrics["bodyBounds"]["odd" if page_number % 2 else "even"]
    return fitz.Rect(configured["left"], configured["top"], configured["right"], configured["bottom"])


def _block_text(block: dict[str, Any]) -> str:
    return "".join(span["text"] for line in block.get("lines", []) for span in line.get("spans", [])).strip()


def _is_numeric_footer(block: dict[str, Any], page: fitz.Page, bounds: fitz.Rect, metrics: dict[str, Any]) -> bool:
    footer = metrics["numericFooter"]
    if block.get("type") != 0 or not re.fullmatch(rf"\d{{1,{int(footer['maxDigits'])}}}", _block_text(block)):
        return False
    rect = fitz.Rect(block["bbox"])
    return rect.y0 >= bounds.y1 and abs(rect.x0 + rect.width / 2 - page.rect.width / 2) <= float(footer["centerTolerance"])


def _outside_body(rect: fitz.Rect, bounds: fitz.Rect, tolerance: float) -> bool:
    return rect.x0 < bounds.x0 - tolerance or rect.x1 > bounds.x1 + tolerance or rect.y0 < bounds.y0 - tolerance or rect.y1 > bounds.y1 + tolerance


def measure_pdf(path: Path | str, config_path: Path = CONFIG_PATH) -> SpreadMeasurement:
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
        for page_number, page in enumerate(document, start=1):
            bounds = _bounds_for_page(metrics, page_number)
            blocks: list[fitz.Rect] = []
            for block in page.get_text("dict")["blocks"]:
                if block.get("type") not in (0, 1) or _is_numeric_footer(block, page, bounds, metrics):
                    continue
                rect = fitz.Rect(block["bbox"])
                if _outside_body(rect, bounds, tolerance):
                    overflow_blocks += 1
                if rect.intersects(bounds):
                    blocks.append(rect & bounds)
            if not blocks:
                blank_pages.append(page_number)
                continue
            if page_number == len(document):
                final_fill = max(0.0, min(1.0, (max(block.y1 for block in blocks) - bounds.y0) / bounds.height))
        passed = (
            len(document) == 2
            and not blank_pages
            and overflow_blocks == 0
            and minimum_fill <= final_fill <= maximum_fill
        )
        return SpreadMeasurement(
            pages=len(document),
            final_fill=round(final_fill, 4),
            blank_pages=tuple(blank_pages),
            overflow_blocks=overflow_blocks,
            passed=passed,
        )
    finally:
        document.close()


def measurement_dict(measurement: SpreadMeasurement) -> dict[str, Any]:
    """Produce stable JSON-ready measurements for reports."""
    result = asdict(measurement)
    result["blank_pages"] = list(measurement.blank_pages)
    return result
