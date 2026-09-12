# Styling

Lifted from `data/lab/tier-style-lab.html`. That file is gitignored, so this is the
committed copy of the vocabulary — copy values from here, not from there.

## Tokens

```css
:root {
  --ground:#0e1013; --bg:#14161a; --panel:#1b1e24; --panel-2:#22262e;
  --line:#2f3540; --line-soft:#242932;
  --text:#dde1e7; --dim:#8d96a4; --faint:#5e6674;
  --accent:#c8a15a; --accent-dim:#6d5a33;
  --take:#74c882; --check:#5fb4d9; --gamble:#a85ae6; --danger:#e2735d;
  --ui:"Barlow Semi Condensed","Segoe UI",system-ui,sans-serif;
  --loot:Gelasio,Georgia,"Times New Roman",serif;
  --mono:"IBM Plex Mono",Consolas,monospace;
}
```

Fonts load from Google Fonts: `Barlow Semi Condensed` 400/500/600, `Gelasio` 400/500/600,
`IBM Plex Mono` 400.

## Rules

**Dark only.** No light mode, no `prefers-color-scheme`. The tool draws item labels as they
appear on a dark game floor, so a light ground makes every one of them wrong. Paint every
colour explicitly — never leave one to the browser.

**Three typefaces, three jobs.** `--ui` for the interface, because it is narrow and labels
fit without shrinking. `--loot` for anything imitating an item on the floor — that is the
game's look, not the app's. `--mono` for numbers, hex values and anything that must line up.

**One accent.** `--accent` marks selected and focused, nothing else. `--take` `--check`
`--gamble` `--danger` carry fixed meanings and are never decoration.

**Selection is a ring, not a fill.** A coloured element cannot show selection by changing
its own colour. Use `box-shadow:0 0 0 2px var(--accent)` or a border colour swap.

**Movement is nearly absent.** `transition:border-color .12s` on hover, nothing else.
`@media (prefers-reduced-motion:reduce) { * { transition:none !important; } }`.

**Numbers use `font-variant-numeric:tabular-nums`** so columns of them do not jitter.

## Type scale

| Use | Size | Weight |
| --- | --- | --- |
| Body / rows | 15px | 400 |
| Controls, labels, inputs | 13px | 400 |
| Secondary, hints, notes | 12px | 400 |
| Section heading | 11px, `letter-spacing:.1em`, uppercase, `--faint` | 500–600 |
| Mono values | 10–12px | 400 |

Headings are `font-weight:600`, `margin:0`. Body line-height is 1.5.

## Components

**Bar** — `background:var(--ground)`, `border-bottom:1px solid var(--line)`,
`padding:11px 20px`, flex with `gap:12px`, sticky at top. Title is 15px. A `.sp { flex:1 }`
spacer pushes buttons right.

**Button** — `border:1px solid var(--line)`, `background:var(--panel-2)`,
`padding:5px 12px`, `border-radius:4px`, 13px. Hover only moves the border to `#4c5460`.
Danger variant colours the border `#8a4238` and the text `--danger` on hover.

**Panel** — `background:var(--panel)` for a surface, `--ground` for a well inside it.
Borders `--line` between regions, `--line-soft` between rows.

**Section label** — 11px uppercase `.1em` tracking in `--faint`, `margin:0 0 10px`.

**Pill** — `border:1px solid var(--line)`, `border-radius:11px`, `padding:1px 10px`, 12px,
`--dim`. A state pill colours border and text with its meaning colour.

**Input / select** — `background:var(--ground)`, `border:1px solid var(--line)`,
`border-radius:3px`, `padding:3px 7px`, 13px `--ui`. Focus swaps the border to `--accent`
and drops the outline.

**Switch** — 30×17 pill, `--panel-2` background, 11px knob. On state is
`background:rgba(200,161,90,.22)`, border and knob `--accent`.

**Tabs** — flush row on `#171a20`, each `flex:1`, `border-bottom:2px solid transparent`,
`--dim` text. Active gets `--text` and an `--accent` bottom border.

**Segmented control** — flex row of equal `flex:1 1 0` buttons, shared borders with
`border-right-width:0` except the last, 3px radius on the outer ends only. Active is
`background:var(--accent)` with `color:#1a1408`.

**Item label** — `font-family:var(--loot)`, `font-variant-caps:small-caps`,
`padding:1px 10px`, `border:1px solid`, `white-space:nowrap`. An icon inside scales with
the type: `width:1.15em`.

## Layout

Grid, `grid-template-columns` with `minmax(0,1fr)` on any flexible column so long content
cannot blow the track out. Side panels stick with `position:sticky` under the bar.

Collapse to one column under 900px: side panels move below and swap `border-left` for
`border-top`.

## Focus

`:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }` globally. Inputs
override it with a border colour change instead.
