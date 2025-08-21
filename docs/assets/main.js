(function(){
  // Force dark mode by default and clear any saved preference
  document.documentElement.setAttribute('data-bs-theme', 'dark');
  try { localStorage.removeItem('theme'); } catch (e) {}

  // Search filter (client-side)
  async function initSearch(){
    const input = document.getElementById('searchInput');
    if(!input) return;

    let fuse = null;

    function render(filter){
      const items = document.querySelectorAll('#navAccordion .nav-item');
      // Reset all items visible
      items.forEach(el => el.classList.remove('d-none'));

      // When no filter, also reset accordion state (collapse all)
      const accordions = document.querySelectorAll('#navAccordion .accordion-item');
      if(!filter){
        accordions.forEach(acc => {
          const btn = acc.querySelector('.accordion-button');
          const collapse = acc.querySelector('.accordion-collapse');
          btn && btn.classList.add('collapsed');
          if(collapse){
            collapse.classList.remove('show');
            collapse.setAttribute('aria-expanded','false');
          }
        });
        return;
      }

      let matchedPaths = null;
      if(fuse){
        try {
          matchedPaths = new Set(fuse.search(filter).map(r => `${r.item.groupSlug}/${r.item.slug}`));
        } catch (_) { /* noop */ }
      }

      const q = filter.toLowerCase();
      items.forEach(el => {
        const link = el.querySelector('a');
        const path = link.getAttribute('href').replace(/^\//,'').replace(/\/$/,'');
        let visible = true;
        if(matchedPaths){
          visible = matchedPaths.has(path);
        } else {
          const name = (el.getAttribute('data-name') || '').toLowerCase();
          const quals = (el.getAttribute('data-qualities') || '').toLowerCase();
          visible = name.includes(q) || quals.includes(q);
        }
        if(!visible) el.classList.add('d-none');
      });

      // Expand groups that have visible matches; collapse the rest
      accordions.forEach(acc => {
        const btn = acc.querySelector('.accordion-button');
        const collapse = acc.querySelector('.accordion-collapse');
        const hasVisible = acc.querySelectorAll('.nav-item:not(.d-none)').length > 0;
        if(hasVisible){
          btn && btn.classList.remove('collapsed');
          if(collapse){
            collapse.classList.add('show');
            collapse.setAttribute('aria-expanded','true');
          }
        } else {
          btn && btn.classList.add('collapsed');
          if(collapse){
            collapse.classList.remove('show');
            collapse.setAttribute('aria-expanded','false');
          }
        }
      });
    }

    // Attach listener regardless of index load success
    input.addEventListener('input', (e)=> render(e.target.value.trim()));

    // Load search index in the background (best-effort)
    try {
      const res = await fetch('search.json');
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      fuse = new Fuse(data.items, { keys: ['name','qualities','group'], threshold: 0.4 });
    } catch (err) {
      console.error('Search index failed to load (fallback to simple filter):', err);
    }
  }
  initSearch();
})();
