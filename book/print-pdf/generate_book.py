#!/usr/bin/env python3
"""Generate the Mature Feminine book from verified site data using LuaLaTeX."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
BOOK_DIR = SCRIPT_DIR.parent
ROOT_DIR = BOOK_DIR.parent
DATA_DIR = ROOT_DIR / "src" / "_data"
IMAGE_DIR = ROOT_DIR / "src" / "assets" / "images"
CONTENT_CHECK = ROOT_DIR / "scripts" / "validate_content.js"
CONFIG_PATH = SCRIPT_DIR / "print_config.json"
BUILD_DIR = SCRIPT_DIR / ".latex-build"
DEFAULT_OUTPUT = BOOK_DIR / "mature-feminine.pdf"


def fail(message: str) -> None:
    raise SystemExit(f"book generation failed: {message}")


def tex(value: Any) -> str:
    """Escape user-authored content for LuaLaTeX without changing its wording."""
    return (
        str(value)
        .replace("\\", r"\textbackslash{}")
        .replace("&", r"\&")
        .replace("%", r"\%")
        .replace("$", r"\$")
        .replace("#", r"\#")
        .replace("_", r"\_")
        .replace("{", r"\{")
        .replace("}", r"\}")
        .replace("~", r"\textasciitilde{}")
        .replace("^", r"\textasciicircum{}")
    )


def tex_paragraphs(values: list[str]) -> str:
    return "\n\n".join(tex(value) for value in values)


def tex_list(values: list[str]) -> str:
    return "\n".join(f"\\item {tex(value)}" for value in values)


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"cannot read {path.relative_to(ROOT_DIR)}: {error}")


def source_check() -> None:
    if not CONTENT_CHECK.exists():
        fail("missing scripts/validate_content.js; cannot verify the Markdown-to-JSON source contract")
    result = subprocess.run(["node", str(CONTENT_CHECK)], cwd=ROOT_DIR, text=True, capture_output=True)
    if result.returncode:
        output = (result.stdout + result.stderr).strip()
        fail(f"canonical Markdown and generated JSON are out of sync. Run npm run content:sync, then retry.\n{output}")


def group_sort_key(path: Path) -> list[Any]:
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path.name)]


def load_source() -> tuple[list[dict[str, Any]], dict[str, str], dict[str, Any]]:
    source_check()
    group_paths = sorted(DATA_DIR.glob("group_*.json"), key=group_sort_key)
    if not group_paths:
        fail("no generated lifecycle group files found under src/_data")
    groups = [read_json(path) for path in group_paths]
    images = read_json(DATA_DIR / "images.json")
    site_content = read_json(DATA_DIR / "siteContent.json")

    required_item_fields = ("name", "slug", "qualities", "gifts", "growthPath", "practices", "extended")
    for group in groups:
        for field in ("name", "slug", "summary", "essence", "items"):
            if not group.get(field):
                fail(f"group is missing {field}")
        for item in group["items"]:
            missing = [field for field in required_item_fields if not item.get(field)]
            if missing:
                fail(f"{group['name']} > {item.get('name', '<unnamed>')} is missing {', '.join(missing)}")
            extended = item["extended"]
            if len(extended.get("shadows", [])) != 2:
                fail(f"{item['name']} must have one active and one passive shadow")
            if [shadow.get("type") for shadow in extended["shadows"]] != ["active", "passive"]:
                fail(f"{item['name']} shadows must be ordered active, passive")
            if len(extended.get("virtues", [])) != 2:
                fail(f"{item['name']} must have two balance virtues")
            image_name = images.get(item["slug"])
            image_path = IMAGE_DIR / image_name if image_name else None
            if not image_path or not image_path.is_file():
                fail(f"{item['name']} has no available hero image mapping")
    return groups, images, site_content


def normalized_image_suffix(path: Path) -> str:
    if path.suffix:
        return path.suffix.lower()
    header = path.read_bytes()[:12]
    if header.startswith(b"\x89PNG"):
        return ".png"
    if header.startswith(b"\xff\xd8"):
        return ".jpg"
    fail(f"cannot determine image format for {path.relative_to(ROOT_DIR)}")


def half_dimension(value: str) -> str:
    match = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)([a-zA-Z]+)", value)
    if not match:
        fail(f"cannot halve the configured dimension {value!r}")
    return f"{float(match.group(1)) / 2:g}{match.group(2)}"


def copy_hero_images(groups: list[dict[str, Any]], images: dict[str, str]) -> dict[str, str]:
    target_dir = BUILD_DIR / "images"
    target_dir.mkdir(parents=True, exist_ok=True)
    image_paths: dict[str, str] = {}
    for group in groups:
        for item in group["items"]:
            source = IMAGE_DIR / images[item["slug"]]
            target = target_dir / f"{item['slug']}{normalized_image_suffix(source)}"
            shutil.copy2(source, target)
            image_paths[item["slug"]] = f"images/{target.name}"
    return image_paths


def render_front_matter(site: dict[str, Any]) -> str:
    quote = site.get("quote", {})
    how_to_use = site.get("howToUse", [])
    poles = site.get("poles", [])
    wheel = site.get("devWheel", [])
    return f"""
\\frontmatter
\\begin{{titlepage}}
\\centering
\\vspace*{{1.55in}}
{{\\TitleFont\\fontsize{{30pt}}{{36pt}}\\selectfont {tex(site.get('title', 'The Mature Feminine'))}\\par}}
\\vspace{{0.22in}}
{{\\Large {tex(site.get('subtitle', 'A Field Guide'))}\\par}}
\\vfill
\\begin{{tcolorbox}}[bookbox, width=0.78\\textwidth]
\\itshape {tex(quote.get('text', ''))}\\par
\\smallskip\\hfill— {tex(quote.get('author', ''))}
\\end{{tcolorbox}}
\\vfill
\\end{{titlepage}}

\\chapter*{{How to Use This Book}}
\\addcontentsline{{toc}}{{chapter}}{{How to Use This Book}}
\\begin{{description}}
{''.join(f'\\item[{tex(entry.get("label", ""))}] {tex(entry.get("text", ""))}\n' for entry in how_to_use)}
\\end{{description}}

\\section*{{Four Core Poles}}
\\begin{{description}}
{''.join(f'\\item[{tex(entry.get("name", ""))}] {tex(entry.get("description", ""))}\n' for entry in poles)}
\\end{{description}}

\\section*{{Lifecycle Wheel}}
\\begin{{description}}
{''.join(f'\\item[{tex(entry.get("stage", ""))}] {tex(entry.get("task", ""))}\n' for entry in wheel)}
\\end{{description}}

\\tableofcontents
\\mainmatter
"""


def render_shadow(shadow: dict[str, Any]) -> str:
    return f"""
\\subsubsection*{{{tex(shadow['type'].title())} Shadow: {tex(shadow['name'])}}}
\\begin{{tcolorbox}}[shadowbox, title={tex(shadow['type'].title())} shadow]
{tex_paragraphs(shadow.get('description', []))}

\\textbf{{Declarations}}\\begin{{itemize}}{tex_list(shadow.get('declarations', []))}\\end{{itemize}}
\\textbf{{Balancing practices}}\\begin{{itemize}}{tex_list(shadow.get('balancing', []))}\\end{{itemize}}
\\textbf{{Integration gift.}} {tex(shadow.get('gift', ''))}

\\textbf{{Out of balance}}\\begin{{itemize}}{tex_list(shadow.get('outOfBalance', []))}\\end{{itemize}}
\\end{{tcolorbox}}
"""


def render_item(item: dict[str, Any], image_path: str) -> str:
    extended = item["extended"]
    balance = extended.get("balance", {})
    mature = extended.get("mature", {})
    virtues = "\n".join(
        f"\\subsubsection*{{{tex(virtue['title'])}}}\n"
        + (f"\\begin{{quote}}{tex(virtue['quote'])}\\end{{quote}}\n" if virtue.get("quote") else "")
        + tex_paragraphs(virtue.get("paragraphs", []))
        for virtue in extended.get("virtues", [])
    )
    shadows = "\n".join(render_shadow(shadow) for shadow in extended.get("shadows", []))
    return f"""
\\section{{{tex(item['name'])}}}
\\FullWidthImage{{{image_path}}}
\\begin{{multicols}}{{2}}
\\begin{{tcolorbox}}[profilebox]
\\textbf{{Essence.}} {tex(item['gifts'])}\\par\\smallskip
\\textbf{{Growth path.}} {tex(item['growthPath'])}\\par\\smallskip
\\textbf{{Balance.}} {tex(balance.get('balance', ''))}\\par
\\textbf{{Shadow continuum.}} {tex(balance.get('shadow', ''))}\\par
\\textbf{{Power animals.}} {tex(balance.get('powerAnimals', ''))}
\\end{{tcolorbox}}

\\subsection*{{Qualities}}
\\begin{{itemize}}{tex_list(item.get('qualities', []))}\\end{{itemize}}

\\subsection*{{{tex(mature.get('title', 'Mature Expression'))}}}
{tex_paragraphs(mature.get('paragraphs', []))}

\\subsection*{{Mature Declarations}}
\\begin{{itemize}}{tex_list(extended.get('declarations', []))}\\end{{itemize}}

\\subsection*{{Practices}}
\\begin{{itemize}}{tex_list(item.get('practices', []))}\\end{{itemize}}

\\subsection*{{Balance Virtues}}
{virtues}

\\subsection*{{Shadows and Integration}}
{shadows}
\\end{{multicols}}
"""


def render_groups(groups: list[dict[str, Any]], image_paths: dict[str, str]) -> str:
    chapters = []
    for group in groups:
        items = "\n".join(render_item(item, image_paths[item["slug"]]) for item in group["items"])
        chapters.append(f"""
\\chapter{{{tex(group['name'])}}}
\\begin{{tcolorbox}}[groupbox]
\\textbf{{{tex(group['summary'])}}}\\par\\smallskip
{tex(group['essence'])}
\\end{{tcolorbox}}
{items}
""")
    return "\n".join(chapters)


def render_back_matter(site: dict[str, Any]) -> str:
    alchemy = site.get("shadowAlchemy", [])
    assessment = site.get("selfAssessment", [])
    return f"""
\\backmatter
\\chapter*{{Integration Materials}}
\\addcontentsline{{toc}}{{chapter}}{{Integration Materials}}
\\section*{{Shadow Alchemy}}
\\begin{{itemize}}{tex_list(alchemy)}\\end{{itemize}}
\\section*{{Self-Assessment Prompts}}
\\begin{{enumerate}}{tex_list(assessment)}\\end{{enumerate}}
"""


def render_document(config: dict[str, Any], site: dict[str, Any], groups: list[dict[str, Any]], image_paths: dict[str, str]) -> str:
    page = config["page"]
    layout = config["layout"]
    typography = config["type"]
    title = tex(site.get("title", "The Mature Feminine"))
    hero_center = half_dimension(layout["heroHeight"])
    return f"""\\documentclass[10pt,twoside,openany]{{book}}
\\usepackage[paperwidth={page['width']},paperheight={page['height']},inner={page['insideMargin']},outer={page['outsideMargin']},top={page['topMargin']},bottom={page['bottomMargin']}]{{geometry}}
\\usepackage{{fontspec}}
\\usepackage{{graphicx}}
\\usepackage{{multicol}}
\\usepackage{{tikz}}
\\usepackage[most]{{tcolorbox}}
\\usepackage{{enumitem}}
\\usepackage{{fancyhdr}}
\\usepackage{{hyperref}}
\\usepackage[protrusion=true,expansion=false]{{microtype}}
\\usepackage{{setspace}}
\\setmainfont{{TeX Gyre Pagella}}
\\newfontfamily\\TitleFont{{TeX Gyre Chorus}}
\\definecolor{{FemininePlum}}{{HTML}}{{512B4B}}
\\definecolor{{FeminineRose}}{{HTML}}{{A55C7A}}
\\definecolor{{FeminineMist}}{{HTML}}{{F6EFF2}}
\\definecolor{{FeminineShadow}}{{HTML}}{{EEE1E6}}
\\hypersetup{{hidelinks,pdftitle={{{title}}}}}
\\setlength\\columnsep{{{layout['columnGap']}}}
\\setlength\\parindent{{0pt}}
\\setlength\\parskip{{5pt}}
\\setstretch{{1.02}}
\\AtBeginDocument{{\\fontsize{{{typography['bodySize']}pt}}{{{typography['bodyLeading']}pt}}\\selectfont}}
\\clubpenalty=10000
\\widowpenalty=10000
\\displaywidowpenalty=10000
\\setlist[itemize]{{leftmargin=1.25em,itemsep=2pt,topsep=3pt}}
\\setlist[enumerate]{{leftmargin=1.45em,itemsep=3pt,topsep=3pt}}
\\tcbset{{groupbox/.style={{colback=FeminineMist,colframe=FeminineRose,boxrule=.55pt,arc=2pt,left=8pt,right=8pt,top=7pt,bottom=7pt}},profilebox/.style={{colback=FeminineMist,colframe=FeminineRose,boxrule=.4pt,arc=1pt,left=7pt,right=7pt,top=6pt,bottom=6pt}},shadowbox/.style={{colback=FeminineShadow,colframe=FeminineRose,boxrule=.4pt,arc=1pt,fonttitle=\\bfseries,left=7pt,right=7pt,top=6pt,bottom=6pt}},bookbox/.style={{colback=FeminineMist,colframe=FeminineRose,boxrule=.5pt,arc=2pt,left=10pt,right=10pt,top=10pt,bottom=10pt}}}}
\\newcommand{{\\FullWidthImage}}[1]{{%
  \\begin{{center}}\\begin{{tikzpicture}}[baseline]
  \\clip (0,0) rectangle (\\textwidth,{layout['heroHeight']});
  \\node[inner sep=0pt] at (.5\\textwidth,{hero_center}) {{\\includegraphics[width=\\textwidth]{{#1}}}};
  \\end{{tikzpicture}}\\end{{center}}%
}}
\\fancypagestyle{{plain}}{{\\fancyhf{{}}\\fancyfoot[C]{{\\thepage}}\\renewcommand{{\\headrulewidth}}{{0pt}}}}
\\pagestyle{{fancy}}
\\fancyhf{{}}
\\fancyhead[LE]{{\\small\\itshape {title}}}
\\fancyhead[RO]{{\\small\\itshape \\leftmark}}
\\fancyfoot[C]{{\\thepage}}
\\renewcommand{{\\headrulewidth}}{{.25pt}}
\\begin{{document}}
{render_front_matter(site)}
{render_groups(groups, image_paths)}
{render_back_matter(site)}
\\end{{document}}
"""


def write_tex() -> tuple[Path, dict[str, int]]:
    config = read_json(CONFIG_PATH)
    groups, images, site = load_source()
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    image_paths = copy_hero_images(groups, images)
    document = render_document(config, site, groups, image_paths)
    tex_path = BUILD_DIR / "mature-feminine.tex"
    tex_path.write_text(document, encoding="utf-8")
    totals = {
        "groups": len(groups),
        "archetypes": sum(len(group["items"]) for group in groups),
        "shadows": sum(len(item["extended"]["shadows"]) for group in groups for item in group["items"]),
        "virtues": sum(len(item["extended"]["virtues"]) for group in groups for item in group["items"]),
        "practices": sum(len(item["practices"]) for group in groups for item in group["items"]),
    }
    return tex_path, totals


def latex_command() -> str | None:
    mac_tex = Path("/Library/TeX/texbin/lualatex")
    if mac_tex.is_file():
        return str(mac_tex)
    return shutil.which("lualatex")


def compile_pdf(tex_path: Path, output: Path) -> None:
    command = latex_command()
    if not command:
        fail("LuaLaTeX is not installed. Install MacTeX so /Library/TeX/texbin/lualatex exists (or add lualatex to PATH), then run npm run book:build.")
    for _ in range(2):
        result = subprocess.run(
            [command, "-interaction=nonstopmode", "-halt-on-error", tex_path.name],
            cwd=BUILD_DIR,
            text=True,
            capture_output=True,
        )
        if result.returncode:
            log_path = BUILD_DIR / "mature-feminine.log"
            detail = log_path if log_path.exists() else "LuaLaTeX output"
            fail(f"LuaLaTeX could not compile the book; inspect {detail}")
    pdf_path = BUILD_DIR / "mature-feminine.pdf"
    if not pdf_path.is_file():
        fail("LuaLaTeX completed without producing mature-feminine.pdf")
    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(pdf_path, output)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the Mature Feminine PDF book with LuaLaTeX.")
    parser.add_argument("--check", action="store_true", help="Verify source coverage and generate TeX without requiring LuaLaTeX.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Destination PDF path.")
    args = parser.parse_args()
    tex_path, totals = write_tex()
    summary = ", ".join(f"{value} {name}" for name, value in totals.items())
    print(f"Prepared {tex_path.relative_to(ROOT_DIR)} ({summary}).")
    if args.check:
        return
    compile_pdf(tex_path, args.output.resolve())
    print(f"Generated {args.output.resolve()}")


if __name__ == "__main__":
    main()
