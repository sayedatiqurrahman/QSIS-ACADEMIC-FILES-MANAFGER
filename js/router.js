const Router = {
  routes: {},
  current: null,
  defaultRoute: '/',

  register(hash, view) {
    this.routes[hash] = view;
  },

  go(hash) {
    window.location.hash = hash;
  },

  getCurrentHash() {
    return window.location.hash.slice(1) || this.defaultRoute;
  },

  async handleRoute() {
    const hash = this.getCurrentHash();

    if (hash.startsWith('/callback')) {
      const ok = await AUTH.handleCallback();
      if (ok) {
        showToast('Logged in successfully!', 'success');
        this.go('/');
        setTimeout(function() { AUTH.showAuthModal(); updateAuthUI(); }, 400);
      } else {
        showToast('Login failed. Try again.', 'error');
        this.go('/');
      }
      return;
    }

    if (this.current?.destroy) {
      try { this.current.destroy(); } catch(e) {}
    }

    const view = this.routes[hash] || this.routes[this.defaultRoute];
    if (!view) {
      document.getElementById('app-main').innerHTML = `
        <div class="empty-state" style="padding:80px 20px">
          <i class="fas fa-question-circle"></i>
          <p>Page not found</p>
          <a href="#/" class="btn btn-glow btn-sm" style="margin-top:12px"><i class="fas fa-home"></i> Go Home</a>
        </div>`;
      return;
    }

    const main = document.getElementById('app-main');
    if (view.render) {
      main.innerHTML = view.render();
    }

    this.current = view;
    if (view.init) {
      try { await view.init(); } catch(e) { console.error('View init error:', e); }
    }

    this.updateNav(hash);
    this.updateSubtitle(hash);
    window.scrollTo(0, 0);
  },

  updateNav(path) {
    document.querySelectorAll('.nav-link[data-route]').forEach(link => {
      const route = link.dataset.route;
      link.classList.toggle('nav-active', path === route || (path === '/' && route === '/'));
    });
  },

  updateSubtitle(path) {
    const sub = document.querySelector('.nav-subtitle');
    if (!sub) return;
    const titles = {
      '/': 'Academic Resource System',
      '/contributors': 'Contributors',
      '/routine': 'Routine Manager',
      '/history': 'Read History',
      '/downloads': 'Downloads'
    };
    sub.textContent = titles[path] || 'Academic Resource System';
  },

  updateDocTitle(path) {
    const titles = {
      '/': 'QSIS-ARMS | QSIS Academic Resource System',
      '/contributors': 'Contributors - QSIS-ARMS',
      '/routine': 'Routine - QSIS-ARMS',
      '/history': 'Read History - QSIS-ARMS',
      '/downloads': 'Downloads - QSIS-ARMS'
    };
    document.title = titles[path] || 'QSIS-ARMS';
  },

  start() {
    window.addEventListener('hashchange', () => {
      this.updateDocTitle(this.getCurrentHash());
      this.handleRoute();
    });

    this.updateDocTitle(this.getCurrentHash());
    this.handleRoute();
  }
};
