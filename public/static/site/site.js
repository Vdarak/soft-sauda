/**
 * Soft Sauda — public site behaviour.
 * Vanilla, no dependencies. Scroll-reveal + nav state via IntersectionObserver.
 * Respects prefers-reduced-motion (CSS already disables transitions there).
 */

// Honor the ERP's saved theme so the landing matches the staff app
// (same localStorage key + data-theme attribute as theme.css). Defaults dark.
try {
  const savedTheme = localStorage.getItem('ss_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
} catch (_) { /* storage blocked — keep the shell's default dark theme */ }

// Staggered scroll reveals.
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        // Slight stagger for elements that enter together.
        setTimeout(() => entry.target.classList.add('in-view'), i * 70);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  // No IO support — show everything.
  revealEls.forEach((el) => el.classList.add('in-view'));
}

// Subtle border on the nav once the user scrolls past the hero top.
const nav = document.querySelector('[data-nav]');
if (nav) {
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}
