() => {
  // In-page UI audit. ONE function expression with no imports: sweep.ts evaluates it on every page it visits.
  // Returns { url, viewport, touch, issues[] }. Every issue is a lead to check by eye, never a verdict.
  const MAX = 120;
  // A phone zooms out to fit content that overflows, which widens innerWidth: the screen is the real width.
  const vw = Math.min(window.innerWidth, screen.width || window.innerWidth);
  const touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const issues = [];

  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const path = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && parts.length < 4; n = n.parentElement) {
      if (n.id) { parts.unshift(`#${n.id}`); break; }
      parts.unshift(n.tagName.toLowerCase() + (n.classList[0] ? `.${n.classList[0]}` : ''));
    }
    return parts.join(' > ');
  };
  const name = (el) => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.getAttribute('alt') || el.getAttribute('placeholder') || el.value || '').trim().slice(0, 60);
  const add = (type, severity, el, detail) => {
    if (issues.length >= MAX) return;
    const r = el ? el.getBoundingClientRect() : null;
    issues.push({ type, severity, selector: el ? path(el) : null, text: el ? name(el) : null,
      rect: r ? { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) } : null, detail });
  };

  // 1. The page scrolls sideways.
  if (document.documentElement.scrollWidth > vw + 1) add('horizontal-scroll', 'high', null, `page is ${document.documentElement.scrollWidth}px wide in a ${vw}px viewport`);

  const all = [...document.querySelectorAll('body *')].filter(visible);
  const interactive = all.filter((el) => el.matches('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=checkbox], [role=tab], [tabindex]:not([tabindex="-1"])'));

  for (const el of all) {
    const r = el.getBoundingClientRect();
    // 2. Runs off the right edge, or touches the screen edge on a phone (no 16px gutter).
    if (r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') add('off-screen', 'medium', el, `right edge at ${Math.round(r.right)}px`);
    // 3. Text cut off without an ellipsis.
    const s = getComputedStyle(el);
    if (el.children.length === 0 && el.textContent.trim() && (s.overflow === 'hidden' || s.overflowX === 'hidden')
        && el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== 'ellipsis' && !s.webkitLineClamp) {
      add('clipped-text', 'medium', el, `content ${el.scrollWidth}px in a ${el.clientWidth}px box`);
    }
  }

  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    // 4. Touch targets under WCAG 2.2 AA's 24x24 (44x44 recommended).
    if (touch && (r.width < 24 || r.height < 24) && !el.matches('a:not([class])')) add('small-touch-target', 'medium', el, `${Math.round(r.width)}x${Math.round(r.height)}px`);
    // 5. No accessible name.
    if (!name(el) && !el.getAttribute('aria-labelledby') && !(el.labels && el.labels.length)) add('no-accessible-name', 'high', el, 'interactive element with no name');
    // 6. iOS zooms into inputs under 16px.
    if (touch && el.matches('input, select, textarea') && parseFloat(getComputedStyle(el).fontSize) < 16) add('ios-input-zoom', 'low', el, `font-size ${getComputedStyle(el).fontSize}`);
  }

  // 7. Images without alt text, or upscaled.
  for (const img of document.querySelectorAll('img')) {
    if (!visible(img)) continue;
    if (!img.hasAttribute('alt')) add('img-no-alt', 'medium', img, img.currentSrc.slice(-60));
    const r = img.getBoundingClientRect();
    if (img.naturalWidth && r.width * devicePixelRatio > img.naturalWidth * 1.5) add('img-upscaled', 'low', img, `${img.naturalWidth}px shown at ${Math.round(r.width * devicePixelRatio)}px`);
  }

  // 8. Fixed or sticky elements covering more than a third of a phone screen.
  for (const el of all) {
    const p = getComputedStyle(el).position;
    if ((p === 'fixed' || p === 'sticky') && vw < 768) {
      const r = el.getBoundingClientRect();
      if (r.height > innerHeight / 3 && r.width > vw / 2) add('large-fixed', 'medium', el, `${Math.round(r.height)}px tall ${p} element`);
    }
  }

  return { url: location.href, viewport: { width: vw, height: innerHeight }, touch, issues };
}
