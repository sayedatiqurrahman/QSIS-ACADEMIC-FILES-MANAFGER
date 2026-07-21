let routerCache = {};

function toggleNav() { document.getElementById('navActions')?.classList.toggle('nav-open') }
function toggleTheme() {
  const h = document.documentElement;
  const t = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  h.setAttribute('data-theme', t);
  localStorage.setItem('qsis-theme', t);
  const i = document.querySelector('.theme-toggle i');
  if (i) i.className = t === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}
function loadTheme() {
  const s = localStorage.getItem('qsis-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', s);
  const i = document.querySelector('.theme-toggle i');
  if (i) i.className = s === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function reExecScripts(container) {
  container.querySelectorAll('script').forEach(old => {
    const s = document.createElement('script');
    if (old.src && !document.querySelector(`script[src="${old.src}"]`)) {
      s.src = old.src; s.async = false;
    } else if (old.src) { return }
    else { s.textContent = old.textContent }
    old.parentNode.replaceChild(s, old);
  });
}

function getCurrentPage() {
  return location.pathname.split('/').pop().replace('.html', '') || 'index';
}

function setActiveNav(pageName) {
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = a.getAttribute('href').replace('.html', '');
    a.classList.toggle('active', href === pageName);
  });
}

function navigateTo(url, push) {
  if (!url) return;
  const currentPage = getCurrentPage();
  if (url === currentPage + '.html' || url === location.pathname) return;
  const pageName = url.replace('.html', '');
  const pc = document.getElementById('pageContent');
  if (!pc) return;

  if (routerCache[url]) {
    const tmp = document.createElement('div');
    tmp.innerHTML = routerCache[url];
    const content = tmp.querySelector('#pageContent');
    if (content) {
      pc.innerHTML = content.innerHTML;
      try { reExecScripts(pc); } catch (e) { console.error('reExec error', e); }
      const t = tmp.querySelector('title');
      if (t) document.title = t.textContent;
      if (push !== false) history.pushState({ page: url }, '', url);
      setActiveNav(pageName);
      return;
    }
  }

  pc.innerHTML = '<div class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  fetch(url)
    .then(r => { if (!r.ok) throw Error('HTTP ' + r.status); return r.text() })
    .then(html => {
      routerCache[url] = html;
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const content = tmp.querySelector('#pageContent');
      if (content) {
        pc.innerHTML = content.innerHTML;
        try { reExecScripts(pc); } catch (e) { console.error('reExec error', e); }
        const t = tmp.querySelector('title');
        if (t) document.title = t.textContent;
        if (push !== false) history.pushState({ page: url }, '', url);
        setActiveNav(pageName);
      } else {
        window.location.href = url;
      }
    })
    .catch(() => {
      window.location.href = url;
    });
}

function initRouter() {
  const pc = document.getElementById('pageContent');
  if (pc) routerCache.index = pc.outerHTML;

  document.addEventListener('click', e => {
    const link = e.target.closest('.nav-link');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('?')) return;
    e.preventDefault();
    navigateTo(href);
  });

  window.addEventListener('popstate', e => {
    if (e.state?.page) {
      const pc2 = document.getElementById('pageContent');
      if (pc2) pc2.innerHTML = '<div class="loading-cell"><i class="fas fa-spinner fa-spin"></i></div>';
      navigateTo(e.state.page, false);
    }
  });

  setActiveNav(getCurrentPage());
}

document.addEventListener('DOMContentLoaded', initRouter);
