"""Regression tests for the exact two-page spread measurements."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

import fitz


PRINT_DIR = Path(__file__).resolve().parents[1] / "book" / "print-pdf"
sys.path.insert(0, str(PRINT_DIR))

from pdf_metrics import load_metrics_config, measurement_dict, measure_pdf


PAGE = fitz.Rect(0, 0, 612, 792)
CINZEL = PRINT_DIR / "assets" / "fonts" / "CinzelDecorative-Regular.ttf"
EXPECTED_ENTRY = {
    "quotes": {
        "opening": "Opening quote evidence.",
        "closing": "Closing quote evidence.",
    }
}


def add_page(
    document: fitz.Document,
    *,
    fill: str = "full",
    overflow: bool = False,
    below_body: bool = False,
    horizontal: str | None = None,
    image_overflow: bool = False,
    parity_probe: bool = False,
    chapter_title: bool = False,
    arbitrary_top_text: bool = False,
    numeric_footer: bool = False,
    outer_folio: bool = False,
) -> None:
    page = document.new_page(width=PAGE.width, height=PAGE.height)
    if fill == "blank":
        return
    if fill == "sparse":
        page.insert_text((72, 150), "A brief line.", fontsize=12)
        return
    if overflow:
        page.insert_text((72, 752), "This block crosses the content boundary.", fontsize=12)
        return

    # A text block and an image block both inside the configured content bounds.
    page.insert_textbox(
        fitz.Rect(72, 100, 520, 455),
        "Measured body copy " * 180,
        fontsize=11,
        lineheight=1.25,
    )
    pixmap = fitz.Pixmap(fitz.csRGB, (0, 0, 36, 36), False)
    pixmap.clear_with(120)
    page.insert_image(fitz.Rect(72, 485, 180, 590), pixmap=pixmap)
    if below_body:
        page.insert_text((72, 770), "Unapproved below-body content.", fontsize=12)
    if horizontal == "left":
        page.insert_text((12, 400), "Left overflow.", fontsize=12)
    if horizontal == "right":
        page.insert_text((550, 400), "Right overflow.", fontsize=12)
    if image_overflow:
        page.insert_image(fitz.Rect(540, 300, 600, 370), pixmap=pixmap)
    if parity_probe:
        page.insert_image(fitz.Rect(47.5, 300, 52.5, 310), pixmap=pixmap)
    if chapter_title:
        page.insert_font(fontname="cinzel", fontfile=str(CINZEL))
        page.insert_text((270, 68), "TITLE", fontname="cinzel", fontsize=20)
    if arbitrary_top_text:
        page.insert_text((270, 68), "BODY", fontsize=20)
    if numeric_footer:
        page.insert_text((303, 770), "2", fontsize=10)
    if outer_folio:
        page.insert_text((560, 40), "3", fontsize=10)


class PdfMetricsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def fixture(self, name: str, pages: list[dict[str, object]]) -> Path:
        document = fitz.open()
        for page in pages:
            add_page(document, **page)
        path = self.root / name
        document.save(path)
        document.close()
        return path

    def visual_fixture(
        self,
        name: str,
        *,
        artwork: bool = True,
        black_panel: bool = True,
        panel_outside: bool = False,
        repeat_opening: bool = False,
        closing_quote: bool = True,
        cinzel: bool = True,
    ) -> Path:
        document = fitz.open()
        pixmap = fitz.Pixmap(fitz.csRGB, (0, 0, 36, 36), False)
        pixmap.clear_with(120)
        for index in range(2):
            page = document.new_page(width=PAGE.width, height=PAGE.height)
            if index == 0:
                if cinzel:
                    page.insert_font(fontname="cinzel", fontfile=str(CINZEL))
                    page.insert_text((72, 72), "VISUAL FIXTURE", fontname="cinzel", fontsize=12)
                else:
                    page.insert_text((72, 72), "VISUAL FIXTURE", fontsize=12)
                page.insert_text((72, 105), EXPECTED_ENTRY["quotes"]["opening"], fontsize=10)
                if artwork:
                    page.insert_image(fitz.Rect(60, 145, 290, 500), pixmap=pixmap)
                if black_panel:
                    panel = fitz.Rect(10, 500, 240, 700) if panel_outside else fitz.Rect(60, 500, 290, 700)
                    page.draw_rect(panel, color=(0.02, 0.02, 0.02), fill=(0.02, 0.02, 0.02))
                page.insert_textbox(fitz.Rect(330, 145, 550, 700), "First-page body " * 60, fontsize=10, lineheight=1.2)
            else:
                page.insert_textbox(fitz.Rect(72, 80, 530, 620), "Continuation body " * 80, fontsize=10, lineheight=1.2)
                if repeat_opening:
                    page.insert_text((72, 650), EXPECTED_ENTRY["quotes"]["opening"], fontsize=10)
                if closing_quote:
                    page.insert_text((72, 680), EXPECTED_ENTRY["quotes"]["closing"], fontsize=10)
        path = self.root / name
        document.save(path)
        document.close()
        return path

    def test_two_filled_pages_pass_the_spread_contract(self) -> None:
        measurement = measure_pdf(self.fixture("two-pages.pdf", [{}, {}]))

        self.assertEqual(measurement.pages, 2)
        self.assertGreater(measurement.final_fill, load_metrics_config()["minimumFinalFill"])
        self.assertEqual(measurement.blank_pages, ())
        self.assertEqual(measurement.overflow_blocks, 0)
        self.assertFalse(measurement.visual_checked)
        self.assertEqual(measurement.failure_reasons, ())
        self.assertTrue(measurement.passed)

    def test_visual_fixture_passes_all_structure_checks(self) -> None:
        measurement = measure_pdf(self.visual_fixture("visual-pass.pdf"), expected_entry=EXPECTED_ENTRY)

        self.assertTrue(measurement.visual_checked)
        self.assertTrue(measurement.artwork_on_first)
        self.assertTrue(measurement.black_panel_on_first)
        self.assertTrue(measurement.opening_quote_first_only)
        self.assertTrue(measurement.closing_quote_on_second)
        self.assertTrue(measurement.required_fonts_embedded)
        self.assertEqual(measurement.failure_reasons, ())
        self.assertTrue(measurement.passed)

    def test_missing_artwork_has_a_distinct_failure_reason(self) -> None:
        measurement = measure_pdf(self.visual_fixture("missing-artwork.pdf", artwork=False), expected_entry=EXPECTED_ENTRY)

        self.assertFalse(measurement.artwork_on_first)
        self.assertIn("missing artwork on first page", measurement.failure_reasons)
        self.assertIsInstance(measurement_dict(measurement)["failure_reasons"], list)
        self.assertFalse(measurement.passed)

    def test_missing_black_panel_has_a_distinct_failure_reason(self) -> None:
        measurement = measure_pdf(self.visual_fixture("missing-panel.pdf", black_panel=False), expected_entry=EXPECTED_ENTRY)

        self.assertFalse(measurement.black_panel_on_first)
        self.assertIn("missing black profile panel on first page", measurement.failure_reasons)
        self.assertFalse(measurement.passed)

    def test_black_panel_outside_bounds_has_a_distinct_failure_reason(self) -> None:
        measurement = measure_pdf(self.visual_fixture("outside-panel.pdf", panel_outside=True), expected_entry=EXPECTED_ENTRY)

        self.assertFalse(measurement.black_panel_on_first)
        self.assertIn("black profile panel outside first-page body bounds", measurement.failure_reasons)
        self.assertFalse(measurement.passed)

    def test_opening_quote_repeated_on_second_page_fails(self) -> None:
        measurement = measure_pdf(self.visual_fixture("repeated-opening.pdf", repeat_opening=True), expected_entry=EXPECTED_ENTRY)

        self.assertFalse(measurement.opening_quote_first_only)
        self.assertIn("opening quote must appear on first page only", measurement.failure_reasons)
        self.assertFalse(measurement.passed)

    def test_missing_closing_quote_on_second_page_fails(self) -> None:
        measurement = measure_pdf(self.visual_fixture("missing-closing.pdf", closing_quote=False), expected_entry=EXPECTED_ENTRY)

        self.assertFalse(measurement.closing_quote_on_second)
        self.assertIn("closing quote must appear on second page", measurement.failure_reasons)
        self.assertFalse(measurement.passed)

    def test_missing_cinzel_font_has_a_distinct_failure_reason(self) -> None:
        measurement = measure_pdf(self.visual_fixture("missing-cinzel.pdf", cinzel=False), expected_entry=EXPECTED_ENTRY)

        self.assertFalse(measurement.required_fonts_embedded)
        self.assertIn("required Cinzel font is not embedded", measurement.failure_reasons)
        self.assertFalse(measurement.passed)

    def test_one_page_fails_the_spread_contract(self) -> None:
        measurement = measure_pdf(self.fixture("one-page.pdf", [{}]))

        self.assertEqual(measurement.pages, 1)
        self.assertFalse(measurement.passed)

    def test_three_pages_fail_the_spread_contract(self) -> None:
        measurement = measure_pdf(self.fixture("three-pages.pdf", [{}, {}, {}]))

        self.assertEqual(measurement.pages, 3)
        self.assertFalse(measurement.passed)

    def test_blank_second_page_is_reported_and_fails(self) -> None:
        measurement = measure_pdf(self.fixture("blank-second.pdf", [{}, {"fill": "blank"}]))

        self.assertEqual(measurement.blank_pages, (2,))
        self.assertFalse(measurement.passed)

    def test_sparse_second_page_fails_final_fill_band(self) -> None:
        measurement = measure_pdf(self.fixture("sparse-second.pdf", [{}, {"fill": "sparse"}]))

        self.assertNotIn(2, measurement.blank_pages)
        self.assertLess(measurement.final_fill, 0.20)
        self.assertFalse(measurement.passed)

    def test_bottom_overflow_is_reported_and_fails(self) -> None:
        measurement = measure_pdf(self.fixture("bottom-overflow.pdf", [{}, {"overflow": True}]))

        self.assertGreater(measurement.overflow_blocks, 0)
        self.assertFalse(measurement.passed)

    def test_wholly_below_body_content_is_overflow_not_furniture(self) -> None:
        measurement = measure_pdf(self.fixture("below-body.pdf", [{}, {"below_body": True}]))

        self.assertGreater(measurement.overflow_blocks, 0)
        self.assertFalse(measurement.passed)

    def test_left_overflow_on_odd_page_is_reported(self) -> None:
        measurement = measure_pdf(self.fixture("odd-left.pdf", [{"horizontal": "left"}, {}]))

        self.assertGreater(measurement.overflow_blocks, 0)
        self.assertFalse(measurement.passed)

    def test_right_overflow_on_even_page_is_reported(self) -> None:
        measurement = measure_pdf(self.fixture("even-right.pdf", [{}, {"horizontal": "right"}]))

        self.assertGreater(measurement.overflow_blocks, 0)
        self.assertFalse(measurement.passed)

    def test_image_overflow_on_even_page_is_reported(self) -> None:
        measurement = measure_pdf(self.fixture("even-image-overflow.pdf", [{}, {"image_overflow": True}]))

        self.assertGreater(measurement.overflow_blocks, 0)
        self.assertFalse(measurement.passed)

    def test_centered_opening_folio_and_outer_continuation_folio_are_ignored_narrowly(self) -> None:
        measurement = measure_pdf(self.fixture("numeric-folios.pdf", [{"numeric_footer": True}, {"outer_folio": True}]))

        self.assertEqual(measurement.overflow_blocks, 0)
        self.assertTrue(measurement.passed)

    def test_metrics_use_exact_mirrored_physical_page_bounds(self) -> None:
        metrics = load_metrics_config()

        self.assertEqual(metrics["bodyBounds"]["even"], {"left": 46.8, "right": 558.0, "top": 54.0, "bottom": 738.0})
        self.assertEqual(metrics["bodyBounds"]["odd"], {"left": 54.0, "right": 565.2, "top": 54.0, "bottom": 738.0})

    def test_standalone_first_page_maps_to_physical_even_page_two(self) -> None:
        path = self.fixture("physical-parity.pdf", [{"parity_probe": True}, {}])

        self.assertEqual(measure_pdf(path).overflow_blocks, 0)
        self.assertGreater(measure_pdf(path, physical_start_page=1).overflow_blocks, 0)

    def test_centered_cinzel_chapter_title_ascenders_have_a_narrow_top_allowance(self) -> None:
        measurement = measure_pdf(self.fixture("chapter-title.pdf", [{"chapter_title": True}, {}]))

        self.assertEqual(measurement.overflow_blocks, 0)
        self.assertTrue(measurement.passed)

    def test_arbitrary_top_text_still_counts_as_real_body_overflow(self) -> None:
        measurement = measure_pdf(self.fixture("top-body-overflow.pdf", [{"arbitrary_top_text": True}, {}]))

        self.assertGreater(measurement.overflow_blocks, 0)
        self.assertFalse(measurement.passed)


if __name__ == "__main__":
    unittest.main()
