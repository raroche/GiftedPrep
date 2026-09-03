# Taking this to a phone

Notes, not code. Nothing here has been built. Every claim below was checked
against the repository as it stands, and the line references are real.

The short version: the Chess Club needs no porting. It is static files, one
worker, and one JSON object of progress. The work is in the wrapper, and most
of it is one file.

---

## What already works, and why

**No build step, no bundler, no server.** The repository root is the site.
A wrapper that serves the folder serves the app. There is nothing to compile
and no output directory to point at.

**Every path is relative.** There is not one absolute `/assets` or `/data`
reference in the app. Data is fetched as `data/chess/level1.json`, the bot
worker as `assets/js/workers/chessbot.worker.js`
(`assets/js/modules/chessbot.js:503`), and `index.html` links the manifest as
`manifest.webmanifest`. This is what lets the same files work at a domain
root, in a subfolder, and inside a native wrapper without a rewrite.

**The bot is a module worker**, not WASM:

```js
worker = new Worker(url, { type: 'module' });   // chessbot.js:512
```

WKWebView on iOS 16.4+ and Android WebView both support module workers. There
is no `SharedArrayBuffer` and no WASM, so **no COOP or COEP headers are
needed** — which matters, because those headers are exactly the sort of thing
a native wrapper cannot send.

If the worker cannot start, `botClient` falls back to running the search on
the main thread (`chessbot.js:508-509`). The app still plays; it just stutters
while the bot thinks. So a wrapper that blocks workers degrades rather than
breaks.

**The whole room is small.** `data/chess` is 572KB and the vendored chess.js
is 108KB. Precaching all of it is not a decision anyone needs to agonise over.

**Progress is one JSON object** under the single key `giftedprep.v1`
(`assets/js/modules/storage.js:14`), and `storage.js` already survives
localStorage throwing, which a locked-down school iPad does.

**Touch targets are already sized.** A square has a 44px floor and the board
has a 352px floor (`design-system.css:3444`), which is 8 × 44. Phase 8 checked
every chess route at 375px and at 768px.

---

## What has to be decided

### 1. The Content-Security-Policy does not travel

This is the one real gap, and it is easy to miss.

The policy is not in `index.html`. It is sent as an HTTP header, from
`netlify.toml` in production and from `tools/serve.py` locally. **A native
wrapper serves the files itself, so it sends neither.** The app would run in
the mobile app with no policy at all.

That is not only a security question. The app is *written around* the policy:
`style="..."` attributes are silently discarded under `style-src 'self'`, so
nothing in the app sets one, and `tools/chesscheck.mjs` fails the build if the
chess board or the piece set ever does. On a wrapper with no policy those
attributes would suddenly work — which sounds harmless and is not, because it
means the mobile app and the website would start behaving differently and the
checks would go on passing.

Two ways to close it, and they are not exclusive:

- Add a `<meta http-equiv="Content-Security-Policy">` to `index.html`. It
  travels with the file, so it covers every host. A meta policy cannot express
  `frame-ancestors`, which is header-only, so the header stays for the web.
- Set the policy in the wrapper's own configuration (Capacitor's
  `server.androidScheme` and an `WKWebView` policy, or the Android
  `WebViewAssetLoader`).

`tools/cspcheck.mjs` now compares the two existing copies directive by
directive and fails the build if they drift. **Add any third copy to
`SOURCES` in that file** so it is held to the same policy as the other two.

### 2. `file://` will not work; a localhost scheme will

ES modules, module workers and `fetch` are all blocked or origin-less under
`file://`. Capacitor does not use it — it serves from `capacitor://localhost`
on iOS and `https://localhost` on Android — and that is fine. But a
"just open index.html in the WebView" shortcut is not.

### 3. Offline

There is no service worker in the repository today; `manifest.webmanifest`
exists and is linked, but nothing precaches.

Note the deliberate caching rule in `netlify.toml`: **no filename carries a
content hash**, so everything is served `no-cache, must-revalidate`. The
comment there records a real bug — a fresh `index.html` paired with stale CSS
and JS, so a button rendered with no rule to place it and no handler to run
it. Any service worker must not undo that. The safe shape is
network-first for `index.html` and the app's own assets, cache-first only for
`data/chess/**`, which is append-only content that never has to match a
particular version of the code.

### 4. Sync, if it ever happens

Progress has no personal data in it. Merging two devices is `max` of each
lesson's stars, union of the day list, `max` of the star total, and the
puzzle rating recomputed rather than merged. Stars never decrease
(`chessprogress.js`, `setStars`), so `max` is the correct merge and not just a
convenient one.

---

## What to check on a real device

The simulator will not catch these.

- **Drag on a real finger.** The board handles pointer events, and iOS
  Safari's rubber-band scroll competes with a drag that starts on a square.
- **The worker's first move.** Cold start on a mid-range Android is the
  slowest thing in the room. `chessbot.js` deepens a ply at a time and keeps
  the last ply that finished inside its time budget, so a slow phone gets a
  weaker move rather than a hang — but confirm the budget is honoured.
- **localStorage under "prevent cross-site tracking"** and in a school MDM
  profile. `storage.js` handles it throwing; make sure the app still says
  something sensible rather than losing progress silently.
- **Rotation.** `manifest.webmanifest` says `"orientation": "any"`. A board
  at 352px minimum in landscape on a small phone is the case to look at.
