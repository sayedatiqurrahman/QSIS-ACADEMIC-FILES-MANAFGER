const Router = {
  routes: {},
  current: null,
  defaultRoute: '/',
  _pendingLoginToast: false,

  register(hash, view) {
    this.routes[hash] = view;
  },

  go(hash) {
    window.location.hash = hash;
  },

  getCurrentHash() {
    return window.location.hash.slice(1) || this.defaultRoute;
  },

  parseHashParams() {
    var hashStr = window.location.hash || '';
    var queryPart = hashStr.split('?')[1] || '';
    if (!queryPart) return {};
    return Object.fromEntries(new URLSearchParams(queryPart));
  },

  async handleRoute() {
    const hash = this.getCurrentHash();

    if (hash.startsWith('/callback')) {
      const params = this.parseHashParams();
      window.history.replaceState(null, '', window.location.pathname + '#/');

      if (params.error) {
        showToast('Login failed: ' + decodeURIComponent(params.error), 'error');
        this.handleRoute();
        return;
      }

      if (params.data) {
        try {
          var data = JSON.parse(decodeURIComponent(params.data));
          localStorage.setItem(AUTH.TOKEN_KEY, data.access_token);
          localStorage.setItem(AUTH.USER_KEY, JSON.stringify(data.user));
          localStorage.setItem(AUTH.SESSION_KEY, data.session);
          AUTH._sessionValid = true;
          AUTH._sessionChecked = true;
          this._pendingLoginToast = true;
        } catch (e) {
          console.error('Callback parse error:', e);
          showToast('Login failed. Try again.', 'error');
        }
      }

      this.handleRoute();
      return;
    }

    if (!AUTH._sessionChecked) {
      await AUTH.checkSession();
    }

    if (this.current?.destroy) {
      try { this.current.destroy(); } catch(e) {}
    }

    const view = this.routes[hash] || this.routes[this.defaultRoute];
    if (!view) {
      document.getElementById('app-main').innerHTML =
        '<div style="text-align:center;padding:80px 20px;color:#94a3b8">' +
          '<i class="fas fa-question-circle" style="font-size:2.5rem;margin-bottom:12px;display:block"></i>' +
          '<p>Page not found</p>' +
          '<a href="#/" style="display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:8px 16px;border-radius:12px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;text-decoration:none;font-size:0.8rem;font-weight:600"><i class="fas fa-home"></i> Go Home</a>' +
        '</div>';
      return;
    }

    const main = document.getElementById('app-main');
    if (view.render) main.innerHTML = view.render();
    this.current = view;
    if (view.init) {
      try { await view.init(); } catch(e) { console.error('View init error:', e); }
    }

    this.updateNav(hash);
    this.updateSubtitle(hash);
    window.scrollTo(0, 0);
    updateAuthUI();

    if (this._pendingLoginToast) {
      this._pendingLoginToast = false;
      showToast('Logged in successfully!', 'success');
    }
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
      '/downloads': 'Downloads',
      '/settings': 'Settings'
    };
    sub.textContent = titles[path] || 'Academic Resource System';
  },

  updateDocTitle(path) {
    const titles = {
      '/': 'QSIS-ARMS | QSIS Academic Resource System',
      '/contributors': 'Contributors - QSIS-ARMS',
      '/routine': 'Routine - QSIS-ARMS',
      '/history': 'Read History - QSIS-ARMS',
      '/downloads': 'Downloads - QSIS-ARMS',
      '/settings': 'Settings - QSIS-ARMS'
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
