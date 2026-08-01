"""Physical spread measurements for locally rendered PDFs."""

from __future__ import annotations

import json
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
    bounds = metrics["contentBounds"]
    required = ("left", "right", "top", "bottom")
    if any(key not in bounds for key in required):
        raise ValueError("metrics.contentBounds must define left, right, top, and bottom")
    if bounds["left"] >= bounds["right"] or bounds["top"] >= bounds["bottom"]:
        raise ValueError("metrics.contentBounds must be a positive rectangle")
    return metrics


def _content_blocks(page: fitz.Page, bounds: fitz.Rect) -> list[fitz.Rect]:
    """Return body text/image blocks, excluding headers, footers, and margins."""
    blocks: list[fitz.Rect] = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") not in (0, 1):
            continue
        rect = fitz.Rect(block["bbox"])
        if not rect.intersects(bounds):
            continue
        blocks.append(rect)
    return blocks


def measure_pdf(path: Path | str, config_path: Path = CONFIG_PATH) -> SpreadMeasurement:
    """Measure a standalone entry PDF against the configured two-page contract."""
    metrics = load_metrics_config(config_path)
    configured = metrics["contentBounds"]
    bounds = fitz.Rect(configured["left"], configured["top"], configured["right"], configured["bottom"])
    minimum_fill = float(metrics["minimumFinalFill"])
    maximum_fill = float(metrics["maximumFinalFill"])
    document = fitz.open(path)
    try:
        blank_pages: list[int] = []
        overflow_blocks = 0
        final_fill = 0.0
        for page_number, page in enumerate(document, start=1):
            blocks = _content_blocks(page, bounds)
            if not blocks:
                blank_pages.append(page_number)
                continue
            for block in blocks:
                # A block wholly below the body is running furniture, not overflow.
                if block.y0 < bounds.y1 and block.y1 > bounds.y1:
                    overflow_blocks += 1
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
