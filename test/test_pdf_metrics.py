"""Regression tests for the exact two-page spread measurements."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

import fitz


PRINT_DIR = Path(__file__).resolve().parents[1] / "book" / "print-pdf"
sys.path.insert(0, str(PRINT_DIR))

from pdf_metrics import load_metrics_config, measure_pdf


PAGE = fitz.Rect(0, 0, 612, 792)


def add_page(
    document: fitz.Document,
    *,
    fill: str = "full",
    overflow: bool = False,
    below_body: bool = False,
    horizontal: str | None = None,
    image_overflow: bool = False,
    numeric_footer: bool = False,
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
    if numeric_footer:
        page.insert_text((303, 770), "2", fontsize=10)


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

    def test_two_filled_pages_pass_the_spread_contract(self) -> None:
        measurement = measure_pdf(self.fixture("two-pages.pdf", [{}, {}]))

        self.assertEqual(measurement.pages, 2)
        self.assertGreater(measurement.final_fill, load_metrics_config()["minimumFinalFill"])
        self.assertEqual(measurement.blank_pages, ())
        self.assertEqual(measurement.overflow_blocks, 0)
        self.assertTrue(measurement.passed)

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

    def test_centered_numeric_footer_is_ignored_narrowly(self) -> None:
        measurement = measure_pdf(self.fixture("numeric-footer.pdf", [{}, {"numeric_footer": True}]))

        self.assertEqual(measurement.overflow_blocks, 0)
        self.assertTrue(measurement.passed)


if __name__ == "__main__":
    unittest.main()
