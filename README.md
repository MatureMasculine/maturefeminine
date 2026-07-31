# The Mature Feminine

The website reads generated JSON from `src/_data/`. Its only editable archetype content source is Markdown in `content/`.

## Content layout

There are five group directories: `maiden`, `lover-creatrix`, `mother`, `queen`, and `crone`. Each contains:

- `group.md` for the lifecycle group's title, slug, summary, and essence.
- One Markdown file for every archetype in that group, named with its stable public slug.

Keep public slugs and explicit shadow slugs unchanged unless a URL or image migration is intentional.

## Workflow

After editing Markdown, regenerate JSON:

```sh
npm run content:sync
```

Check that every generated group JSON file and the aggregate `archetypes.json` exactly match the Markdown source:

```sh
npm run content:check
```

Build the site after a content change:

```sh
npm run build
```

Do not edit `src/_data/group_*.json` or `src/_data/archetypes.json` by hand; they are generated outputs consumed by the site.
