const AUTH = {
  TOKEN_KEY: 'qsis_gh_token',
  USER_KEY: 'qsis_gh_user',
  EMAIL_KEY: 'qsis_verified_email',
  EMAIL_REGEX: /^q\d{5,8}@ugrad\.iiuc\.ac\.bd$/i,

  isLoggedIn() {
    return !!localStorage.getItem(this.TOKEN_KEY);
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.USER_KEY));
    } catch {
      return null;
    }
  },

  isEmailVerified() {
    return !!localStorage.getItem(this.EMAIL_KEY);
  },

  getVerifiedEmail() {
    return localStorage.getItem(this.EMAIL_KEY);
  },

  isValidUniversityEmail(email) {
    return this.EMAIL_REGEX.test(email);
  },

  _getRedirectUri() {
    return window.location.origin + '/index.html#/callback';
  },

  login() {
    var redirect = this._getRedirectUri();
    var url = 'https://github.com/login/oauth/authorize?client_id=' + CONFIG.clientId + '&scope=repo&redirect_uri=' + encodeURIComponent(redirect);
    window.location.href = url;
  },

  async handleCallback() {
    var code = null;
    var searchStr = window.location.search;
    if (searchStr) {
      var searchParams = new URLSearchParams(searchStr);
      code = searchParams.get('code');
    }
    if (!code) {
      var hashStr = window.location.hash || '';
      var hashQuery = hashStr.split('?')[1] || '';
      if (hashQuery) {
        var hashParams = new URLSearchParams(hashQuery);
        code = hashParams.get('code');
      }
    }
    if (!code) return false;

    try {
      var res = await fetch(CONFIG.oauthProxy + '/api/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);

      localStorage.setItem(this.TOKEN_KEY, data.access_token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));

      window.history.replaceState(null, '', window.location.pathname + '#/');
      return true;
    } catch (err) {
      console.error('OAuth callback error:', err);
      return false;
    }
  },

  async requestVerificationCode(email) {
    if (!this.isValidUniversityEmail(email)) {
      throw new Error('Invalid email format. Use your IIUC email: q{number}@ugrad.iiuc.ac.bd');
    }

    var res = await fetch(CONFIG.oauthProxy + '/api/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    var data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  async confirmVerificationCode(email, code) {
    var res = await fetch(CONFIG.oauthProxy + '/api/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, code: code })
    });
    var data = await res.json();
    if (data.error) throw new Error(data.error);
    if (data.verified) {
      localStorage.setItem(this.EMAIL_KEY, email);
    }
    return data;
  },

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.EMAIL_KEY);
  },

  canUpload() {
    return this.isLoggedIn() && this.isEmailVerified();
  },

  showAuthModal() {
    var modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      this._renderAuthStep1();
    }
  },

  closeAuthModal() {
    var modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  _renderAuthStep1() {
    var body = document.getElementById('authModalBody');
    if (!body) return;

    if (this.isLoggedIn()) {
      var user = this.getUser();
      if (this.isEmailVerified()) {
        body.innerHTML =
          '<div class="text-center py-5">' +
            '<img src="' + (user?.avatar_url || '') + '" alt="" class="w-16 h-16 rounded-full border-[3px] border-qsis mx-auto mb-3" />' +
            '<h3 class="text-[1.1rem] mb-1.5">Welcome, ' + (user?.login || 'User') + '!</h3>' +
            '<p class="text-[0.85rem] text-dark-text2 mb-1">Email verified: <strong>' + this.getVerifiedEmail() + '</strong></p>' +
            '<p class="text-[0.85rem] text-dark-text2 mb-4">You can now upload academic files.</p>' +
            '<button class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-qsis to-qsis-dark text-white border-none shadow-[0_0_16px_rgba(34,197,94,0.3)] cursor-pointer text-[0.85rem] font-semibold" onclick="AUTH.closeAuthModal(); Router.go(\'/\')">' +
              '<i class="fas fa-upload"></i> Start Uploading' +
            '</button>' +
          '</div>';
      } else {
        body.innerHTML =
          '<div class="text-center">' +
            '<h3 class="text-[1rem] mb-2 flex items-center justify-center gap-2"><i class="fas fa-check-circle" style="color:#22c55e"></i> GitHub Connected</h3>' +
            '<p class="text-[0.85rem] text-dark-text2 mb-3">Logged in as <strong>' + (user?.login || 'User') + '</strong></p>' +
            '<div class="h-px bg-dark-border my-4"></div>' +
            '<h4 class="text-[0.9rem] mb-1">Step 2: Verify University Email</h4>' +
            '<p class="text-[0.82rem] text-dark-text2 mb-3">Enter your IIUC email to verify you\'re a student.</p>' +
            '<div class="mb-3">' +
              '<input type="email" id="authEmail" placeholder="q233099@ugrad.iiuc.ac.bd" class="w-full px-3.5 py-2.5 rounded-lg border border-dark-border bg-dark-bg text-dark-text text-[0.9rem] outline-none focus:border-qsis text-center" />' +
            '</div>' +
            '<button class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-qsis to-qsis-dark text-white border-none shadow-[0_0_16px_rgba(34,197,94,0.3)] cursor-pointer text-[0.85rem] font-semibold" onclick="AUTH._requestCode()">' +
              '<i class="fas fa-paper-plane"></i> Send Verification Code' +
            '</button>' +
          '</div>';
      }
    } else {
      body.innerHTML =
        '<div class="text-center">' +
          '<div class="py-5">' +
            '<i class="fab fa-github" style="font-size:2.5rem"></i>' +
            '<h3 class="text-[1.1rem] mt-3 mb-1.5">Sign in with GitHub</h3>' +
            '<p class="text-[0.85rem] text-dark-text2">Connect your GitHub account to upload files and contribute academic resources.</p>' +
          '</div>' +
          '<button class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-qsis to-qsis-dark text-white border-none shadow-[0_0_16px_rgba(34,197,94,0.3)] cursor-pointer text-[0.85rem] font-semibold" onclick="AUTH.login()">' +
            '<i class="fab fa-github"></i> Continue with GitHub' +
          '</button>' +
          '<p class="text-[0.75rem] text-dark-text2 mt-3 text-center">' +
            'You\'ll be redirected to GitHub to authorize. Free account required.' +
          '</p>' +
        '</div>';
    }
  },

  async _requestCode() {
    var emailInput = document.getElementById('authEmail');
    var email = emailInput?.value?.trim();
    if (!email) {
      showToast('Please enter your email', 'error');
      return;
    }
    if (!this.isValidUniversityEmail(email)) {
      showToast('Invalid email. Use format: q{number}@ugrad.iiuc.ac.bd', 'error');
      return;
    }

    try {
      var body = document.getElementById('authModalBody');
      body.innerHTML =
        '<div class="text-center py-5">' +
          '<h3 class="text-[1rem] flex items-center justify-center gap-2"><i class="fas fa-spinner fa-spin"></i> Sending code...</h3>' +
        '</div>';

      await this.requestVerificationCode(email);

      body.innerHTML =
        '<div class="text-center">' +
          '<h3 class="text-[1rem] mb-2 flex items-center justify-center gap-2"><i class="fas fa-envelope" style="color:#22c55e"></i> Enter Verification Code</h3>' +
          '<p class="text-[0.85rem] text-dark-text2 mb-3">A 6-digit code was sent to <strong>' + email + '</strong></p>' +
          '<div class="mb-3">' +
            '<input type="text" id="authCode" placeholder="Enter 6-digit code" class="w-full px-3.5 py-2.5 rounded-lg border border-dark-border bg-dark-bg text-dark-text text-[0.9rem] outline-none focus:border-qsis text-center" maxlength="6" inputmode="numeric" pattern="[0-9]*" />' +
          '</div>' +
          '<button class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-qsis to-qsis-dark text-white border-none shadow-[0_0_16px_rgba(34,197,94,0.3)] cursor-pointer text-[0.85rem] font-semibold" onclick="AUTH._confirmCode(\'' + email + '\')">' +
            '<i class="fas fa-check"></i> Verify Code' +
          '</button>' +
          '<button class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.8rem] font-semibold mt-2" onclick="AUTH._renderAuthStep1()">' +
            '<i class="fas fa-arrow-left"></i> Back' +
          '</button>' +
        '</div>';

      document.getElementById('authCode')?.focus();
    } catch (err) {
      showToast(err.message, 'error');
      this._renderAuthStep1();
    }
  },

  async _confirmCode(email) {
    var codeInput = document.getElementById('authCode');
    var code = codeInput?.value?.trim();
    if (!code || code.length !== 6) {
      showToast('Enter the 6-digit code', 'error');
      return;
    }

    try {
      var body = document.getElementById('authModalBody');
      body.innerHTML =
        '<div class="text-center py-5">' +
          '<h3 class="text-[1rem] flex items-center justify-center gap-2"><i class="fas fa-spinner fa-spin"></i> Verifying...</h3>' +
        '</div>';

      await this.confirmVerificationCode(email, code);

      showToast('Email verified successfully!', 'success');
      this._renderAuthStep1();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};
