const SettingsView = {
  render() {
    var user = AUTH.getUser() || {};
    var profile = AUTH.getProfile();
    var email = AUTH.getVerifiedEmail() || profile.email || '';
    var emailVerified = AUTH.isEmailVerified();

    return '' +
      '<div class="max-w-[700px] mx-auto px-5 py-8">' +
        '<h2 class="text-xl font-bold mb-6 flex items-center gap-2"><i class="fas fa-cog text-qsis"></i> Settings</h2>' +

        '<div class="mb-6">' +
          '<h3 class="text-[0.9rem] font-bold mb-3 text-dark-text flex items-center gap-2"><i class="fas fa-user-circle text-qsis"></i> Profile</h3>' +
          '<div class="bg-dark-bg2 rounded-xl border border-dark-border p-5">' +
            '<div class="flex items-center gap-4 mb-5">' +
              '<img src="' + (user.avatar_url || '') + '" alt="" class="w-16 h-16 rounded-full border-2 border-qsis" />' +
              '<div>' +
                '<div class="text-[1rem] font-bold">' + (user.name || user.login || 'User') + '</div>' +
                '<div class="text-[0.8rem] text-dark-text2">@' + (user.login || '') + '</div>' +
                '<a href="' + (user.html_url || '#') + '" target="_blank" class="text-[0.75rem] text-qsis no-underline hover:underline"><i class="fab fa-github"></i> GitHub Profile</a>' +
              '</div>' +
            '</div>' +
            '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
              '<div>' +
                '<label class="block text-[0.78rem] font-semibold mb-1 text-dark-text2">Full Name</label>' +
                '<input type="text" id="settingsName" value="' + (profile.displayName || user.name || '') + '" class="w-full px-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-dark-text text-[0.85rem] outline-none focus:border-qsis" />' +
              '</div>' +
              '<div>' +
                '<label class="block text-[0.78rem] font-semibold mb-1 text-dark-text2">WhatsApp</label>' +
                '<input type="text" id="settingsWhatsapp" value="' + (profile.whatsapp || '') + '" placeholder="+8801XXXXXXXXX" class="w-full px-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-dark-text text-[0.85rem] outline-none focus:border-qsis" />' +
              '</div>' +
              '<div>' +
                '<label class="block text-[0.78rem] font-semibold mb-1 text-dark-text2">QSIS ID</label>' +
                '<input type="text" id="settingsQsId" value="' + (profile.qsId || '') + '" placeholder="QSIS-2024-001" class="w-full px-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-dark-text text-[0.85rem] outline-none focus:border-qsis" />' +
              '</div>' +
              '<div>' +
                '<label class="block text-[0.78rem] font-semibold mb-1 text-dark-text2">Department</label>' +
                '<input type="text" value="QSIS - Qur\'anic Sciences & Islamic Studies" disabled class="w-full px-3 py-2 rounded-lg border border-dark-border bg-dark-bg3 text-dark-text2 text-[0.85rem]" />' +
              '</div>' +
            '</div>' +
            '<button class="mt-4 inline-flex items-center gap-[6px] px-5 py-2 rounded-xl bg-gradient-to-br from-qsis to-qsis-dark text-white border-none shadow-[0_0_16px_rgba(34,197,94,0.3)] cursor-pointer text-[0.8rem] font-semibold hover:shadow-[0_0_24px_rgba(34,197,94,0.3)] transition-all" onclick="SettingsView.saveProfile()">' +
              '<i class="fas fa-save"></i> Save Profile' +
            '</button>' +
          '</div>' +
        '</div>' +

        '<div class="mb-6">' +
          '<h3 class="text-[0.9rem] font-bold mb-3 text-dark-text flex items-center gap-2"><i class="fas fa-shield-alt text-qsis"></i> Authentication</h3>' +
          '<div class="bg-dark-bg2 rounded-xl border border-dark-border p-5">' +
            '<div class="flex items-center gap-3 mb-4">' +
              '<i class="fab fa-github text-[1.5rem]"></i>' +
              '<div>' +
                '<div class="text-[0.85rem] font-semibold">GitHub Account</div>' +
                '<div class="text-[0.78rem] text-dark-text2">' + (user.login || 'Not connected') + '</div>' +
              '</div>' +
              '<span class="ml-auto px-3 py-1 rounded-full bg-[rgba(34,197,94,0.15)] text-qsis text-[0.75rem] font-bold">Connected</span>' +
            '</div>' +
            '<div class="flex items-center gap-3">' +
              '<i class="fas fa-envelope text-[1.2rem] ' + (emailVerified ? 'text-qsis' : 'text-dark-text2') + '"></i>' +
              '<div>' +
                '<div class="text-[0.85rem] font-semibold">University Email</div>' +
                '<div class="text-[0.78rem] text-dark-text2">' + (email || 'Not verified') + '</div>' +
              '</div>' +
              (emailVerified
                ? '<span class="ml-auto px-3 py-1 rounded-full bg-[rgba(34,197,94,0.15)] text-qsis text-[0.75rem] font-bold"><i class="fas fa-check"></i> Verified</span>'
                : '<button class="ml-auto px-3 py-1 rounded-full border border-warning bg-transparent text-warning text-[0.75rem] font-bold cursor-pointer hover:bg-[rgba(245,158,11,0.1)]" onclick="SettingsView.verifyEmail()">Verify Now</button>'
              ) +
            '</div>' +
            '<div id="settingsVerifySection" class="hidden mt-4 pt-4 border-t border-dark-border">' +
              '<p class="text-[0.78rem] text-dark-text2 mb-3">Enter your IIUC QSIS email (q{number}@ugrad.iiuc.ac.bd)</p>' +
              '<input type="email" id="settingsVerifyEmail" placeholder="q233099@ugrad.iiuc.ac.bd" class="w-full px-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-dark-text text-[0.85rem] outline-none focus:border-qsis mb-2" />' +
              '<button class="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl bg-qsis text-white border-none cursor-pointer text-[0.8rem] font-semibold" onclick="SettingsView.sendVerifyCode()">' +
                '<i class="fas fa-paper-plane"></i> Send Code' +
              '</button>' +
              '<div id="settingsVerifyCodeArea" class="hidden mt-3">' +
                '<input type="text" id="settingsVerifyCode" placeholder="6-digit code" maxlength="6" inputmode="numeric" class="w-full px-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-dark-text text-[0.85rem] outline-none focus:border-qsis mb-2" />' +
                '<button class="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl bg-qsis text-white border-none cursor-pointer text-[0.8rem] font-semibold" onclick="SettingsView.confirmVerifyCode()">' +
                  '<i class="fas fa-check"></i> Verify' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div>' +
          '<h3 class="text-[0.9rem] font-bold mb-3 text-dark-text flex items-center gap-2"><i class="fas fa-info-circle text-qsis"></i> Account Info</h3>' +
          '<div class="bg-dark-bg2 rounded-xl border border-dark-border p-5">' +
            '<div class="grid grid-cols-2 gap-3 text-[0.8rem]">' +
              '<div><span class="text-dark-text2">User ID:</span> <span class="font-semibold">' + (user.id || '-') + '</span></div>' +
              '<div><span class="text-dark-text2">Login:</span> <span class="font-semibold">' + (user.login || '-') + '</span></div>' +
              '<div class="col-span-2"><span class="text-dark-text2">Session expires in:</span> <span class="font-semibold text-qsis">15 days</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  },

  init() {},

  saveProfile() {
    var name = document.getElementById('settingsName')?.value?.trim() || '';
    var whatsapp = document.getElementById('settingsWhatsapp')?.value?.trim() || '';
    var qsId = document.getElementById('settingsQsId')?.value?.trim() || '';
    AUTH.saveProfile({ displayName: name, whatsapp: whatsapp, qsId: qsId });
    showToast('Profile saved!', 'success');
  },

  verifyEmail() {
    var section = document.getElementById('settingsVerifySection');
    if (section) section.classList.toggle('hidden');
  },

  async sendVerifyCode() {
    var email = document.getElementById('settingsVerifyEmail')?.value?.trim();
    if (!email) { showToast('Enter your email', 'error'); return; }
    if (!AUTH.isValidUniversityEmail(email)) {
      showToast('Invalid email. Use: q{number}@ugrad.iiuc.ac.bd', 'error'); return;
    }
    try {
      await AUTH.requestVerificationCode(email);
      showToast('Code sent! Check your email.', 'success');
      var codeArea = document.getElementById('settingsVerifyCodeArea');
      if (codeArea) codeArea.classList.remove('hidden');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async confirmVerifyCode() {
    var email = document.getElementById('settingsVerifyEmail')?.value?.trim();
    var code = document.getElementById('settingsVerifyCode')?.value?.trim();
    if (!code || code.length !== 6) { showToast('Enter 6-digit code', 'error'); return; }
    try {
      await AUTH.confirmVerificationCode(email, code);
      showToast('Email verified!', 'success');
      updateAuthUI();
      Router.handleRoute();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};
