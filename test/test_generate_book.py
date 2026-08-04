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
        self.assertIn(r"\newcommand\SpecialTitle[1]", document)
        self.assertIn(r"\fontsize{18pt}{22pt}", document)
        self.assertIn(r"\renewcommand\tableofcontents", document)
        self.assertIn(r"\SpecialTitle{\contentsname}", document)
        self.assertNotIn(r"\newcommand\EntryDesignation", document)
        self.assertNotIn("maturemasculinedeck", document)
        self.assertNotIn("http://", document)
        self.assertNotIn("https://", document)

    def test_special_page_inventory_and_exact_dedication_are_canonical_markdown(self) -> None:
        self.assertEqual(
            [spec.filename for spec in generate_book.FRONT_MATTER_SPECS],
            [
                "title-page.md",
                "copyright.md",
                "dedication.md",
                "introduction.md",
                "how-to-use.md",
                "working-with-archetypes.md",
                "working-with-shadows.md",
                "understanding-feminine-lifecycle.md",
                "reading-a-spread.md",
            ],
        )
        self.assertEqual(
            [spec.filename for spec in generate_book.BACK_MATTER_SPECS],
            [
                "integrating-the-lifecycle.md",
                "self-assessment-and-reflection.md",
                "conclusion.md",
                "bibliography.md",
            ],
        )
        for spec in (*generate_book.FRONT_MATTER_SPECS, *generate_book.BACK_MATTER_SPECS):
            self.assertTrue((generate_book.SPECIAL_DIR / spec.filename).is_file(), spec.filename)

        dedication = (generate_book.SPECIAL_DIR / "dedication.md").read_text(encoding="utf-8").strip()
        self.assertEqual(dedication, "For my beloved,\nand her root sisters.")
        self.assertFalse((generate_book.SPECIAL_DIR / "acknowledgments.md").exists())

    def test_controlled_special_markdown_renderer_handles_only_supported_structure(self) -> None:
        title, body = generate_book.render_special_markdown(
            "# Safe & Seen\n\n"
            "## Begin Again\n\n"
            "A **bounded** and *gentle* practice protects 50% of capacity.\n\n"
            "- First step\n"
            "- Second step\n"
        )

        self.assertEqual(title, "Safe & Seen")
        self.assertIn(r"\SpecialHTwo{Begin Again}", body)
        self.assertIn(r"\textbf{bounded}", body)
        self.assertIn(r"\emph{gentle}", body)
        self.assertIn(r"50\%", body)
        self.assertIn(r"\begin{itemize}[itemsep=0.035in]", body)
        self.assertEqual(body.count(r"\item "), 2)

    def test_special_chapter_matches_book_typography_and_toc_treatment(self) -> None:
        spec = next(spec for spec in generate_book.FRONT_MATTER_SPECS if spec.filename == "introduction.md")
        content = generate_book.render_special_page(spec)

        self.assertIn(r"\thispagestyle{chapter-start}", content)
        self.assertIn(r"\addcontentsline{toc}{chapter}{Introduction}", content)
        self.assertIn(r"\SpecialTitle{Introduction}", content)
        self.assertIn(r"\begin{multicols}{2}", content)
        self.assertIn(r"\lettrine[lines=3]", content)

    def test_full_document_orders_special_matter_and_keeps_entry_parity_aligned(self) -> None:
        entry = self.normalized_entry("lover")
        document = generate_book.render_document(
            generate_book.read_json(generate_book.CONFIG_PATH),
            [entry],
            {"lover": "images/lover.jpg"},
            standalone=False,
        )

        ordered_markers = [
            r"\pagenumbering{roman}",
            r"\SpecialTitlePage{The Mature Feminine}",
            "© 2026",
            "For my beloved,",
            "\n\\tableofcontents\n",
            r"\pagenumbering{arabic}",
            r"\addcontentsline{toc}{part}{Front Matter}",
            r"\SpecialTitle{Introduction}",
            r"\SpecialTitle{How to Use This Book}",
            r"\SpecialTitle{Working with Archetypes}",
            r"\SpecialTitle{Working with Shadows}",
            r"\SpecialTitle{Understanding the Feminine Lifecycle}",
            r"\SpecialTitle{How to Read an Archetype or Shadow Spread}",
            r"\label{entry:lover:start}",
            r"\addcontentsline{toc}{part}{Back Matter}",
            r"\SpecialTitle{Integrating the Lifecycle}",
            r"\SpecialTitle{Self-Assessment and Reflection}",
            r"\SpecialTitle{Conclusion}",
            r"\SpecialTitle{Bibliography and Further Reading}",
        ]
        positions = [document.index(marker) for marker in ordered_markers]
        self.assertEqual(positions, sorted(positions))
        self.assertIn("\\cleardoublepage\n\\pagenumbering{arabic}", document)
        self.assertIn(r"\addcontentsline{toc}{part}{Lover}", document)
        self.assertIn(r"\addcontentsline{toc}{chapter}{Lover}", document)
        self.assertNotIn("Acknowledgments", document)

    @unittest.skipUnless(generate_book.latex_command(), "LuaLaTeX is required for physical-page verification")
    def test_compiled_full_document_preserves_physical_page_parity(self) -> None:
        entry = self.normalized_entry("lover")
        with tempfile.TemporaryDirectory() as directory:
            tex_path = generate_book.write_tex([entry], standalone=False, name="test-special-matter")
            output = Path(directory) / "test-special-matter.pdf"
            generate_book.compile_pdf(tex_path, output)

            document = fitz.open(output)
            try:
                labels = document.get_page_labels()
                self.assertEqual(labels[0], {"startpage": 0, "prefix": "", "firstpagenum": 1, "style": "r"})
                arabic = next(label for label in labels if label["style"] == "D")
                self.assertEqual((arabic["startpage"] + 1) % 2, 1)

                toc_text = next(page.get_text() for page in document if "Table of Contents" in page.get_text())
                self.assertIn("Front Matter", toc_text)
                self.assertIn("Back Matter", toc_text)

                entry_index = next(
                    index
                    for index, page in enumerate(document)
                    if "Lifecycle stage" in page.get_text() and "Lover" in page.get_text()
                )
                back_index = next(
                    index
                    for index in range(entry_index + 1, len(document))
                    if "Integrating the Lifecycle" in document[index].get_text()
                )
                entry_start = entry_index + 1
                entry_end = back_index
                self.assertEqual(entry_start % 2, 0)
                self.assertEqual(entry_end % 2, 1)
                self.assertEqual(entry_end - entry_start + 1, 2)
                self.assertTrue(document[entry_index].get_text().strip())
                self.assertTrue(document[entry_index + 1].get_text().strip())

                for title in ("Conclusion", "Bibliography and Further Reading"):
                    page, spans = next(
                        (page, spans)
                        for page in document
                        for spans in [[
                            span
                            for block in page.get_text("dict")["blocks"]
                            for line in block.get("lines", [])
                            for span in line.get("spans", [])
                            if span["text"].strip()
                        ]]
                        if any(
                            span["text"].strip() == title and span["font"] == "CinzelDecorative-Bold"
                            for span in spans
                        )
                    )
                    title_span = next(span for span in spans if span["text"].strip() == title)
                    first_body_span = next(span for span in spans if span["font"].startswith("Palatino"))
                    self.assertGreaterEqual(
                        first_body_span["bbox"][1] - title_span["bbox"][3],
                        20,
                        f"{title} body must begin below the title band",
                    )
            finally:
                document.close()

    def test_standalone_entry_omits_global_special_matter(self) -> None:
        entry = self.normalized_entry("lover")
        document = generate_book.render_document(
            generate_book.read_json(generate_book.CONFIG_PATH),
            [entry],
            {"lover": "images/lover.jpg"},
            standalone=True,
        )

        self.assertNotIn("\n\\tableofcontents\n", document)
        self.assertNotIn(r"\SpecialTitle{Introduction}", document)
        self.assertNotIn(r"\SpecialTitle{Conclusion}", document)
        self.assertNotIn(r"\addcontentsline{toc}{part}", document)

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
