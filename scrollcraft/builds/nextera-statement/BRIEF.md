# Nextera, "Statement" build

Build target: the live Next.js app at `frontend/client`, route `/` (the public
landing page). This is not a standalone HTML build, so the scroll-craft engine
is **not** copied in; the engine's mechanism (one rAF-driven scroll progress
variable per act, `transform`/`opacity` only, reduced-motion fallbacks) is
reimplemented as React hooks in `src/components/landing/`. Everything else in
this file is binding.

Interviewed: **yes**, four questions answered by the user on 13 Oct 2026. The
remaining four topics are authored and labelled as such below.

---

## The eight topics

**1. Vibe, three to five words.** *Authored.* Obsidian, exact, lit from behind,
unhurried. References: a bank bond certificate under a desk lamp; the end
credits of a film where the music stops before the cut; the Ramanagara ridge at
blue hour (which is the one photograph we own).

**2. The scroll journey.** *User-decided (structure question): distinct
chapters, hard cuts.* Sequence authored from the existing product copy, in the
order the money itself moves: the promise, what "fixed" means, the year running,
the plans on sale, your own number, how you get in, the terms, maturity.

**3. The energy curve.** *User-decided (motion question): cinematic
throughout.* Every act is scroll-driven. Loudest at act 3, deliberately silent
at act 7.

**4. Feeling, stage by stage, and the one moment.** User picked the moment:
**the money appears as you scroll.** Curve written below.

**5. One thing no other site does.** *Authored from the user's chosen moment.*
The standing order: see signature move.

**6. How far from premium-minimal.** *User-decided (palette question):*
obsidian + ivory + one ember, editorial luxury, money is the only thing that is
ever coloured. Aesthetic family: **dense/editorial**, which uniqueness.md §5
lists as the family finance earns.

**7. One world or distinct scenes.** *User-decided:* distinct chapters, hard
cuts between grounds.

**8. Assets already owned.** One generated dusk-valley plate,
`public/media/nextera-hero-dusk.jpg` (1280x720), currently unused by the page.
No `KIE_AI_API_KEY` is configured on this machine, so **nothing new is
generated**: the single plate is cut into planes with CSS masks, and every other
visual on the page is drawn from type, rules, and real figures. This is a
first-class route, not a fallback, and it is the right one for a brand whose
substance is numbers.

---

## Hard content constraint, above every aesthetic decision

Nextera sells fixed-return investment plans in India. `src/lib/site.ts` carries a
four-paragraph disclaimer; the product is explicitly not a bank deposit, not
DICGC-insured, not government-guaranteed.

- **Every figure on the page is computed**, from `@nextera/contracts`
  (`projectSchedule`, `monthlyReturnPaise`, `formatPaise`) or from live plan
  data. No invented statistics, no trust-badge counts, no "₹X crore disbursed".
- The worked example is labelled an illustration everywhere it appears.
- The disclosures act is not decorated, not animated, and not collapsed behind
  a disclosure widget.

A financial page that looks like a party is a page that looks like a scam.
"Crazy top notch" is delivered as precision and depth, not as spectacle.

---

## Grammar: "Statement" (new)

None of the eight grammars in uniqueness.md §2 fit, and the report says why each
lost. The page is a **financial instrument being issued and then executed**.

- **What a section is:** a stage in one investment's life, in date order. Not a
  topic, not a chapter of prose, not an object in a collection.
- **Navigation:** the **instrument bar**, fixed to the bottom edge, present from
  the hero to the close. Left segment is a dated index of the acts and it jumps.
  Centre is the standing order. Right is the credited-so-far total. One object
  that is simultaneously the chrome, the progress readout, the navigation and the
  running balance. The top header drops to wordmark plus one action.
- **Hero:** the instrument in its setting. Layered plate, headline set between
  the planes, the worked figure already on screen before any scrolling.
- **Close:** the **maturity plate**. Dated, ruled, totalled, and held. The CTA is
  the last line item inside the plate, not a floating button island.
- **Forbids:** invented numbers; `01 / 06` counters (the *dates* are the
  sequence, so dates are allowed and ordinals are not); an eyebrow above every
  heading; scroll cues of any kind; three equal feature-card columns; glass
  panels as the default surface (the current build uses `.glass` on nearly
  everything, which is why it reads cheap); centred copy in more than one act;
  any figure not derived from the same worked example or from live plan data.

## Signature move: the standing order

A fixed hairline bar on the bottom edge, reading as a live payment instruction
rather than as site chrome:

```
13 Oct 2026 · signed      standing order · next credit 13 Nov 2026 · ₹9,000      credited ₹0
```

As act 3 steps through the year under the reader's hand, each credit **fires**
from that bar: the due date advances, the amount pulses in ember, and the
credited total on the right rolls up by exactly one credit, in tabular figures.
It is the same twelve credits the ledger is printing, read out by the
instrument. By the close the bar has executed all twelve, reads
`executed · 12 of 12 · principal returned`, and holds.

It is not a kit device at any parameter. It is not a progress bar: it carries
real dated money, it is the page's navigation, and it is the only element that
survives every hard cut.

## Fingerprint gate

Registry `frontend/scrollcraft/FINGERPRINTS.md` is **empty**; this is the first
build in this workspace, so there is no row to clear. Row appended after
shipping.

---

## The feeling curve

Written before the acts. One line per act: the emotion, then what on screen
causes it.

| # | Act | Feeling | Caused by |
|---|---|---|---|
| 1 | Hero | **Steadied** | A valley at blue hour that separates into planes as you move. One sentence that promises a fixed number, and the number is already there. |
| 2 | What fixed means | **Understood** | Two columns under tension, the divider travelling under your scroll. Locked on the left, moving on the right. |
| 3 | **The year runs** | **Payoff** | Twelve dated credits land one at a time, paced by your hand, the total climbing in real figures, the principal returning last. |
| 4 | Live plans | **Agency** | The plans travel sideways past you. Rate, tenure, minimum. You choose. |
| 5 | Your number | **In control** | The page stops performing and answers. You type an amount and every figure follows it. |
| 6 | Getting in | **Reassured** | Four steps arriving in order, unhurried, with what we ask you for stated plainly. |
| 7 | Terms | **Sobered, respected** | Hard cut to paper. Black type on ivory, no motion at all. This is the authored silence. |
| 8 | Maturity | **Resolved** | The plate totals the year, dates the return, and holds. One action inside it. |

No two adjacent acts carry the same feeling. Act 7 is **authored silence**, not
dead scroll: the only act with no scroll-driven motion, placed immediately
before the close so the ending lands against stillness.

## The peak

Act 3, "The year runs". Largest span on the page by a clear margin (5.5
viewport-heights against 2.2–2.8 for every other act). Act 2 is quieter than it
is. The whole asset budget that exists (the schedule computation, the rolling
figures, the instrument firing) is spent here.

The sentence a visitor would say to a friend:

> "It's the site where you scroll and watch twelve months of money actually
> arrive, dated, one at a time."

## The tell-someone sentence

It's the site where **the money arrives while you read, on real dates, and the
bar at the bottom keeps the running total all the way to maturity.**

---

## The score

| Beat | Act | Device family | Span | Why this one |
|---|---|---|---|---|
| Recognition | Hero | `parallax` (4 planes, type between planes) | 2.2vh | Depth moving under the reader's own hand is the strongest open available without video, and we own exactly one plate to cut. |
| Comprehension | What fixed means | `split` (divider driven by `--p`) | 2.6vh | The product's real tension is two balances. A divider that moves *is* the argument, not an illustration of it. |
| Payoff | **The year runs** | `pin` + `step` + `count` | **5.5vh** | The only honest way to show "twelve times" is twelve times, paced by the hand. Pinning holds the frame so the only thing changing is the money. |
| Range | Live plans | `pan` (lateral rail) | 2.6vh | Lateral travel reads as "options". Vertical reads as "argument", and the argument is already over. |
| Control | Your number | live surface, pointer-driven | ~1.8vh | After watching, they type. The page answers instead of performing. |
| Process | Getting in | `reveal` + `step` | 2.8vh | A sequence that arrives in order, because the order is the information. |
| Terms | Disclosures | hard cut to inverted ground, no motion | ~1.4vh | Authored silence. Paper means "read this". |
| Resolve | Maturity | `pin` + hold | 1.8vh | The last screen settles and stays; it does not fade into a footer. |

Checks: eight device families, none repeated adjacently, zero `scrub` acts (no
video on the page at all), total ≈ 20.7 viewport-heights across 8 acts, which is
outside the 6–7 acts at 13.6–13.8vh band flagged in SKILL.md. Act 3 holds the
largest span by 2.7vh over the next longest.

## Palette

User-chosen. Implemented by **retuning the existing design tokens in
`globals.css`, not renaming them**, so the entire portal (105 `gold` usages, 242
`parchment`, 143 `dust`) re-skins with the landing page and nothing breaks.

| Role | Token | Value | Note |
|---|---|---|---|
| Canvas | `--color-inkwell` | `#08090B` | Off-black, never `#000` |
| Surface | `--color-horizon` | `#101216` | One raised step |
| Ink | `--color-parchment` | `#F2EFE9` | Warm ivory |
| Ink soft | `--color-dust` | `#8A8781` | Tinted, not flat grey |
| Accent / money | `--color-gold` | `#FF7A2F` | Ember. Money and primary action only. Token name kept to avoid a 105-site rename. |
| Accent ink | `--color-ink` | `#1A0A02` | Text on ember |
| Cool meta | `--color-lagoon` | `#8AA6C2` | Links, labels, focus ring |
| Success | `--color-moss` | `#5FA882` | Credits in the portal |
| Danger | `--color-ember` | `#E4584F` | Form errors in the portal. Distinct hue from the accent. |

Light ground for act 7 only, with `color` restated on the subtree (taste.md,
Colour) so inherited ink actually inverts.

---

## The feel check (after build, scrolled cold)

One word per act, written before re-reading the curve above, then diffed.

| # | Act | Intended | Felt | Verdict |
|---|---|---|---|---|
| 1 | Hero | Steadied | Steadied, then sombre | Close. The crest rise reads as night closing in rather than as a ridge passing; kept, because it hands off into a dark act. |
| 2 | Balances | Understood | Understood | Match. The travelling divider carries it. |
| 3 | **The year runs** | **Payoff** | **Payoff** | Match, and clearly the largest moment on the page. |
| 4 | Live plans | Agency | Agency | Match with live plans stubbed in. Not assessable against the real backend from this machine. |
| 5 | Your number | In control | In control | Match. |
| 6 | Getting in | Reassured | Reassured (desktop), informational (phone) | Diff. On a phone the act stacks instead of stepping, so the pacing that creates the reassurance is gone. Accepted: content integrity beat motion. |
| 7 | Terms | Sobered, respected | Sobered, respected | Match, and the second strongest moment on the page. |
| 8 | Maturity | Resolved | Resolved | Match. |

### What the first pass got wrong, and what changed

1. **The hero felt obscured, not deep.** The CTA was trapped inside a `z-10`
   stacking context under the plane layer, so the primary action rendered dimmed
   and unreachable, and the ridge covered the headline before any scrolling
   happened. Rebuilt the layer order (ground planes, scrim, copy, crest, second
   beat) and moved the occlusion into the back half of the act.
2. **The split act clipped its own copy.** The travelling boundary crossed both
   columns' text. Narrowed the travel to 56%-44% and pulled both columns inside
   it, so the scroll now changes the balance of ground rather than cutting words.
3. **Pending credits were decorative, not legible.** Rows rested at 0.18 opacity,
   roughly 1.3:1. Raised to 0.62 and moved the landing signal onto colour and a
   row tint, so nothing on the page sits under the contrast floor.
4. **The peak did not fit a phone.** Rows 10-12 and the maturity row fell outside
   the pinned viewport. The ledger now advances under the landing credits, so the
   twelfth credit and the principal return are reached at 360x640 and above.
5. **Reduced motion was broken in four places**: acts kept their pinned heights
   (1452px of dead scroll), the hero copy computed to zero opacity, the plan rail
   sat frozen at its end position, and three of four process steps were hidden.
   All fixed; the page now collapses from 16865px to 9132px with no dead scroll.

## Verified

- Desktop 1440x900, mobile 390x844 and 360x640, reduced-motion 1440x900. No dead
  scroll between sampled frames in any pass.
- Contrast measured on the composited render at twelve points, including text
  over the photograph and the inverted paper act. Worst was 5.19:1. All pass.
- Tab order walked: 20 stops, every one with a visible 2px focus ring.
- `tsc --noEmit` clean, `eslint --max-warnings=0` clean, 395 unit tests pass,
  `next build` exits 0.

## Not verified

- **A real phone.** Headless Chrome cannot reproduce iOS Safari's compositing,
  `100svh` behaviour on scroll, or touch inertia against a sticky pin.
- **The live plan rail against the real backend.** No `NEXTERA_BACKEND_URL` on
  this machine, so the rail was verified against stubbed plans and the public
  page currently renders the "plans unavailable" notice instead.
- Light/dark forced-colours mode, and screen-reader output beyond tab order.

---

## Scroll performance pass (14 Oct 2026)

Reported as "animations are not that smooth, it feels like it is hanging".

### Measured, same harness and 4x CPU throttle, full-page scripted scroll

| | dev before | dev after | prod before | prod after |
|---|---|---|---|---|
| median frame | 6.5ms | **1.2ms** | 1.5ms | **0.9ms** |
| p95 | 28.1ms | **2.6ms** | 10.4ms | **1.7ms** |
| worst | 48.7ms | **3.8ms** | 49.3ms | **3.8ms** |
| frames over 32ms | 11 | **0** | 2 | **0** |
| long tasks | one at 56ms | **none** | none | none |

### What was actually wrong

1. **Six scroll engines instead of one.** Every act registered its own `scroll`
   listener and its own rAF, and each callback read `getBoundingClientRect()`
   and then wrote a custom property. Six read-write pairs interleaved per frame
   is a forced layout per pair. `useScrollVar` is now one shared engine: all
   geometry is read, then all properties are written, and an act whose progress
   has not changed is skipped entirely.
2. **`YearRun` read layout inside the scroll callback** (`offsetHeight`,
   `clientHeight`) to size the ledger shift, which put a forced layout back on
   the scroll path. That geometry is now cached by a `ResizeObserver`, and the
   callback only runs when the landed-credit count actually changes.
3. **`PublicHeader` queued a React render per scroll event** on every public
   page. Now coalesced into a frame and compared before `setState`.
4. **`backdrop-filter` on the instrument bar.** A full-width element fixed to the
   bottom edge for the entire scroll, forcing the compositor to re-snapshot and
   blur the page behind it every frame. The bar was already 96% opaque, so the
   blur was invisible; it is now simply opaque.
5. **`mix-blend-mode: overlay` on the fixed grain layer.** Blending a
   full-viewport fixed layer forces the whole scrolling page to be recomposited.
   Switched to a plain low-opacity overlay.
6. **Oversized hero plane textures.** The crest plane was 192vh tall at
   `scale(1.24)`, roughly a 2000x2140 texture, and the sky plane carried a
   `blur(1px)` that forced its own render surface. Insets, scales and the blur
   were all reduced; the parallax reads the same on screen.
7. **Header blur radius** cut from 24px to 4px with a more opaque ground.

### Regression caught during the fix

Gating the year-run callback on the credit count alone stranded `matured` at
false, because the twelfth credit lands slightly before the maturity threshold.
Both values are now compared. Verified on the instrument bar across the act:
`First credit` → `Credit 04` → `Credit 07` → `Credit 11` → `Executed, 12 of 12,
principal returned`.

### Caveat

Headless Chrome measures main-thread frame pacing, not GPU compositing. Items 4,
5 and 6 are fixes for compositor cost that this harness cannot quantify, so the
table above understates them; they are standard causes of scroll jank rather
than measured wins here. A real device is still the only way to confirm.
