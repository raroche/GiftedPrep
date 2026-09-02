/**
 * Play every game, in a real browser, and check a person could use it.
 *
 * Paste it; do not fetch and eval it. The site ships script-src 'self' with no
 * unsafe-eval, so eval() of a fetched file is refused by the page's own policy.
 *
 * Run in the page console, or via the browser pane. It exists because the
 * checks that run in node cannot catch the two failures that have actually
 * reached production:
 *
 *   A blank screen. showScreen() with an unregistered name hid everything and
 *   showed nothing, while the markup rendered and the console stayed clean.
 *   Nothing threw. It only looked broken to a person.
 *
 *   A dead handler. answerFlag() referenced a variable belonging to another
 *   function, so it threw halfway through and the "next" button was never
 *   added. The game scored the answer and then stranded you.
 *
 * So this measures pixels and interaction, not DOM presence: is exactly one
 * screen visible, can the question be answered, does feedback appear, and is
 * there a way onward. A regex scope-checker was tried instead and abandoned --
 * it produced 115KB of false positives from prose inside template literals.
 */
(async () => {
  const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms));
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.message)));

  const results = [];
  const check = (name, ok, detail = '') => results.push({ name, ok, detail });

  const GAMES = [
    { id: 'flags', setupScreen: 'screen-flagsetup',    start: '[data-action="flag-start"]',  answer: '[data-flagpick]',
      screen: '#screen-flaggame', next: '[data-action="flag-next"]', setup: [] },
    { id: 'shapes', setupScreen: 'screen-shapesetup',   start: '[data-action="shape-start"]', answer: '[data-shapeanswer]',
      screen: '#screen-shapegame', next: '[data-action="shape-next"]', setup: [] },
    { id: 'capitals', setupScreen: 'screen-capsetup', start: '[data-action="cap-start"]',   answer: '[data-capanswer]',
      screen: '#screen-capgame',  next: '[data-action="cap-next"]',  setup: [] },
    { id: 'elements', setupScreen: 'screen-elemsetup', start: '[data-action="elem-start"]',  answer: '[data-elemanswer]',
      screen: '#screen-elemgame', next: '[data-action="elem-next"]',
      setup: ['[data-elemask="use"]'] },
    /* Every kind of angle question gets its own pass. They share a game loop
       but not a picture, and "bigger" is the only one where the choices ARE the
       figures -- which is exactly the sort of difference that renders nothing
       and throws nothing. */
    ...['estimate', 'bigger', 'sort', 'clock', 'world', 'bounce'].map((ask) => ({
      id: 'angles', label: `angles/${ask}`, setupScreen: 'screen-angsetup',
      start: '[data-action="ang-start"]', answer: '[data-anganswer]',
      screen: '#screen-anggame', next: '[data-action="ang-next"]',
      setup: [`[data-angask="${ask}"]`]
    }))
  ];

  for (const g of GAMES) {
    const name = g.label || g.id;
    location.hash = `#/fun/${g.id}`;
    await wait(1300);
    const shown = [...document.querySelectorAll('.gp-screen')].filter(vis).map((s) => s.id);
    check(`${name}: setup is visible`, shown.length === 1, shown.join(',') || 'nothing visible');

    for (const sel of g.setup) {
      const b = document.querySelector(sel);
      if (b) { b.click(); await wait(300); }
    }
    /* The two things a page offers must both be reachable, and the looking one
       must be visible rather than a link buried under the form. */
    const learnGo = document.querySelector(`#${g.setupScreen} .cz-mode--learn .cz-mode__go`);
    check(`${name}: learn button is visible`, !!learnGo && vis(learnGo));

    const startBtn = document.querySelector(g.start);
    check(`${name}: has a start button`, !!startBtn);
    if (!startBtn) continue;
    startBtn.click();
    await wait(1400);

    check(`${name}: the game screen is visible`, vis(document.querySelector(g.screen)));
    const pick = document.querySelector(g.answer);
    check(`${name}: the question can be answered`, !!pick);
    if (!pick) continue;

    pick.click();
    await wait(800);
    check(`${name}: feedback appears`, !!document.querySelector('.gp-flagq__say'),
      document.querySelector('.gp-flagq__say')?.textContent?.slice(0, 50) || 'none');
    check(`${name}: there is a way to the next question`, !!document.querySelector(g.next));

    const nextBtn = document.querySelector(g.next);
    if (nextBtn) {
      nextBtn.click();
      await wait(900);
      check(`${name}: next actually advances`, vis(document.querySelector(g.screen)));
    }

    /* The browsing mode is a page a child can land on directly, so it gets the
       same visibility check the games do. */
    location.hash = `#/fun/${g.id}/learn`;
    await wait(1600);
    const seen = [...document.querySelectorAll('.gp-screen')].filter(vis).map((s) => s.id);
    check(`${name}: learn mode is visible`, seen.length === 1, seen.join(',') || 'nothing visible');
  }

  /* Every page below home offers a way back, it says where it goes, and it is
     the first thing in the body rather than an arrow beside the logo. Both
     bugs this guards against were invisible to node: the link painted into the
     screen the router was leaving, so nothing appeared; and a listener left
     bound to the removed top-bar button threw during boot and the whole site
     came up blank. */
  const BACK = [
    ['#/home', null],
    ['#/gifted', '#/home'],
    ['#/tests', '#/gifted'],
    ['#/parents', '#/gifted'],
    ['#/math', '#/home'],
    ['#/math/1', '#/math'],
    ['#/math/1/four-colours', '#/math/1'],
    ['#/fun', '#/home'],
    ['#/fun/flags', '#/fun'],
    ['#/fun/elements', '#/fun'],
    ['#/fun/flags/learn', '#/fun/flags']
  ];
  for (const [hash, want] of BACK) {
    location.hash = hash;
    await wait(1200);
    const screen = document.querySelector('.gp-screen.is-active');
    const backs = [...(screen ? screen.querySelectorAll('.gp-backlink') : [])].filter(vis);
    if (want === null) {
      check(`${hash}: home offers no way back`, backs.length === 0,
        backs.map((b) => b.textContent.trim()).join(','));
      continue;
    }
    check(`${hash}: has exactly one back control`, backs.length === 1,
      `${backs.length} found`);
    if (backs.length !== 1) continue;
    check(`${hash}: back goes to ${want}`, backs[0].getAttribute('href') === want,
      backs[0].getAttribute('href') || 'no href');
    check(`${hash}: back says where it goes`, backs[0].textContent.trim().length > 2,
      backs[0].textContent.trim());
    /* Top of the body, not the top bar: above the title and left-aligned. */
    const title = screen.querySelector('h1');
    const box = backs[0].getBoundingClientRect();
    check(`${hash}: back sits above the title`,
      !title || box.bottom <= title.getBoundingClientRect().top);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  failed.forEach((r) => console.log(`  FAIL  ${r.name}  ${r.detail}`));
  if (errors.length) console.log(`  page errors: ${errors.join(' | ')}`);
  return { passed: results.length - failed.length, total: results.length,
    failed: failed.map((r) => r.name), errors };
})()
