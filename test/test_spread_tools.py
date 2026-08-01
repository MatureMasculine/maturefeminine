"""Reports and invariant classifications for the spread CLIs."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


PRINT_DIR = Path(__file__).resolve().parents[1] / "book" / "print-pdf"
sys.path.insert(0, str(PRINT_DIR))

from adjust_content_size import console_report, editorial_direction, report_markdown
from pdf_metrics import SpreadMeasurement, load_metrics_config
from validate_spreads import compiled_entry_passes


class SpreadToolsTests(unittest.TestCase):
    def test_editorial_direction_is_non_mutating_and_specific(self) -> None:
        self.assertEqual(editorial_direction(SpreadMeasurement(3, 0.7, (), 0, False)), "Cut redundancy; the entry spills beyond its spread.")
        self.assertEqual(editorial_direction(SpreadMeasurement(2, 0.1, (), 0, False)), "Add a missing substantive distinction; the final page is underfilled.")
        self.assertEqual(editorial_direction(SpreadMeasurement(2, 0.8, (), 0, True)), "No edit direction; the spread meets the configured contract.")

    def test_editorial_direction_uses_configured_fill_bounds(self) -> None:
        metrics = load_metrics_config()

        self.assertEqual(
            editorial_direction(SpreadMeasurement(2, metrics["minimumFinalFill"] - 0.0001, (), 0, False)),
            "Add a missing substantive distinction; the final page is underfilled.",
        )
        self.assertEqual(
            editorial_direction(SpreadMeasurement(2, metrics["maximumFinalFill"] + 0.0001, (), 0, False)),
            "Cut redundancy; the final page is overfilled.",
        )

    def test_markdown_report_is_deterministic(self) -> None:
        report = {
            "entries": [{"slug": "lover", "measurement": {"pages": 2, "final_fill": 0.7, "blank_pages": [], "overflow_blocks": 0, "passed": True}, "editorial_direction": "No edit direction; the spread meets the configured contract."}],
            "passed": True,
        }
        self.assertEqual(report_markdown(report), "# Spread Measurement Report\n\n| Entry | Pages | Final fill | Blank pages | Overflow blocks | Pass | Editorial direction |\n| --- | ---: | ---: | --- | ---: | --- | --- |\n| lover | 2 | 0.7000 | none | 0 | yes | No edit direction; the spread meets the configured contract. |\n\nOverall: **PASS**\n")

    def test_json_console_report_is_machine_readable(self) -> None:
        self.assertEqual(console_report({"passed": True}, as_json=True), '{\n  "passed": true\n}\n')

    def test_compiled_anchor_invariant_requires_facing_even_odd_pair(self) -> None:
        self.assertTrue(compiled_entry_passes({"start_page": 12, "end_page": 13, "pages": 2, "starts_even": True, "ends_odd": True}))
        self.assertFalse(compiled_entry_passes({"start_page": 11, "end_page": 12, "pages": 2, "starts_even": False, "ends_odd": False}))


if __name__ == "__main__":
    unittest.main()
