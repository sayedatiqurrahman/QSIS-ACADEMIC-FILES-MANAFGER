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

  login() {
    const redirect = window.location.origin + '/#/callback';
    const url = `https://github.com/login/oauth/authorize?client_id=${CONFIG.clientId}&scope=repo&redirect_uri=${encodeURIComponent(redirect)}`;
    window.location.href = url;
  },

  async handleCallback() {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const code = params.get('code');
    if (!code) return false;

    try {
      const res = await fetch(`${CONFIG.oauthProxy}/api/exchange-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
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

    const res = await fetch(`${CONFIG.oauthProxy}/api/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  async confirmVerificationCode(email, code) {
    const res = await fetch(`${CONFIG.oauthProxy}/api/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await res.json();
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
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      this._renderAuthStep1();
    }
  },

  closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  _renderAuthStep1() {
    const body = document.getElementById('authModalBody');
    if (!body) return;

    if (this.isLoggedIn()) {
      const user = this.getUser();
      if (this.isEmailVerified()) {
        body.innerHTML = `
          <div class="auth-success">
            <img src="${user?.avatar_url || ''}" alt="" class="auth-avatar" />
            <h3>Welcome, ${user?.login || 'User'}!</h3>
            <p>Email verified: <strong>${this.getVerifiedEmail()}</strong></p>
            <p>You can now upload academic files.</p>
            <button class="btn btn-glow" onclick="AUTH.closeAuthModal(); Router.go('/')">
              <i class="fas fa-upload"></i> Start Uploading
            </button>
          </div>`;
      } else {
        body.innerHTML = `
          <div class="auth-step">
            <h3><i class="fas fa-check-circle" style="color:var(--success)"></i> GitHub Connected</h3>
            <p>Logged in as <strong>${user?.login || 'User'}</strong></p>
            <div class="auth-divider"></div>
            <h4>Step 2: Verify University Email</h4>
            <p class="auth-hint">Enter your IIUC email to verify you're a student.</p>
            <div class="form-group">
              <input type="email" id="authEmail" placeholder="q233099@ugrad.iiuc.ac.bd" class="auth-input" />
            </div>
            <button class="btn btn-glow btn-full" onclick="AUTH._requestCode()">
              <i class="fas fa-paper-plane"></i> Send Verification Code
            </button>
          </div>`;
      }
    } else {
      body.innerHTML = `
        <div class="auth-step">
          <div class="auth-github-promo">
            <i class="fab fa-github" style="font-size:2.5rem"></i>
            <h3>Sign in with GitHub</h3>
            <p>Connect your GitHub account to upload files and contribute academic resources.</p>
          </div>
          <button class="btn btn-glow btn-full" onclick="AUTH.login()">
            <i class="fab fa-github"></i> Continue with GitHub
          </button>
          <p class="auth-hint" style="margin-top:12px;text-align:center">
            You'll be redirected to GitHub to authorize. Free account required.
          </p>
        </div>`;
    }
  },

  async _requestCode() {
    const emailInput = document.getElementById('authEmail');
    const email = emailInput?.value?.trim();
    if (!email) {
      showToast('Please enter your email', 'error');
      return;
    }
    if (!this.isValidUniversityEmail(email)) {
      showToast('Invalid email. Use format: q{number}@ugrad.iiuc.ac.bd', 'error');
      return;
    }

    try {
      const body = document.getElementById('authModalBody');
      body.innerHTML = `
        <div class="auth-step">
          <h3><i class="fas fa-spinner fa-spin"></i> Sending code...</h3>
        </div>`;

      await this.requestVerificationCode(email);

      body.innerHTML = `
        <div class="auth-step">
          <h3><i class="fas fa-envelope" style="color:var(--primary)"></i> Enter Verification Code</h3>
          <p>A 6-digit code was sent to <strong>${email}</strong></p>
          <div class="form-group">
            <input type="text" id="authCode" placeholder="Enter 6-digit code" class="auth-input" maxlength="6" inputmode="numeric" pattern="[0-9]*" />
          </div>
          <button class="btn btn-glow btn-full" onclick="AUTH._confirmCode('${email}')">
            <i class="fas fa-check"></i> Verify Code
          </button>
          <button class="btn btn-sm btn-full" style="margin-top:8px" onclick="AUTH._renderAuthStep1()">
            <i class="fas fa-arrow-left"></i> Back
          </button>
        </div>`;

      document.getElementById('authCode')?.focus();
    } catch (err) {
      showToast(err.message, 'error');
      this._renderAuthStep1();
    }
  },

  async _confirmCode(email) {
    const codeInput = document.getElementById('authCode');
    const code = codeInput?.value?.trim();
    if (!code || code.length !== 6) {
      showToast('Enter the 6-digit code', 'error');
      return;
    }

    try {
      const body = document.getElementById('authModalBody');
      body.innerHTML = `
        <div class="auth-step">
          <h3><i class="fas fa-spinner fa-spin"></i> Verifying...</h3>
        </div>`;

      await this.confirmVerificationCode(email, code);

      showToast('Email verified successfully!', 'success');
      this._renderAuthStep1();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};
