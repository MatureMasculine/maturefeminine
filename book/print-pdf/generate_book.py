#!/usr/bin/env python3
"""Render normalized archetype and shadow entries with LuaLaTeX."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any, Iterable


SCRIPT_DIR = Path(__file__).resolve().parent
BOOK_DIR = SCRIPT_DIR.parent
ROOT_DIR = BOOK_DIR.parent
DATA_PATH = ROOT_DIR / "src" / "_data" / "archetypes.json"
IMAGE_DIR = ROOT_DIR / "src"
CONTENT_CHECK = ROOT_DIR / "scripts" / "validate_content.js"
CONFIG_PATH = SCRIPT_DIR / "print_config.json"
BUILD_DIR = SCRIPT_DIR / ".latex-build"
DEFAULT_OUTPUT = BOOK_DIR / "mature-feminine.pdf"
MANIFEST_NAME = "spread-manifest.json"


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


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"cannot read {path.relative_to(ROOT_DIR)}: {error}")


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


def tex_paragraphs(value: str) -> str:
    lines: list[str] = []
    for paragraph in value.split("\n\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if paragraph.startswith("### "):
            lines.append(f"\\subsubsection*{{{tex(paragraph[4:])}}}")
        else:
            lines.append(f"{tex(paragraph)}\\par")
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


def render_profile(entry: dict[str, Any]) -> str:
    labels = (
        ("Lifecycle stage", "lifecycleStage"),
        ("Core function", "coreFunction"),
        ("Balanced qualities", "balancedQualities"),
        ("Active shadow", "activeShadow"),
        ("Passive shadow", "passiveShadow"),
        ("Mythic resonances", "mythicResonances"),
        ("Key qualities", "keyQualities"),
    )
    profile = entry.get("profile", {})
    values = "\\par\\smallskip ".join(f"\\textbf{{{label}.}} {tex(profile.get(key, "Pending"))}" for label, key in labels)
    return f"\\begin{{tcolorbox}}[profilebox]{values}\\end{{tcolorbox}}"


def render_body_section(entry: dict[str, Any], section: dict[str, Any]) -> str:
    role = section.get("role")
    sections = entry.get("sections", {})
    if role == "declarations":
        content = tex_list(sections.get("declarations", []))
    elif role == "practices":
        content = tex_list(sections.get("practices", []))
    else:
        content = tex_paragraphs(section.get("content", ""))
    subsections = "\n".join(
        f"\\subsubsection*{{{tex(subsection['heading'])}}}\n{tex_paragraphs(subsection['content'])}"
        for subsection in section.get("subsections", [])
    )
    return f"\\subsection*{{{tex(section['heading'])}}}\n{content}\n{subsections}"


def render_entry_content(entry: dict[str, Any], image: str | None) -> str:
    designation = ""
    if entry["kind"] == "shadow":
        fallback_designation = f"{entry.get('type', '').title()} Shadow"
        designation_text = entry.get("sections", {}).get("designation", fallback_designation)
        designation = f"\\textit{{{tex(designation_text)}}}\\par\\medskip"
    hero = f"\\EntryImage{{{image}}}" if image else "\\begin{tcolorbox}[missingimage]Image pending.\\end{tcolorbox}"
    body = "\n".join(render_body_section(entry, section) for section in entry.get("bodySections", []))
    return f"""
\\section*{{{tex(entry['name'])}}}
{designation}
{render_quote(entry.get('quotes', {}).get('opening', 'Quotation pending.'))}
{hero}
{render_profile(entry)}
\\begin{{multicols}}{{2}}
{body}
{render_quote(entry.get('quotes', {}).get('closing', 'Quotation pending.'))}
\\end{{multicols}}
"""


def entry_start(slug: str) -> str:
    return f"""
\\clearpage
\\ifodd\\value{{page}}\\thispagestyle{{empty}}\\null\\clearpage\\fi
\\phantomsection\\label{{entry:{slug}:start}}
"""


def entry_end(slug: str) -> str:
    return f"\\par\\mbox{{}}\\phantomsection\\label{{entry:{slug}:end}}\\clearpage"


def render_entries(entries: Iterable[dict[str, Any]], images: dict[str, str | None], *, enforce_parity: bool) -> str:
    rendered = []
    for entry in entries:
        start = entry_start(entry["slug"]) if enforce_parity else f"\\phantomsection\\label{{entry:{entry['slug']}:start}}"
        rendered.append(start + render_entry_content(entry, images[entry["slug"]]) + entry_end(entry["slug"]))
    return "\n".join(rendered)


def render_document(config: dict[str, Any], entries: list[dict[str, Any]], images: dict[str, str | None], *, standalone: bool) -> str:
    page = config["page"]
    layout = config["layout"]
    typography = config["type"]
    initial = "\\setcounter{page}{1}" if not standalone else "\\setcounter{page}{1}"
    title_page = "" if standalone else "\\thispagestyle{empty}\\vspace*{3in}\\begin{center}{\\TitleFont\\fontsize{30pt}{36pt}\\selectfont The Mature Feminine}\\end{center}\\clearpage"
    return f"""\\documentclass[10pt,twoside,openany]{{book}}
\\usepackage[paperwidth={page['width']},paperheight={page['height']},inner={page['insideMargin']},outer={page['outsideMargin']},top={page['topMargin']},bottom={page['bottomMargin']}]{{geometry}}
\\usepackage{{fontspec,graphicx,multicol,tikz}}
\\usepackage[most]{{tcolorbox}}
\\usepackage{{enumitem,fancyhdr,hyperref,microtype,setspace}}
\\setmainfont{{TeX Gyre Pagella}}
\\newfontfamily\\TitleFont{{TeX Gyre Chorus}}
\\definecolor{{FemininePlum}}{{HTML}}{{512B4B}}
\\definecolor{{FeminineRose}}{{HTML}}{{A55C7A}}
\\definecolor{{FeminineMist}}{{HTML}}{{F6EFF2}}
\\setlength\\columnsep{{{layout['columnGap']}}}
\\setlength\\parindent{{0pt}}
\\setlength\\parskip{{3pt}}
\\setstretch{{1.0}}
\\AtBeginDocument{{\\fontsize{{{typography['bodySize']}pt}}{{{typography['bodyLeading']}pt}}\\selectfont}}
\\clubpenalty=10000
\\widowpenalty=10000
\\displaywidowpenalty=10000
\\setlist[itemize]{{leftmargin=1.15em,itemsep=1pt,topsep=2pt,parsep=0pt}}
\\tcbset{{profilebox/.style={{colback=FeminineMist,colframe=FeminineRose,boxrule=.35pt,arc=1pt,left=5pt,right=5pt,top=4pt,bottom=4pt}},missingimage/.style={{colback=FeminineMist,colframe=FeminineRose,boxrule=.35pt,arc=1pt,left=5pt,right=5pt,top=4pt,bottom=4pt}}}}
\\newcommand{{\\EntryImage}}[1]{{\\begin{{center}}\\includegraphics[width=\\linewidth,height=1.45in,keepaspectratio]{{#1}}\\end{{center}}}}
\\pagestyle{{fancy}}\\fancyhf{{}}\\fancyfoot[C]{{\\thepage}}\\renewcommand{{\\headrulewidth}}{{0pt}}
\\begin{{document}}
{initial}
{title_page}
{render_entries(entries, images, enforce_parity=not standalone)}
\\end{{document}}
"""


def write_tex(entries: list[dict[str, Any]], *, standalone: bool = False, name: str = "mature-feminine") -> Path:
    config = read_json(CONFIG_PATH)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
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
