# Project Plan – The Mature Feminine Website (Old Plan Mode)

## Objectives
- Convert `source.html` into a multi-page static site hosted on GitHub Pages.
- Each archetype and sub-archetype has its own page with clean slugs.
- Left sidebar shows collapsible hierarchy and qualities as chips; includes search/filter.
- Modern responsive UI with Bootstrap 5 and a dark mode toggle.
- Inter-page previous/next navigation within each group.
- GA4 analytics (await Measurement ID from user).
- Git repo with conventional commits and frequent commits after substantial changes.

## Scope
- Static Site Generator: Eleventy (11ty).
- Hosting: GitHub Pages from `docs/` directory (11ty output configured accordingly).
- Content migration: Structured JSON/YAML data for groups and sub-archetypes; per-sub-archetype pages generated from data using a single template.
- Assets: Minimal custom CSS, Bootstrap 5 via CDN, Fuse.js for client-side search.

## Deliverables
- `plan.md` (this file)
- 11ty project scaffold with:
  - `.eleventy.js` (output to `docs/`)
  - `src/_data/archetypes.json` (canonical content)
  - `src/_includes/layout.njk` (base layout + sidebar + dark mode + GA4)
  - `src/index.njk` (intro page)
  - `src/archetype.njk` (template for sub-archetype pages)
  - `src/search.json.njk` (search index)
  - `src/assets/styles.css`, `src/assets/main.js` (UI and behavior)
- Generated pages for each sub-archetype.

## Information Architecture
- Groups: Maiden, Lover/Creatrix, Mother, Queen, Crone.
- URL Structure: `/[group-slug]/[sub-slug]/` (e.g., `/maiden/young-visionary-oracle/`).
- Index page: overview and links to all groups.

## UX Requirements
- Collapsible sidebar (Bootstrap Accordion) listing groups → sub-archetypes with quality chips.
- Search box filters sidebar items with Fuse.js.
- Responsive layout; sidebar becomes off-canvas on mobile.
- Dark mode toggle with localStorage persistence.
- Previous/Next within a group on each archetype page.

## Implementation Steps
1) Initialize repo and base files (.gitignore, README stub). [Git]
2) Add 11ty scaffold and configuration to output into `docs/`. [Build]
3) Migrate content into `src/_data/archetypes.json`. [Content]
4) Create base layout with Bootstrap, dark mode, sidebar scaffold, and GA4 hook. [UI]
5) Create index page. [Content]
6) Create `archetype.njk` template and generate pages for each sub-archetype from data. [Pages]
7) Implement search (Fuse.js) and chips; wire up filtering. [UX]
8) Add prev/next within group; verify mobile behavior. [Nav]
9) Polish styles, run build, verify on local server, and prepare for GitHub Pages. [QA]

## Risks & Mitigations
- Complex source parsing: use curated JSON based on confirmed structure instead of scraping HTML.
- GitHub Pages routing: use clean URLs with trailing slashes and ensure relative links.
- Search size: keep search index minimal (title, group, qualities, slug).

## Open Questions
- GA4 Measurement ID? Place as env/config when available.
- Any custom brand colors or stick to Bootstrap defaults?

## Milestones
- M1: Repo + scaffold committed.
- M2: Data + generated pages.
- M3: Sidebar, search, dark mode.
- M4: Navigation polish + deploy to GitHub Pages.
