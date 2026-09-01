# The CurioZoo mascot, moving

The logo is a creature peeking over the wall of its enclosure. Static, that is a
mark. Given a blink and a glance it is something a six year old says hello to,
which is the point of putting an animal on a site about sitting a test.

There are **two halves** to this folder, and picking the wrong one is the only
real mistake you can make here.

| | Standalone files (`*.svg`) | Live mascot (`modules/mascot.js`) |
|---|---|---|
| Animated by | SMIL, inside the file | CSS keyframes in `design-system.css` |
| Needs | nothing | the stylesheet and the module |
| Works in `<img>` | yes | no |
| Obeys reduced motion | **no** | yes |
| Reacts to the app | no | yes, moods |
| Use for | splash screens, app icons, README, app store, e-mail | anything inside the site or the app |

**Anywhere a child sees it, use the live mascot.** SMIL cannot read
`prefers-reduced-motion`, so a standalone file keeps moving for a child who has
asked the operating system for less movement. The standalone files exist for the
places CSS cannot reach: a native launch image, a store listing, a Markdown file.

## The standalone files

| File | What it does | Loops |
|---|---|---|
| `mascot-blink.svg` | Breathes, blinks twice, smile deepens once. The quiet default; legible to about 20px. 4.2s. | yes |
| `mascot-curious.svg` | Looks around, tilts, twitches its ears, smile comes and goes. 6.4s. | yes |
| `mascot-peek.svg` | Rises from behind the bar, looks about, ducks back down. Its smile arrives with it. 6s. | yes |
| `mascot-cheer.svg` | Crouches, hops, arc eyes, mouth wide open, three sparkles. 2.6s. | yes |
| `mascot-think.svg` | Eyes up, ears down, mouth flat, three counting dots. Use instead of a spinner. 3s. | yes |
| `mascot-sleep.svg` | Dozes, breathing slowly, three drifting z. 4s. | yes |
| `curiozoo-logo-intro.svg` | The wordmark draws itself, the two o of Zoo open as eyes, the mascot peeks up. **Plays once and freezes**, then only the eyes move. | no |

All seven are drawn on the same 64 grid as `../curiozoo-mark.svg`, except the
intro, which is the full lockup at 452x104.

Colours are `var(--gp-accent, #BA5828)` and friends. Inlined into a page they
take the theme; loaded as `<img>` they fall back to the light-mode brand colours,
which are legible on a dark page too because the wall is orange and the eyes are
white.

## The live mascot

```js
import { mascot, setMood, hydrateMascots } from './modules/mascot.js';
```

Place one in HTML with no JavaScript at the call site, the way `data-icon`
works. `hydrateMascots()` runs once at boot:

```html
<span class="gp-brand__mark" data-mascot="idle" aria-hidden="true"></span>
<span data-mascot="curious" data-mascot-kind="fox"></span>
```

Or build the markup directly, and drive it:

```js
el.innerHTML = mascot({ mood: 'idle', kind: 'owl' });
setMood(el, 'happy', 1800);   // hop, then go back to resting
```

### Moods

| Mood | What it does | Where it is used |
|---|---|---|
| `idle` | breath, blink, eyes wander, one ear flicks | the top bar |
| `curious` | looks around, twitches, tilts | the welcome panel; the brand on hover; a room card on hover |
| `happy` | three hops, arc eyes, wide smile, sparkles | after a right answer, in every game |
| `oops` | ducks behind the bar, looks down, small frown | after a wrong one |
| `think` | eyes up, ears down, flat mouth, counting dots | instead of a spinner |
| `sleep` | shut eyes, slow breath, drifting z | the page left alone for 40 seconds |
| `wink` | one arc eye, a nod, a wider smile | a run of three right answers; the theme toggle |
| `wow` | eyes wide, ears up, a round open mouth | a surprise |

### The mouth

The bar under the eyes carries a seam along its centre line. Every expression
is that one path scaled vertically about its own end points, so the corners
stay pinned and only the curve between them deepens, flattens, or inverts into
a frown. One path, eight faces, and the logo's silhouette never moves — which
is what stops an expressive mascot from becoming an unstable logo.

```
idle 1 · curious 0.85 · happy 2.1 · oops -0.75 · think 0.2 · sleep 1 · wink 1.75
```

`wow` is the one face the seam cannot make, so it has a second element: a
round dark ellipse that cross-fades in while the seam fades out.

### Why idle is not a still state

The breath, the blink, the glance and the ear flick run at 4.3s, 4.3s, 9.1s
and 7.7s. Nothing lines up, so the combination takes about five minutes to
repeat and the mascot reads as alive rather than as a loop. Put them all on one
period and the eye finds the seam within seconds.

`oops` ducks, looks away, and turns the smile down by three quarters. It is
never a sad face: the panel underneath already says *here is why*, and a
disappointed animal on top of that reads to a child as a telling-off. That is
why the frown is small and the duck is not.

### Recolouring

The CSP drops `style` attributes, so a mascot cannot be recoloured at the point
of use. A container sets three variables in the stylesheet instead:

```css
.cz-welcome__pet {
  --cz-mascot-tone:  var(--cz-on-deep-accent);
  --cz-mascot-inner: var(--cz-deep);
  --cz-mascot-paper: var(--cz-deep);
}
```

### Ears

`kind` is any creature from `modules/sections.js`: `bear`, `rabbit`, `owl`,
`fox`, `cat`, `mouse`, `giraffe`, `frog`, and `logo`, which is the plain round
pair on the sign. The geometry is imported, not copied, so the animated mascot
and the eight static room creatures cannot drift apart.

## Two rules that are not negotiable

1. **Nothing flashes, buzzes or shakes.** The design system's first promise is
   to a nervous seven year old days away from a real test, and it is not
   suspended because the thing moving is cute. It moves often; it never moves
   fast. Rotations stay under twenty degrees, the hop is eight units, and the
   only quick thing in the set is a blink, which is quick in life too.
2. **Dark ink only ever goes on the white eye disc.** The disc is the one part
   of this mascot that is white in every theme and on every background. The
   first version of the happy face replaced the whole eye with a bold dark arc.
   It was far more readable, and completely invisible in dark mode and on the
   Deep welcome panel.

## Looking at it

`assets/img/logo/anim/gallery.html` shows every animation, every mood at every
size it ships at, and all nine creatures, on one page. Nothing links to it and
it carries `robots: noindex`; it is a workbench, not a page of the site.

```bash
npm run serve
```

then open `http://localhost:8765/assets/img/logo/anim/gallery.html`.

## Checking it

```bash
npm run animcheck
```

Animation is the one asset here that fails silently: a `keyTimes` list one entry
longer than its `values` list is dropped by the browser with no console message,
and looks exactly like an animation that has not started. `tools/animcheck.mjs`
checks the timing lists, that the files are well-formed XML, that no file paints
dark ink with no eye disc under it, and that the module and the stylesheet still
agree about class names. It runs inside `npm run verify`, so it also runs on
every deploy.
