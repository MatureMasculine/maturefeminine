"""Focused normalized-entry and anchor tests for the print generator."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

import fitz


PRINT_DIR = Path(__file__).resolve().parents[1] / "book" / "print-pdf"
sys.path.insert(0, str(PRINT_DIR))

import generate_book


class GenerateBookTests(unittest.TestCase):
    def test_lookup_returns_a_standalone_shadow_from_normalized_entries(self) -> None:
        entry = generate_book.lookup_entry("armored-lover")

        self.assertEqual(entry["kind"], "shadow")
        self.assertEqual(entry["parent"], "lover")
        self.assertEqual(entry["name"], "Armored Lover")

    def test_entry_selection_includes_an_archetype_and_its_two_shadows(self) -> None:
        slugs = [entry["slug"] for entry in generate_book.select_entries("lover")]

        self.assertEqual(slugs, ["lover", "enmeshing-lover", "armored-lover"])

    def test_render_entry_creates_a_two_page_standalone_pdf(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "lover.pdf"
            generate_book.render_entry("lover", output)

            document = fitz.open(output)
            try:
                self.assertEqual(len(document), 2)
                self.assertIn("Lover", document[0].get_text())
            finally:
                document.close()

    def test_entry_content_contains_the_canonical_title(self) -> None:
        content = generate_book.render_entry_content(generate_book.lookup_entry("lover"), None)

        self.assertIn("\\section*{Lover}", content)

    def test_manifest_uses_anchor_pages_for_start_end_and_parity(self) -> None:
        manifest = generate_book.manifest_from_aux(
            """\\newlabel{entry:lover:start}{{}{12}}\n\\newlabel{entry:lover:end}{{}{13}}\n""",
            ["lover"],
        )

        self.assertEqual(manifest["entries"]["lover"], {"start_page": 12, "end_page": 13, "pages": 2, "starts_even": True, "ends_odd": True})


if __name__ == "__main__":
    unittest.main()
