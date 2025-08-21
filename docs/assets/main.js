(function(){
  // Force dark mode by default and clear any saved preference
  document.documentElement.setAttribute('data-bs-theme', 'dark');
  try { localStorage.removeItem('theme'); } catch (e) {}

  // Search filter (client-side)
  async function initSearch(){
    const input = document.getElementById('searchInput');
    if(!input) return;
    let data;
    try {
      const res = await fetch('search.json');
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      console.error('Search index failed to load:', err);
      return;
    }
    const fuse = new Fuse(data.items, { keys: ['name','qualities','group'], threshold: 0.4 });

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

      const results = fuse.search(filter).map(r => `${r.item.groupSlug}/${r.item.slug}`);
      items.forEach(el => {
        const link = el.querySelector('a');
        const path = link.getAttribute('href').replace(/^\//,'').replace(/\/$/,'');
        if(!results.includes(path)) el.classList.add('d-none');
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

    input.addEventListener('input', (e)=> render(e.target.value.trim()))
  }
  initSearch();
})();
