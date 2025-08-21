(function(){
  // Dark mode toggle
  const btn = document.getElementById('themeToggle');
  const root = document.documentElement;
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-bs-theme', saved);
  btn && btn.addEventListener('click', ()=>{
    const current = document.documentElement.getAttribute('data-bs-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', next);
    localStorage.setItem('theme', next);
  });

  // Search filter (client-side)
  async function initSearch(){
    const input = document.getElementById('searchInput');
    if(!input) return;
    const res = await fetch('search.json');
    const data = await res.json();
    const fuse = new Fuse(data.items, { keys: ['name','qualities','group'], threshold: 0.4 });

    function render(filter){
      const items = document.querySelectorAll('#navAccordion .nav-item');
      items.forEach(el => el.classList.remove('d-none'));
      if(!filter){ return; }
      const results = fuse.search(filter).map(r => `${r.item.groupSlug}/${r.item.slug}`);
      items.forEach(el => {
        const link = el.querySelector('a');
        const path = link.getAttribute('href').replace(/^\//,'').replace(/\/$/,'');
        if(!results.includes(path)) el.classList.add('d-none');
      });
    }

    input.addEventListener('input', (e)=> render(e.target.value.trim()));
  }
  initSearch();
})();
