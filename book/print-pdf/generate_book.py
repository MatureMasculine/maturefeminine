#!/usr/bin/env python3
"""Render normalized archetype and shadow entries with LuaLaTeX."""

from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


SCRIPT_DIR = Path(__file__).resolve().parent
BOOK_DIR = SCRIPT_DIR.parent
ROOT_DIR = BOOK_DIR.parent
DATA_PATH = ROOT_DIR / "src" / "_data" / "archetypes.json"
IMAGE_DIR = ROOT_DIR / "src"
SPECIAL_DIR = ROOT_DIR / "content" / "special"
CONTENT_CHECK = ROOT_DIR / "scripts" / "validate_content.js"
CONFIG_PATH = SCRIPT_DIR / "print_config.json"
ASSET_DIR = SCRIPT_DIR / "assets"
BUILD_DIR = SCRIPT_DIR / ".latex-build"
DEFAULT_OUTPUT = BOOK_DIR / "mature-feminine.pdf"
MANIFEST_NAME = "spread-manifest.json"


@dataclass(frozen=True)
class SpecialPageSpec:
    filename: str
    page_type: str = "chapter"
    two_column: bool = False
    in_toc: bool = True


FRONT_MATTER_SPECS = (
    SpecialPageSpec("title-page.md", page_type="title", in_toc=False),
    SpecialPageSpec("copyright.md", page_type="copyright", in_toc=False),
    SpecialPageSpec("dedication.md", page_type="dedication", in_toc=False),
    SpecialPageSpec("introduction.md", two_column=True),
    SpecialPageSpec("how-to-use.md", two_column=True),
    SpecialPageSpec("working-with-archetypes.md", two_column=True),
    SpecialPageSpec("working-with-shadows.md", two_column=True),
    SpecialPageSpec("understanding-feminine-lifecycle.md", two_column=True),
    SpecialPageSpec("reading-a-spread.md", two_column=True),
)

BACK_MATTER_SPECS = (
    SpecialPageSpec("integrating-the-lifecycle.md", two_column=True),
    SpecialPageSpec("self-assessment-and-reflection.md", two_column=True),
    SpecialPageSpec("conclusion.md"),
    SpecialPageSpec("bibliography.md"),
)


def fail(message: str) -> None:
    raise SystemExit(f"book generation failed: {message}")


def tex(value: Any) -> str:
    """Escape source prose for LuaLaTeX without changing its wording."""
    return (
        str(value)
        .replace("\\", "\ue000")
        .replace("&", r"\&")
        .replace("%", r"\%")
        .replace("$", r"\$")
        .replace("#", r"\#")
        .replace("_", r"\_")
        .replace("{", r"\{")
        .replace("}", r"\}")
        .replace("~", r"\textasciitilde{}")
        .replace("^", r"\textasciicircum{}")
        .replace("\ue000", r"\textbackslash{}")
    )


def tex_inline(value: str) -> str:
    """Render the small inline Markdown subset used by special-page sources."""
    rendered: list[str] = []
    offset = 0
    for match in re.finditer(r"(\*\*[^*\n]+\*\*|\*[^*\n]+\*)", value):
        rendered.append(tex(value[offset : match.start()]))
        token = match.group(0)
        if token.startswith("**"):
            rendered.append(f"\\textbf{{{tex(token[2:-2])}}}")
        else:
            rendered.append(f"\\emph{{{tex(token[1:-1])}}}")
        offset = match.end()
    rendered.append(tex(value[offset:]))
    return "".join(rendered)


def render_special_markdown(value: str, *, drop_cap: bool = False) -> tuple[str, str]:
    """Convert controlled reader-facing Markdown into local LuaLaTeX."""
    lines = value.replace("\r\n", "\n").replace("\r", "\n").splitlines()
    title = ""
    rendered: list[str] = []
    drop_cap_pending = drop_cap
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        if line.startswith("# "):
            if not title:
                title = line[2:].strip()
            index += 1
            continue
        if line.startswith("## "):
            rendered.append(f"\\SpecialHTwo{{{tex_inline(line[3:].strip())}}}")
            index += 1
            continue
        if line.startswith("### "):
            rendered.append(f"\\SpecialHThree{{{tex_inline(line[4:].strip())}}}")
            index += 1
            continue
        if line.startswith("- "):
            items: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("- "):
                items.append(lines[index].strip()[2:].strip())
                index += 1
            rendered.append(
                "\\begin{itemize}[itemsep=0.035in]"
                + "".join(f"\\item {tex_inline(item)}" for item in items)
                + "\\end{itemize}"
            )
            continue

        paragraph_lines = [line]
        index += 1
        while index < len(lines):
            candidate = lines[index].strip()
            if not candidate or candidate.startswith(("# ", "## ", "### ", "- ")):
                break
            paragraph_lines.append(candidate)
            index += 1
        paragraph = " ".join(paragraph_lines)
        if drop_cap_pending and re.match(r'^[“"\'‘]*[A-Z][A-Za-z]*', paragraph):
            rendered.append(apply_drop_cap(paragraph) + "\\par")
            drop_cap_pending = False
        else:
            rendered.append(tex_inline(paragraph) + "\\par")
            if re.search(r"[A-Za-z]", paragraph):
                drop_cap_pending = False
    return title, "\n\n".join(rendered)


def render_special_page(spec: SpecialPageSpec) -> str:
    path = SPECIAL_DIR / spec.filename
    if not path.is_file():
        fail(f"missing special-page source content/special/{spec.filename}")
    source = path.read_text(encoding="utf-8")
    title, body = render_special_markdown(source, drop_cap=spec.two_column and spec.page_type == "chapter")

    if spec.page_type == "title":
        return f"""\\cleardoublepage
\\thispagestyle{{empty}}
\\vspace*{{0.2\\textheight}}
{{\\centering
\\SpecialTitlePage{{{tex(title)}}}
\\vspace{{0.35in}}
{{\\SpecialTitlePageBody {body}}}
}}
\\vspace*{{\\fill}}
"""
    if spec.page_type == "copyright":
        return f"""\\clearpage
\\thispagestyle{{empty}}
\\vspace*{{\\fill}}
{{\\BodyFont
\\setlength\\parskip{{0.10in}}
{body}
}}
"""
    if spec.page_type == "dedication":
        dedication = "\\\\\n".join(tex_inline(line) for line in source.strip().splitlines())
        return f"""\\clearpage
\\thispagestyle{{empty}}
\\vspace*{{0.3\\textheight}}
{{\\centering\\itshape
{dedication}\\par
}}
\\vspace*{{\\fill}}
"""

    toc_entry = f"\\phantomsection\n\\addcontentsline{{toc}}{{chapter}}{{{tex(title)}}}\n" if spec.in_toc else ""
    if spec.two_column:
        body = f"\\begin{{multicols}}{{2}}\n{{\\BodyFont\n\\setlength\\parskip{{0.10in}}\n{body}\n}}\n\\end{{multicols}}"
    else:
        body = f"{{\\BodyFont\n\\setlength\\parskip{{0.10in}}\n{body}\n}}"
    return f"""\\clearpage
\\thispagestyle{{chapter-start}}
{toc_entry}\\SpecialTitle{{{tex(title)}}}
\\vspace{{0.40in}}
{body}
"""


def render_front_matter() -> str:
    preliminary = "\n".join(render_special_page(spec) for spec in FRONT_MATTER_SPECS[:3])
    chapters = "\n".join(render_special_page(spec) for spec in FRONT_MATTER_SPECS[3:])
    return (
        "\\pagenumbering{roman}\n"
        + preliminary
        + "\n\\clearpage\n\\renewcommand{\\contentsname}{Table of Contents}\n\\tableofcontents\n"
        + "\\cleardoublepage\n\\pagenumbering{arabic}\n"
        + "\\phantomsection\n\\addcontentsline{toc}{part}{Front Matter}\n"
        + chapters
    )


def render_back_matter() -> str:
    return (
        "\\clearpage\n\\phantomsection\n\\addcontentsline{toc}{part}{Back Matter}\n"
        + "\n".join(render_special_page(spec) for spec in BACK_MATTER_SPECS)
    )


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"cannot read {path.relative_to(ROOT_DIR)}: {error}")


def required_print_assets(config: dict[str, Any]) -> dict[str, Path]:
    relative = {
        "title_regular": Path("fonts/CinzelDecorative-Regular.ttf"),
        "title_bold": Path("fonts/CinzelDecorative-Bold.ttf"),
        "font_license": Path("fonts/OFL.txt"),
        **{f"grasswide{i}": Path(f"ornaments/grasswide{i}.png") for i in range(1, 6)},
        "end_ornament": Path("ornaments/endofchapter.png"),
        "lettrine_config": Path("lettrine.cfl"),
    }
    missing = [str(path) for path in relative.values() if not (ASSET_DIR / path).is_file()]
    if missing:
        fail("missing local print assets: " + ", ".join(missing))
    return {name: ASSET_DIR / path for name, path in relative.items()}


def source_check() -> None:
    if not CONTENT_CHECK.exists():
        fail("missing scripts/validate_content.js")
    result = subprocess.run(["node", str(CONTENT_CHECK)], cwd=ROOT_DIR, text=True, capture_output=True)
    if result.returncode:
        fail(f"canonical Markdown and generated JSON are out of sync.\n{(result.stdout + result.stderr).strip()}")


def load_book() -> dict[str, Any]:
    source_check()
    book = read_json(DATA_PATH)
    if not isinstance(book.get("groups"), list) or not isinstance(book.get("entries"), list):
        fail("archetypes.json must contain normalized groups and entries")
    return book


def lookup_entry(entry_slug: str) -> dict[str, Any]:
    for entry in load_book()["entries"]:
        if entry["slug"] == entry_slug:
            return entry
    fail(f"unknown normalized entry {entry_slug!r}")


def _entry_sort_key(entry: dict[str, Any]) -> tuple[int, int, str]:
    return (int(entry.get("order", 0)), 0 if entry.get("kind") == "archetype" else 1, entry["slug"])


def select_entries(entry_slug: str | None = None, all_entries: bool = False) -> list[dict[str, Any]]:
    book = load_book()
    entries = book["entries"]
    if all_entries:
        return entries
    if not entry_slug:
        return entries
    selected = lookup_entry(entry_slug)
    if selected["kind"] == "shadow":
        return [selected]
    shadows = [entry for entry in entries if entry.get("parent") == selected["slug"]]
    return [selected, *sorted(shadows, key=_entry_sort_key)]


def image_path(entry: dict[str, Any]) -> Path | None:
    path = IMAGE_DIR / entry.get("image", "")
    return path if path.is_file() else None


def copy_images(entries: Iterable[dict[str, Any]]) -> dict[str, str | None]:
    target_dir = BUILD_DIR / "images"
    target_dir.mkdir(parents=True, exist_ok=True)
    copied: dict[str, str | None] = {}
    for entry in entries:
        source = image_path(entry)
        if not source:
            copied[entry["slug"]] = None
            continue
        target = target_dir / f"{entry['slug']}{source.suffix.lower()}"
        shutil.copy2(source, target)
        copied[entry["slug"]] = f"images/{target.name}"
    return copied


def prepare_build_assets(assets: dict[str, Path]) -> None:
    """Copy every runtime print asset into the self-contained LaTeX build tree."""
    font_dir = BUILD_DIR / "fonts"
    ornament_dir = BUILD_DIR / "ornaments"
    font_dir.mkdir(parents=True, exist_ok=True)
    ornament_dir.mkdir(parents=True, exist_ok=True)
    for key in ("title_regular", "title_bold"):
        shutil.copy2(assets[key], font_dir / assets[key].name)
    for key in (*[f"grasswide{i}" for i in range(1, 6)], "end_ornament"):
        shutil.copy2(assets[key], ornament_dir / assets[key].name)
    shutil.copy2(assets["lettrine_config"], BUILD_DIR / "lettrine.cfl")


def apply_drop_cap(paragraph: str) -> str:
    """Render a safe three-line lettrine for an ordinary capitalized paragraph."""
    match = re.match(r'^([“"\'‘]*)([A-Z])([A-Za-z]*)(.*)$', paragraph, flags=re.DOTALL)
    if not match:
        return tex(paragraph)
    prefix, initial, rest_word, tail = match.groups()
    return f"{tex(prefix)}\\lettrine[lines=3]{{{initial}}}{{{tex(rest_word)}}}{tex(tail)}"


def tex_paragraphs(value: str, *, drop_cap: bool = False) -> str:
    lines: list[str] = []
    drop_cap_pending = drop_cap
    for paragraph in value.split("\n\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if paragraph.startswith("### "):
            lines.append(f"\\ChapterHThree{{{tex(paragraph[4:])}}}")
        else:
            rendered = apply_drop_cap(paragraph) if drop_cap_pending else tex(paragraph)
            lines.append(f"{rendered}\\par")
            drop_cap_pending = False
    return "\n\n".join(lines)


def tex_list(values: list[str]) -> str:
    return "\\begin{itemize}" + "".join(f"\\item {tex(value)}" for value in values) + "\\end{itemize}"


def render_quote(value: str) -> str:
    quote, separator, attribution = value.partition("\n\n")
    quote_lines = "\\\\\n".join(tex(line) for line in quote.splitlines())
    attribution_tex = _tex_attribution(attribution if separator else "")
    return "\\begin{quote}\\itshape " + quote_lines + ("\\par\\smallskip \\normalfont " + attribution_tex if attribution_tex else "") + "\\end{quote}"


def _tex_attribution(value: str) -> str:
    parts = re.split(r"(\*[^*\n]+\*)", value)
    return "".join(f"\\emph{{{tex(part[1:-1])}}}" if part.startswith("*") and part.endswith("*") else tex(part) for part in parts)


def _balance_quote_text(text: str, chars_per_line: int = 85, author_len: int = 0) -> str:
    """Balance prose quotations while preserving source-authored verse breaks."""
    if "\n" in text:
        return text
    num_lines = math.ceil(len(text) / chars_per_line)
    if num_lines <= 1:
        return text
    base_target = len(text) / num_lines
    author_total = author_len + 5 if author_len else 0
    first_target = base_target + author_total / 2 if num_lines == 2 else base_target
    last_target = base_target - author_total / 2
    targets = [first_target, *([base_target] * max(0, num_lines - 2)), last_target]
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        candidate = " ".join([*current, word])
        target = targets[min(len(lines), len(targets) - 1)]
        if current and len(candidate) > target and len(lines) < num_lines - 1:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return "\n".join(lines)


def render_opening_quote(value: str) -> str:
    quote, separator, attribution = value.partition("\n\n")
    attribution = attribution.strip() if separator else ""
    balanced = _balance_quote_text(quote.strip(), author_len=len(attribution))
    quote_tex = r"\\".join(tex(line) for line in balanced.splitlines())
    macro = "OpeningQuoteInline" if len(quote) > 85 and attribution else "OpeningQuote"
    return f"\\{macro}{{{quote_tex}}}{{{_tex_attribution(attribution)}}}"


def render_closing_quote(value: str) -> str:
    quote, separator, attribution = value.partition("\n\n")
    quote_tex = r"\\".join(tex(line) for line in quote.strip().splitlines())
    attribution_tex = _tex_attribution(attribution.strip() if separator else "")
    return f"\\ClosingQuote{{{quote_tex}}}{{{attribution_tex}}}"


def render_profile_panel(entry: dict[str, Any], variant_index: int) -> str:
    labels = (
        ("clock", "Lifecycle stage", "lifecycleStage"),
        ("bullseye", "Core function", "coreFunction"),
        ("balance-scale", "Balanced qualities", "balancedQualities"),
        ("fire", "Active shadow", "activeShadow"),
        ("moon", "Passive shadow", "passiveShadow"),
        ("book", "Mythic resonances", "mythicResonances"),
        ("star", "Key qualities", "keyQualities"),
    )
    profile = entry.get("profile", {})
    rows = "\n".join(
        f"\\ProfileRow{{{icon}}}{{{label}:}}{{{tex(profile.get(key, 'Pending'))}}}"
        for icon, label, key in labels
    )
    return f"\\ProfilePanel{{{variant_index % 5 + 1}}}{{{rows}}}"


def render_body_section(entry: dict[str, Any], section: dict[str, Any], *, drop_cap: bool = False) -> str:
    role = section.get("role")
    sections = entry.get("sections", {})
    if role == "declarations":
        content = tex_list(sections.get("declarations", []))
    elif role == "practices":
        content = tex_list(sections.get("practices", []))
    else:
        content = tex_paragraphs(section.get("content", ""), drop_cap=drop_cap)
    subsections = "\n".join(
        f"\\ChapterHThree{{{tex(subsection['heading'])}}}\n{tex_paragraphs(subsection['content'])}"
        for subsection in section.get("subsections", [])
    )
    return f"\\ChapterHTwo{{{tex(section['heading'])}}}\n{content}\n{subsections}"


def render_entry_content(entry: dict[str, Any], image: str | None, variant_index: int = 0) -> str:
    hero = f"\\ArtworkRail{{{image}}}" if image else "\\MissingArtworkRail"
    body = "\n".join(
        render_body_section(entry, section, drop_cap=index == 0)
        for index, section in enumerate(entry.get("bodySections", []))
    )
    return f"""
\\EntryTitle{{{tex(entry['name'])}}}
{render_opening_quote(entry.get('quotes', {}).get('opening', 'Quotation pending.'))}
\\QuoteBodyGap
\\begin{{multicols}}{{2}}
\\begin{{minipage}}[t]{{\\linewidth}}
{hero}
{render_profile_panel(entry, variant_index)}
\\end{{minipage}}
\\columnbreak
{{\\BodyFont
\\setlength\\parskip{{\\EntryParagraphSkip}}
{body}
{render_closing_quote(entry.get('quotes', {}).get('closing', 'Quotation pending.'))}
\\phantomsection\\label{{entry:{entry['slug']}:end}}
}}
\\end{{multicols}}
"""


def entry_start(slug: str) -> str:
    return f"""
\\clearpage
\\ifodd\\value{{page}}\\thispagestyle{{empty}}\\null\\clearpage\\fi
\\thispagestyle{{chapter-start}}
\\phantomsection\\label{{entry:{slug}:start}}
"""


def entry_end(slug: str) -> str:
    del slug
    return "\\clearpage"


def render_entries(
    entries: Iterable[dict[str, Any]],
    images: dict[str, str | None],
    *,
    enforce_parity: bool,
    include_toc: bool = False,
) -> str:
    rendered = []
    seen_lifecycles: set[str] = set()
    for variant_index, entry in enumerate(entries):
        start = entry_start(entry["slug"]) if enforce_parity else f"\\thispagestyle{{chapter-start}}\\phantomsection\\label{{entry:{entry['slug']}:start}}"
        toc = ""
        if include_toc:
            lifecycle = entry["lifecycle"]
            if lifecycle not in seen_lifecycles:
                lifecycle_name = lifecycle.replace("-", " ").title()
                toc += f"\\phantomsection\n\\addcontentsline{{toc}}{{part}}{{{tex(lifecycle_name)}}}\n"
                seen_lifecycles.add(lifecycle)
            level = "chapter" if entry.get("kind") == "archetype" else "section"
            toc += f"\\phantomsection\n\\addcontentsline{{toc}}{{{level}}}{{{tex(entry['name'])}}}\n"
        rendered.append(start + toc + render_entry_content(entry, images[entry["slug"]], variant_index) + entry_end(entry["slug"]))
    return "\n".join(rendered)


def render_document(config: dict[str, Any], entries: list[dict[str, Any]], images: dict[str, str | None], *, standalone: bool) -> str:
    page = config["page"]
    layout = config["layout"]
    typography = config["type"]
    if standalone:
        book_content = "\\setcounter{page}{2}\n" + render_entries(entries, images, enforce_parity=False)
    else:
        book_content = (
            render_front_matter()
            + render_entries(entries, images, enforce_parity=True, include_toc=True)
            + render_back_matter()
        )
    return f"""\\documentclass[10pt,twoside,openany]{{book}}
\\usepackage[paperwidth={page['width']},paperheight={page['height']},inner={page['insideMargin']},outer={page['outsideMargin']},top={page['topMargin']},bottom={page['bottomMargin']}]{{geometry}}
\\usepackage{{fontspec,graphicx,multicol,tikz,adjustbox}}
\\usepackage[most]{{tcolorbox}}
\\usepackage{{enumitem,fancyhdr,hyperref,setspace,lettrine,needspace,fontawesome5}}
\\usepackage[protrusion=false,expansion=false]{{microtype}}
\\renewcommand{{\\DefaultOptionsFile}}{{lettrine.cfl}}
\\setmainfont{{Palatino}}
\\newfontfamily\\TitleFont[Path=fonts/,UprightFont=CinzelDecorative-Regular.ttf,BoldFont=CinzelDecorative-Bold.ttf]{{Cinzel Decorative}}
\\renewcommand\\LettrineFontHook{{\\TitleFont\\mdseries}}
\\definecolor{{ProfileBlack}}{{HTML}}{{0D0D0D}}
\\definecolor{{ProfileIcon}}{{HTML}}{{757575}}
\\setlength\\columnsep{{{layout['columnGap']}}}
\\setlength\\columnseprule{{0pt}}
\\setlength\\premulticols{{0pt}}
\\setlength\\postmulticols{{0pt}}
\\setlength\\multicolsep{{0pt}}
\\setlength\\parindent{{0pt}}
\\setlength\\parskip{{0pt}}
\\setstretch{{1.0}}
\\AtBeginDocument{{\\fontsize{{{typography['bodySize']}pt}}{{{typography['bodyLeading']}pt}}\\selectfont}}
\\clubpenalty=10000
\\widowpenalty=10000
\\displaywidowpenalty=10000
\\brokenpenalty=10000
\\setlist[itemize]{{label=\\raisebox{{0.25ex}}{{\\rule{{0.55ex}}{{0.55ex}}}},leftmargin=0pt,labelsep=0.06in,itemsep=0.05in,topsep=6pt,partopsep=0pt,parsep=0pt,before=\\setlength\\parskip{{0pt}},after=\\vspace{{0.2in}}\\setlength\\parskip{{{layout['paragraphSpacing']}}}}}
\\newcommand\\BodyFont{{\\fontsize{{{typography['bodySize']}pt}}{{{typography['bodyLeading']}pt}}\\selectfont}}
\\newcommand\\QuoteFont{{\\itshape\\fontsize{{{typography['quoteSize']}pt}}{{{typography['quoteLeading']}pt}}\\selectfont}}
\\newcommand\\CiteFont{{\\textcolor[HTML]{{555555}}{{\\upshape\\fontsize{{9pt}}{{11pt}}\\selectfont}}}}
\\newcommand\\ProfileFont{{\\color{{white}}\\fontsize{{{typography['profileSize']}pt}}{{{typography['profileLeading']}pt}}\\selectfont}}
\\newlength\\EntryParagraphSkip
\\setlength\\EntryParagraphSkip{{{layout['paragraphSpacing']}}}
\\newcommand\\QuoteBodyGap{{\\vspace{{{layout['quoteBodyGap']}}}}}
\\newcommand\\MetaIcon[1]{{\\textcolor{{ProfileIcon}}{{\\faIcon{{#1}}}}}}
\\newcommand\\EntryTitle[1]{{{{\\centering\\TitleFont\\bfseries\\fontsize{{{typography['chapterSize']}pt}}{{{typography['chapterLeading']}pt}}\\selectfont #1\\par}}}}
\\newcommand\\SpecialTitle[1]{{{{\\parbox{{\\linewidth}}{{\\centering\\TitleFont\\bfseries\\fontsize{{18pt}}{{22pt}}\\selectfont #1\\par}}}}}}
\\newcommand\\SpecialTitlePage[1]{{{{\\centering\\TitleFont\\bfseries\\fontsize{{30pt}}{{36pt}}\\selectfont #1\\par}}}}
\\newcommand\\SpecialTitlePageBody{{\\fontsize{{14pt}}{{19pt}}\\selectfont}}
\\makeatletter
\\renewcommand\\tableofcontents{{\\thispagestyle{{chapter-start}}\\SpecialTitle{{\\contentsname}}\\vspace{{0.40in}}\\@starttoc{{toc}}}}
\\makeatother
\\newcommand\\OpeningQuote[2]{{\\vspace{{{layout['titleQuoteGap']}}}{{\\centering{{\\QuoteFont #1}}\\if\\relax\\detokenize{{#2}}\\relax\\else\\par{{\\CiteFont #2}}\\fi\\par}}}}
\\newcommand\\OpeningQuoteInline[2]{{\\vspace{{{layout['titleQuoteGap']}}}{{\\centering{{\\QuoteFont #1}}\\if\\relax\\detokenize{{#2}}\\relax\\else\\hspace{{0.5em}}{{\\CiteFont #2}}\\fi\\par}}}}
\\newcommand\\ClosingQuote[2]{{\\par\\vspace{{0.20in}}{{\\centering{{\\QuoteFont #1}}\\if\\relax\\detokenize{{#2}}\\relax\\else\\hspace{{0.5em}}{{\\CiteFont #2}}\\fi\\par}}}}
\\newcommand\\ChapterHTwo[1]{{\\needspace{{2\\baselineskip}}\\par\\ifdim\\prevdepth=-1000pt\\relax\\else\\vspace{{14.25pt}}\\fi\\begingroup\\setlength\\parskip{{0pt}}\\noindent{{\\TitleFont\\bfseries\\fontsize{{{typography['sectionSize']}pt}}{{11.4pt}}\\selectfont #1}}\\par\\endgroup}}
\\newcommand\\ChapterHThree[1]{{\\needspace{{2\\baselineskip}}\\par\\ifdim\\prevdepth=-1000pt\\relax\\else\\vspace{{10.5pt}}\\fi\\begingroup\\setlength\\parskip{{0pt}}\\noindent{{\\bfseries\\fontsize{{{typography['subsectionSize']}pt}}{{12.6pt}}\\selectfont #1}}\\par\\endgroup}}
\\newcommand\\SpecialHTwo[1]{{\\ChapterHTwo{{#1}}}}
\\newcommand\\SpecialHThree[1]{{\\ChapterHThree{{#1}}}}
\\newcommand\\ArtworkRail[1]{{\\noindent\\begin{{tikzpicture}}[baseline=(current bounding box.south)]\\clip (0,0) rectangle (\\linewidth,{layout['artworkHeight']});\\node[anchor=center,inner sep=0pt] at (.5\\linewidth,2.625in){{\\adjustbox{{min height={layout['artworkHeight']}}}{{\\includegraphics[width=\\linewidth]{{#1}}}}}};\\end{{tikzpicture}}\\par\\vspace{{-3pt}}\\noindent}}
\\newcommand\\MissingArtworkRail{{\\noindent\\begin{{tcolorbox}}[width=\\linewidth,height={layout['artworkHeight']},colback=ProfileBlack,colframe=ProfileBlack,boxrule=0pt,arc=0pt]\\centering\\color{{white}}Artwork pending.\\end{{tcolorbox}}\\vspace{{-3pt}}}}
\\newcommand\\ProfileRow[3]{{\\noindent\\parbox[t]{{0.18in}}{{\\MetaIcon{{#1}}}}\\parbox[t]{{\\dimexpr\\linewidth-0.18in\\relax}}{{\\textbf{{#2}}\\ \\textbf{{\\textit{{#3}}}}}}\\par\\vspace{{1pt}}}}
\\newcommand\\ProfilePanel[2]{{\\begin{{tcolorbox}}[enhanced,width=\\linewidth,height={layout['profileHeight']},colback=ProfileBlack,colframe=ProfileBlack,boxrule=0pt,arc=0pt,left=0.15in,right=0.15in,top=0.12in,bottom=0.52in,before skip=0pt,after skip=0pt,valign=top,overlay={{\\node[anchor=south west,inner sep=0pt] at (frame.south west){{\\includegraphics[width=3.40in,height=0.52in]{{ornaments/grasswide#1.png}}}};}}]\\ProfileFont #2\\end{{tcolorbox}}}}
\\fancypagestyle{{chapter-start}}{{\\fancyhf{{}}\\fancyfoot[C]{{\\fontsize{{{typography['folioSize']}pt}}{{{typography['folioSize']}pt}}\\selectfont\\thepage}}\\renewcommand\\headrulewidth{{0pt}}\\renewcommand\\footrulewidth{{0pt}}}}
\\fancypagestyle{{chapter}}{{\\fancyhf{{}}\\fancyhead[LE]{{\\fontsize{{{typography['folioSize']}pt}}{{{typography['folioSize']}pt}}\\selectfont\\thepage}}\\fancyhead[RO]{{\\fontsize{{{typography['folioSize']}pt}}{{{typography['folioSize']}pt}}\\selectfont\\thepage}}\\renewcommand\\headrulewidth{{0pt}}\\renewcommand\\footrulewidth{{0pt}}}}
\\pagestyle{{chapter}}
\\hypersetup{{hidelinks}}
\\begin{{document}}
{book_content}
\\end{{document}}
"""


def write_tex(entries: list[dict[str, Any]], *, standalone: bool = False, name: str = "mature-feminine") -> Path:
    config = read_json(CONFIG_PATH)
    assets = required_print_assets(config)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    prepare_build_assets(assets)
    images = copy_images(entries)
    tex_path = BUILD_DIR / f"{name}.tex"
    tex_path.write_text(render_document(config, entries, images, standalone=standalone), encoding="utf-8")
    return tex_path


def latex_command() -> str | None:
    return shutil.which("lualatex") or (str(Path("/Library/TeX/texbin/lualatex")) if Path("/Library/TeX/texbin/lualatex").is_file() else None)


def compile_pdf(tex_path: Path, output: Path) -> None:
    command = latex_command()
    if not command:
        fail("LuaLaTeX is not installed or not on PATH")
    for _ in range(2):
        result = subprocess.run([command, "-interaction=nonstopmode", "-halt-on-error", tex_path.name], cwd=BUILD_DIR, text=True, capture_output=True)
        if result.returncode:
            log_path = BUILD_DIR / f"{tex_path.stem}.log"
            fail(f"LuaLaTeX could not compile the book; inspect {log_path}")
    built = BUILD_DIR / f"{tex_path.stem}.pdf"
    if not built.is_file():
        fail(f"LuaLaTeX completed without producing {built.name}")
    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(built, output)


def manifest_from_aux(auxiliary: str, slugs: Iterable[str]) -> dict[str, Any]:
    labels: dict[tuple[str, str], int] = {}
    for slug, marker, page in re.findall(r"\\newlabel\{entry:([^:}]+):(start|end)\}\{\{[^}]*\}\{(\d+)\}", auxiliary):
        labels[(slug, marker)] = int(page)
    entries: dict[str, dict[str, Any]] = {}
    for slug in slugs:
        start = labels.get((slug, "start"))
        end = labels.get((slug, "end"))
        entries[slug] = {
            "start_page": start,
            "end_page": end,
            "pages": end - start + 1 if start is not None and end is not None else None,
            "starts_even": start is not None and start % 2 == 0,
            "ends_odd": end is not None and end % 2 == 1,
        }
    return {"entries": entries}


def write_manifest(entries: list[dict[str, Any]], output: Path, tex_path: Path) -> Path:
    aux_path = BUILD_DIR / f"{tex_path.stem}.aux"
    if not aux_path.is_file():
        fail(f"missing anchor file {aux_path.name}")
    manifest = manifest_from_aux(aux_path.read_text(encoding="utf-8"), [entry["slug"] for entry in entries])
    manifest_path = output.with_name(MANIFEST_NAME)
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return manifest_path


def render_entry(entry_slug: str, output_path: Path | str) -> Path:
    entry = lookup_entry(entry_slug)
    tex_path = write_tex([entry], standalone=True, name=f"entry-{entry_slug}")
    output = Path(output_path).resolve()
    compile_pdf(tex_path, output)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate normalized Mature Feminine entry PDFs with LuaLaTeX.")
    parser.add_argument("--check", action="store_true", help="Verify normalized source data and write TeX without LuaLaTeX.")
    parser.add_argument("--entry", help="Render one entry; an archetype selection includes its two shadows.")
    parser.add_argument("--all", action="store_true", help="Render every normalized entry.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Destination compiled PDF path.")
    args = parser.parse_args()
    if args.entry and args.all:
        fail("--entry and --all cannot be used together")
    entries = select_entries(args.entry, args.all)
    tex_path = write_tex(entries)
    print(f"Prepared {tex_path.relative_to(ROOT_DIR)} ({len(entries)} normalized entries).")
    if args.check:
        return
    output = args.output.resolve()
    compile_pdf(tex_path, output)
    manifest = write_manifest(entries, output, tex_path)
    print(f"Generated {output}")
    print(f"Recorded anchor pages in {manifest}")


if __name__ == "__main__":
    main()
