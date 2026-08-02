"""Reports and invariant classifications for the spread CLIs."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


PRINT_DIR = Path(__file__).resolve().parents[1] / "book" / "print-pdf"
sys.path.insert(0, str(PRINT_DIR))

import adjust_content_size
from adjust_content_size import console_report, editorial_direction, report_markdown
from pdf_metrics import SpreadMeasurement, load_metrics_config
from validate_spreads import compiled_entry_failure_reasons, compiled_entry_passes, report_markdown_with_compiled


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
            "entries": [{"slug": "lover", "measurement": {"pages": 2, "final_fill": 0.7, "blank_pages": [], "overflow_blocks": 0, "visual_checked": True, "artwork_on_first": True, "black_panel_on_first": True, "opening_quote_first_only": True, "closing_quote_on_second": True, "required_fonts_embedded": True, "failure_reasons": [], "passed": True}, "editorial_direction": "No edit direction; the spread meets the configured contract."}],
            "passed": True,
        }
        self.assertEqual(report_markdown(report), "# Spread Measurement Report\n\n| Entry | Pages | Final fill | Blank pages | Overflow blocks | Visual checked | Artwork | Black panel | Opening quote | Closing quote | Fonts | Failure reasons | Pass | Editorial direction |\n| --- | ---: | ---: | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n| lover | 2 | 0.7000 | none | 0 | yes | yes | yes | yes | yes | yes | none | yes | No edit direction; the spread meets the configured contract. |\n\nOverall: **PASS**\n")

    def test_compiled_report_preserves_visual_failure_reasons(self) -> None:
        report = {
            "standalone": {
                "entries": [{"slug": "lover", "measurement": {"pages": 2, "final_fill": 0.8, "blank_pages": [], "overflow_blocks": 0, "visual_checked": True, "artwork_on_first": False, "black_panel_on_first": True, "opening_quote_first_only": True, "closing_quote_on_second": True, "required_fonts_embedded": True, "failure_reasons": ["missing artwork on first page"], "passed": False}, "editorial_direction": "Review the global spread configuration and body structure."}],
                "passed": False,
            },
            "compiled": {"entries": [], "passed": True},
            "passed": False,
        }

        markdown = report_markdown_with_compiled(report)
        self.assertIn("missing artwork on first page", markdown)
        self.assertIn("Overall: **FAIL**", markdown)

    def test_json_console_report_is_machine_readable(self) -> None:
        self.assertEqual(console_report({"passed": True}, as_json=True), '{\n  "passed": true\n}\n')

    def test_entry_measurement_supplies_visual_record_and_physical_page_two(self) -> None:
        entry = {"slug": "lover", "quotes": {"opening": "Opening.", "closing": "Closing."}}
        measurement = SpreadMeasurement(2, 0.8, (), 0, True, True, True, True, True, True, True, ())
        with tempfile.TemporaryDirectory() as directory, patch.object(adjust_content_size, "select_entries", return_value=[entry]), patch.object(adjust_content_size, "render_entry"), patch.object(adjust_content_size, "measure_pdf", return_value=measurement) as measure:
            report = adjust_content_size.measure_entries("lover", False, Path(directory))

        measure.assert_called_once_with(Path(directory) / "lover.pdf", expected_entry=entry, physical_start_page=2)
        self.assertTrue(report["passed"])

    def test_compiled_anchor_invariant_requires_facing_even_odd_pair(self) -> None:
        self.assertTrue(compiled_entry_passes({"start_page": 12, "end_page": 13, "pages": 2, "starts_even": True, "ends_odd": True}))
        self.assertFalse(compiled_entry_passes({"start_page": 11, "end_page": 12, "pages": 2, "starts_even": False, "ends_odd": False}))
        self.assertEqual(
            compiled_entry_failure_reasons({"start_page": 11, "end_page": 12, "pages": 2, "starts_even": False, "ends_odd": False}),
            ["compiled entry must start on an even page", "compiled entry must end on an odd page"],
        )


if __name__ == "__main__":
    unittest.main()
