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
    @staticmethod
    def normalized_entry(slug: str) -> dict:
        return next(entry for entry in generate_book.read_json(generate_book.DATA_PATH)["entries"] if entry["slug"] == slug)

    def test_required_print_assets_are_local_and_complete(self) -> None:
        assets = generate_book.required_print_assets(generate_book.read_json(generate_book.CONFIG_PATH))

        self.assertEqual(
            set(assets),
            {"title_regular", "title_bold", "font_license", "grasswide1", "grasswide2", "grasswide3", "grasswide4", "grasswide5", "end_ornament", "lettrine_config"},
        )
        for path in assets.values():
            self.assertTrue(path.is_file())
            self.assertTrue(path.is_relative_to(generate_book.SCRIPT_DIR))
            self.assertNotIn("maturemasculinedeck", str(path))

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

    def test_full_second_page_does_not_create_a_folio_only_trailing_page(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "armored-lover.pdf"
            generate_book.render_entry("armored-lover", output)

            document = fitz.open(output)
            try:
                self.assertEqual(len(document), 2)
                self.assertIn("Jane Austen", document[1].get_text())
            finally:
                document.close()

    def test_entry_content_uses_the_masculine_faithful_opener(self) -> None:
        content = generate_book.render_entry_content(self.normalized_entry("lover"), "images/lover.jpg", 0)

        self.assertIn(r"\EntryTitle{Lover}", content)
        self.assertIn(r"\OpeningQuote", content)
        self.assertIn(r"\ArtworkRail", content)
        self.assertIn(r"\columnbreak", content)
        self.assertIn(r"\lettrine[lines=3]", content)
        self.assertEqual(content.count("Lifecycle stage"), 1)
        self.assertNotIn("FeminineMist", content)

    def test_shadow_matches_masculine_title_quote_treatment_and_profile_has_seven_rows(self) -> None:
        content = generate_book.render_entry_content(self.normalized_entry("armored-lover"), "images/armored-lover.jpg", 1)

        self.assertNotIn(r"\EntryDesignation", content)
        for label in (
            "Lifecycle stage",
            "Core function",
            "Balanced qualities",
            "Active shadow",
            "Passive shadow",
            "Mythic resonances",
            "Key qualities",
        ):
            self.assertEqual(content.count(label), 1)

    def test_document_uses_only_local_masculine_faithful_runtime_assets(self) -> None:
        entry = self.normalized_entry("lover")
        document = generate_book.render_document(
            generate_book.read_json(generate_book.CONFIG_PATH),
            [entry],
            {"lover": "images/lover.jpg"},
            standalone=True,
        )

        self.assertIn(r"\setmainfont{Palatino}", document)
        self.assertIn("CinzelDecorative-Bold.ttf", document)
        self.assertIn("ornaments/grasswide#1.png", document)
        self.assertNotIn(r"\newcommand\EntryDesignation", document)
        self.assertNotIn("maturemasculinedeck", document)
        self.assertNotIn("http://", document)
        self.assertNotIn("https://", document)

    def test_quote_balancing_preserves_verse_and_balances_long_prose(self) -> None:
        verse = "First line\nSecond line\nThird line"
        prose = " ".join(["measured"] * 30)

        self.assertEqual(generate_book._balance_quote_text(verse), verse)
        self.assertIn("\n", generate_book._balance_quote_text(prose, chars_per_line=60, author_len=20))

    def test_drop_cap_only_changes_an_ascii_capitalized_first_word(self) -> None:
        self.assertEqual(
            generate_book.apply_drop_cap("The Lover stays present."),
            r"\lettrine[lines=3]{T}{he} Lover stays present.",
        )
        self.assertEqual(generate_book.apply_drop_cap("…and then she listens."), "…and then she listens.")

    def test_render_quote_preserves_verse_and_emphasizes_only_work_titles(self) -> None:
        rendered = generate_book.render_quote(
            "“I love thee freely, as men strive for Right;\nI love thee purely, as they turn from Praise.”\n\n—Elizabeth Barrett Browning, *Sonnet 43*"
        )

        self.assertIn("Right;\\\\\nI love", rendered)
        self.assertIn("\\par\\smallskip", rendered)
        self.assertIn("\\emph{Sonnet 43}", rendered)
        self.assertNotIn("*Sonnet 43*", rendered)

    def test_render_quote_escapes_literal_latex_in_verse_and_attribution(self) -> None:
        rendered = generate_book.render_quote("“A & B\\danger”\nSecond line.\n\n—Author, *Work & \\unsafe*")

        self.assertIn(r"A \& B\textbackslash{}danger”\\", rendered)
        self.assertIn(r"\emph{Work \& \textbackslash{}unsafe}", rendered)
        self.assertNotIn(r"\unsafe", rendered)

    def test_rendered_quote_keeps_attribution_upright_and_work_title_italic(self) -> None:
        tex_path = generate_book.BUILD_DIR / "test-quote-font.tex"
        output = Path(tempfile.gettempdir()) / "mature-feminine-quote-font.pdf"
        tex_path.write_text(
            "\\documentclass{article}\n"
            "\\usepackage{fontspec}\n"
            "\\setmainfont{TeX Gyre Pagella}\n"
            "\\begin{document}\n"
            + generate_book.render_quote("“Verse line.”\n\n—Author, *Book Title*")
            + "\n\\end{document}\n",
            encoding="utf-8",
        )
        generate_book.compile_pdf(tex_path, output)

        document = fitz.open(output)
        try:
            spans = [span for block in document[0].get_text("dict")["blocks"] for line in block.get("lines", []) for span in line.get("spans", [])]
        finally:
            document.close()
        attribution = next(span for span in spans if "—Author," in span["text"])
        title = next(span for span in spans if "Book Title" in span["text"])
        verse = next(span for span in spans if "Verse line" in span["text"])

        self.assertNotIn("Italic", attribution["font"])
        self.assertIn("Italic", title["font"])
        self.assertIn("Italic", verse["font"])

    def test_manifest_uses_anchor_pages_for_start_end_and_parity(self) -> None:
        manifest = generate_book.manifest_from_aux(
            """\\newlabel{entry:lover:start}{{}{12}}\n\\newlabel{entry:lover:end}{{}{13}}\n""",
            ["lover"],
        )

        self.assertEqual(manifest["entries"]["lover"], {"start_page": 12, "end_page": 13, "pages": 2, "starts_even": True, "ends_odd": True})


if __name__ == "__main__":
    unittest.main()
