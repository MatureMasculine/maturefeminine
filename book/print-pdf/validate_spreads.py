#!/usr/bin/env python3
"""Validate standalone spread measurements and compiled anchor boundaries."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from adjust_content_size import measure_entries, report_markdown
from generate_book import BUILD_DIR, compile_pdf, select_entries, write_manifest, write_tex


def compiled_entry_passes(entry: dict[str, Any]) -> bool:
    return entry.get("pages") == 2 and entry.get("starts_even") is True and entry.get("ends_odd") is True


def validate_compiled(entries: list[dict[str, Any]], output_dir: Path) -> dict[str, Any]:
    output = output_dir / "compiled-spreads.pdf"
    tex_path = write_tex(entries, name="compiled-spreads")
    compile_pdf(tex_path, output)
    manifest_path = write_manifest(entries, output, tex_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    compiled = [
        {"slug": entry["slug"], "anchor": manifest["entries"][entry["slug"]], "passed": compiled_entry_passes(manifest["entries"][entry["slug"]])}
        for entry in entries
    ]
    return {"pdf": str(output), "manifest": str(manifest_path), "entries": compiled, "passed": all(entry["passed"] for entry in compiled)}


def report_markdown_with_compiled(report: dict[str, Any]) -> str:
    markdown = report_markdown(report["standalone"])
    rows = [markdown.rstrip(), "", "# Compiled Anchor Validation", "", "| Entry | Start | End | Pages | Starts even | Ends odd | Pass |", "| --- | ---: | ---: | ---: | --- | --- | --- |"]
    for entry in report["compiled"]["entries"]:
        anchor = entry["anchor"]
        rows.append(f"| {entry['slug']} | {anchor['start_page']} | {anchor['end_page']} | {anchor['pages']} | {'yes' if anchor['starts_even'] else 'no'} | {'yes' if anchor['ends_odd'] else 'no'} | {'yes' if entry['passed'] else 'no'} |")
    rows.extend(["", f"Overall: **{'PASS' if report['passed'] else 'FAIL'}**", ""])
    return "\n".join(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate standalone and compiled exact-spread invariants.")
    parser.add_argument("--entry", help="Validate one entry; an archetype includes its two shadows.")
    parser.add_argument("--all", action="store_true", help="Validate every normalized entry.")
    parser.add_argument("--validate", action="store_true", help="Return nonzero if any invariant fails.")
    parser.add_argument("--json", action="store_true", help="Print deterministic JSON instead of Markdown.")
    parser.add_argument("--output-dir", type=Path, default=BUILD_DIR / "validation")
    args = parser.parse_args()
    if args.entry and args.all:
        parser.error("--entry and --all cannot be used together")
    output_dir = args.output_dir.resolve()
    entries = select_entries(args.entry, args.all)
    standalone = measure_entries(args.entry, args.all, output_dir / "standalone")
    compiled = validate_compiled(entries, output_dir)
    report = {"standalone": standalone, "compiled": compiled, "passed": standalone["passed"] and compiled["passed"]}
    json_path = output_dir / "spread-validation.json"
    markdown_path = output_dir / "spread-validation.md"
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    markdown_path.write_text(report_markdown_with_compiled(report), encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True) if args.json else report_markdown_with_compiled(report), end="" if args.json else "")
    if not args.json:
        print(f"Reports: {json_path}, {markdown_path}")
    if args.validate and not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
