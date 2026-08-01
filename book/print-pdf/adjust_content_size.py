#!/usr/bin/env python3
"""Render and measure entry spreads without changing the manuscript."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from generate_book import BUILD_DIR, render_entry, select_entries
from pdf_metrics import SpreadMeasurement, measurement_dict, measure_pdf


def editorial_direction(measurement: SpreadMeasurement) -> str:
    if measurement.pages > 2:
        return "Cut redundancy; the entry spills beyond its spread."
    if measurement.pages < 2:
        return "Add a missing substantive distinction; the entry does not reach its spread."
    if measurement.blank_pages:
        return "Restore missing body content; a spread page is blank."
    if measurement.overflow_blocks:
        return "Cut or restructure body content; it crosses the configured bottom boundary."
    if measurement.final_fill < 0.2:
        return "Add a missing substantive distinction; the final page is underfilled."
    if not measurement.passed:
        return "Review the global spread configuration and body structure."
    return "No edit direction; the spread meets the configured contract."


def report_markdown(report: dict[str, Any]) -> str:
    rows = [
        "# Spread Measurement Report",
        "",
        "| Entry | Pages | Final fill | Blank pages | Overflow blocks | Pass | Editorial direction |",
        "| --- | ---: | ---: | --- | ---: | --- | --- |",
    ]
    for entry in report["entries"]:
        measurement = entry["measurement"]
        blank = ", ".join(str(page) for page in measurement["blank_pages"]) or "none"
        rows.append(
            f"| {entry['slug']} | {measurement['pages']} | {measurement['final_fill']:.4f} | {blank} | "
            f"{measurement['overflow_blocks']} | {'yes' if measurement['passed'] else 'no'} | {entry['editorial_direction']} |"
        )
    rows.extend(["", f"Overall: **{'PASS' if report['passed'] else 'FAIL'}**", ""])
    return "\n".join(rows)


def console_report(report: dict[str, Any], *, as_json: bool) -> str:
    return json.dumps(report, indent=2, sort_keys=True) + "\n" if as_json else report_markdown(report)


def measure_entries(entry_slug: str | None, all_entries: bool, output_dir: Path) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    entries = []
    for entry in select_entries(entry_slug, all_entries):
        output = output_dir / f"{entry['slug']}.pdf"
        render_entry(entry["slug"], output)
        measurement = measure_pdf(output)
        entries.append(
            {
                "slug": entry["slug"],
                "pdf": str(output),
                "measurement": measurement_dict(measurement),
                "editorial_direction": editorial_direction(measurement),
            }
        )
    return {"entries": entries, "passed": all(entry["measurement"]["passed"] for entry in entries)}


def write_reports(report: dict[str, Any], output_dir: Path) -> tuple[Path, Path]:
    json_path = output_dir / "spread-measurements.json"
    markdown_path = output_dir / "spread-measurements.md"
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    markdown_path.write_text(report_markdown(report), encoding="utf-8")
    return json_path, markdown_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Measure rendered entries without editing canonical Markdown.")
    parser.add_argument("--entry", help="Measure one entry; an archetype includes its two shadows.")
    parser.add_argument("--all", action="store_true", help="Measure every normalized entry.")
    parser.add_argument("--json", action="store_true", help="Print deterministic JSON instead of Markdown.")
    parser.add_argument("--validate", action="store_true", help="Return nonzero if any standalone spread fails.")
    parser.add_argument("--output-dir", type=Path, default=BUILD_DIR / "measurements")
    args = parser.parse_args()
    if args.entry and args.all:
        parser.error("--entry and --all cannot be used together")
    report = measure_entries(args.entry, args.all, args.output_dir.resolve())
    json_path, markdown_path = write_reports(report, args.output_dir.resolve())
    print(console_report(report, as_json=args.json), end="")
    if not args.json:
        print(f"Reports: {json_path}, {markdown_path}")
    if args.validate and not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
