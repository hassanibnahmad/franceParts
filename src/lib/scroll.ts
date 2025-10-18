export function initScrollReveal(options?: IntersectionObserverInit) {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.05,
  };

  const opts = { ...defaultOptions, ...(options || {}) };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target as HTMLElement;
      if (entry.isIntersecting) {
        el.classList.add('is-visible');
        // Optionally unobserve to reveal once
        observer.unobserve(el);
      }
    });
  }, opts);

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  return observer;
}
