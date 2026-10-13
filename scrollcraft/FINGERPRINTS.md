# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| **nextera-statement** (13 Oct 2026) | **Statement** (new): sections are stages in one investment's life, in date order | Fixed bottom **instrument bar**: dated 7-stop jump index, standing order, running credited total. Top bar cut to wordmark plus three links | `parallax`: five planes cut from one photographic plate, copy between ridge and crest, second beat on the dark field | 8 acts, ~18.7vh desktop: parallax 2.4 / split 2.2 / **pin+step+count 5.2 (peak)** / pan rail 1.5 / live surface 1.3 / step 3.0 / static paper 0.9 / pin 2.0 | **Maturity plate**: dated, ruled, totalled, held. CTA is the last line item inside the plate, not a button island | **The standing order**: a fixed instrument line that fires a dated credit per scroll step and keeps the running balance to maturity | Photographic Indian ridge at blue hour, obsidian + ivory + one ember, money is the only coloured thing | Next.js 16 App Router, React 19, Tailwind v4 (in-app, engine not used) |

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **The Statement grammar.** Date-ordered stages of a financial instrument. A
  second build wanting a date-indexed page needs a different organising logic.
- **A fixed bottom instrument bar as the whole navigation.** Index, progress,
  live figure and running total in one element. Do not re-use the shape.
- **A running total that accrues across acts and survives every hard cut.** The
  "running receipt" family is now occupied by this build.
- **The ledger-fill peak**: N dated rows landing one per scroll step with a
  counting total. A second build must find a different way to show repetition.
- **Act band: 8 acts at ~18.7vh.** Also clears the 6-7 acts at 13.6-13.8vh band.
- **Maturity-plate close**: ruled summary plate, CTA as a line item inside it.
- **Hero depth from one flat plate** cut into masked planes rather than true
  alpha cutouts. Available again only if no generation budget exists.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
