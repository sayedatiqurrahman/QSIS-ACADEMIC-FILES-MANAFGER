const AUTH = {
  TOKEN_KEY: 'qsis_gh_token',
  USER_KEY: 'qsis_gh_user',
  SESSION_KEY: 'qsis_session',
  EMAIL_KEY: 'qsis_verified_email',
  PROFILE_KEY: 'qsis_profile',
  EMAIL_REGEX: /^q\d{5,8}@ugrad\.iiuc\.ac\.bd$/i,
  _sessionChecked: false,
  _sessionValid: false,

  isLoggedIn() {
    return this._sessionValid && !!localStorage.getItem(this.TOKEN_KEY);
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.USER_KEY));
    } catch { return null; }
  },

  isEmailVerified() {
    return !!localStorage.getItem(this.EMAIL_KEY);
  },

  getVerifiedEmail() {
    return localStorage.getItem(this.EMAIL_KEY);
  },

  getProfile() {
    try {
      var p = JSON.parse(localStorage.getItem(this.PROFILE_KEY));
      return p || {};
    } catch { return {}; }
  },

  saveProfile(data) {
    var current = this.getProfile();
    var merged = Object.assign({}, current, data);
    localStorage.setItem(this.PROFILE_KEY, JSON.stringify(merged));
  },

  isValidUniversityEmail(email) {
    return this.EMAIL_REGEX.test(email);
  },

  login() {
    var workerBase = CONFIG.oauthProxy;
    var spaOrigin = window.location.origin;
    var url = 'https://github.com/login/oauth/authorize?client_id=' + CONFIG.clientId +
      '&scope=repo&redirect_uri=' + encodeURIComponent(workerBase + '/callback?origin=' + encodeURIComponent(spaOrigin));
    window.location.href = url;
  },

  async checkSession() {
    var sessionToken = localStorage.getItem(this.SESSION_KEY);
    if (!sessionToken) {
      this._sessionValid = false;
      this._sessionChecked = true;
      return false;
    }
    try {
      var res = await fetch(CONFIG.oauthProxy + '/api/session-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sessionToken })
      });
      var data = await res.json();
      if (data.error || !data.valid) {
        this._sessionValid = false;
        this._sessionChecked = true;
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.SESSION_KEY);
        return false;
      }
      this._sessionValid = true;
      this._sessionChecked = true;
      localStorage.setItem(this.TOKEN_KEY, data.access_token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      return true;
    } catch (err) {
      console.error('Session check failed:', err);
      this._sessionValid = false;
      this._sessionChecked = true;
      return false;
    }
  },

  async logout() {
    var sessionToken = localStorage.getItem(this.SESSION_KEY);
    try {
      await fetch(CONFIG.oauthProxy + '/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sessionToken })
      });
    } catch (e) {}
    this._sessionValid = false;
    this._sessionChecked = false;
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.EMAIL_KEY);
    updateAuthUI();
    Router.go('/');
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
      this.saveProfile({ email: email, emailVerified: true });
    }
    return data;
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
      var profile = this.getProfile();
      if (this.isEmailVerified()) {
        body.innerHTML =
          '<div class="auth-step">' +
            '<img src="' + (user?.avatar_url || '') + '" alt="" class="auth-success-avatar" />' +
            '<h3 class="auth-success-title">Welcome, ' + (user?.login || 'User') + '!</h3>' +
            '<p class="auth-success-text">Email verified: <strong>' + this.getVerifiedEmail() + '</strong></p>' +
            '<p class="auth-success-text">You can now upload academic files.</p>' +
            '<div style="display:flex;gap:8px;margin-top:16px">' +
              '<button class="auth-btn-primary" onclick="AUTH.closeAuthModal(); Router.go(\'/\')" style="flex:1">' +
                '<i class="fas fa-upload"></i> Start Uploading' +
              '</button>' +
              '<button class="auth-btn-secondary" onclick="AUTH.closeAuthModal(); Router.go(\'/settings\')" style="flex:1">' +
                '<i class="fas fa-cog"></i> Settings' +
              '</button>' +
            '</div>' +
          '</div>';
      } else {
        body.innerHTML =
          '<div class="auth-step">' +
            '<h3 class="auth-connected-title"><i class="fas fa-check-circle" style="color:#22c55e"></i> GitHub Connected</h3>' +
            '<p class="auth-subtitle">Logged in as <strong>' + (user?.login || 'User') + '</strong></p>' +
            '<div class="auth-divider"></div>' +
            '<h4 style="font-size:0.9rem;margin-bottom:4px;color:#e8edf5">Step 2: Verify University Email</h4>' +
            '<p class="auth-hint" style="margin-top:0;margin-bottom:12px">Enter your IIUC QSIS email (q{number}@ugrad.iiuc.ac.bd)</p>' +
            '<input type="email" id="authEmail" placeholder="q233099@ugrad.iiuc.ac.bd" class="auth-input" />' +
            '<button class="auth-btn-primary" onclick="AUTH._requestCode()" style="margin-top:12px">' +
              '<i class="fas fa-paper-plane"></i> Send Verification Code' +
            '</button>' +
          '</div>';
      }
    } else {
      body.innerHTML =
        '<div class="auth-step">' +
          '<div class="auth-github-section">' +
            '<i class="fab fa-github auth-github-icon"></i>' +
            '<h3>Sign in with GitHub</h3>' +
            '<p>Connect your GitHub account to upload files and contribute academic resources.</p>' +
          '</div>' +
          '<button class="auth-btn-primary" onclick="AUTH.login()">' +
            '<i class="fab fa-github"></i> Continue with GitHub' +
          '</button>' +
          '<p class="auth-hint">You\'ll be redirected to GitHub to authorize. Free account required.</p>' +
        '</div>';
    }
  },

  async _requestCode() {
    var emailInput = document.getElementById('authEmail');
    var email = emailInput?.value?.trim();
    if (!email) { showToast('Please enter your email', 'error'); return; }
    if (!this.isValidUniversityEmail(email)) {
      showToast('Invalid email. Use format: q{number}@ugrad.iiuc.ac.bd', 'error'); return;
    }

    try {
      var body = document.getElementById('authModalBody');
      body.innerHTML = '<div class="auth-step"><h3 class="auth-title"><i class="fas fa-spinner fa-spin"></i> Sending code...</h3></div>';
      await this.requestVerificationCode(email);
      body.innerHTML =
        '<div class="auth-step">' +
          '<h3 class="auth-title"><i class="fas fa-envelope" style="color:#22c55e"></i> Enter Verification Code</h3>' +
          '<p class="auth-subtitle">A 6-digit code was sent to <strong>' + email + '</strong></p>' +
          '<input type="text" id="authCode" placeholder="Enter 6-digit code" class="auth-input" maxlength="6" inputmode="numeric" pattern="[0-9]*" />' +
          '<button class="auth-btn-primary" onclick="AUTH._confirmCode(\'' + email + '\')" style="margin-top:12px">' +
            '<i class="fas fa-check"></i> Verify Code' +
          '</button>' +
          '<button class="auth-btn-secondary" onclick="AUTH._renderAuthStep1()">' +
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
    if (!code || code.length !== 6) { showToast('Enter the 6-digit code', 'error'); return; }

    try {
      var body = document.getElementById('authModalBody');
      body.innerHTML = '<div class="auth-step"><h3 class="auth-title"><i class="fas fa-spinner fa-spin"></i> Verifying...</h3></div>';
      await this.confirmVerificationCode(email, code);
      showToast('Email verified successfully!', 'success');
      updateAuthUI();
      this._renderAuthStep1();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};
