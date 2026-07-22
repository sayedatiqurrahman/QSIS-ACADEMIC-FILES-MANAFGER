const ContributorsView = {
  render() {
    return '<main class="main-content" style="max-width:900px;margin:0 auto;padding:20px">' +
      '<div class="star-cta-container" style="margin-bottom:20px">' +
        '<div class="star-cta-content">' +
          '<i class="fas fa-star star-cta-icon"></i>' +
          '<div>' +
            '<h3>Like QSIS-ARMS?</h3>' +
            '<p>Star our repository on GitHub to support the project and help other students find it!</p>' +
          '</div>' +
        '</div>' +
        '<a href="' + CONFIG.repoUrl + '" target="_blank" class="btn btn-glow btn-sm star-cta-btn">' +
          '<i class="fas fa-star"></i> <span id="githubStars">-</span> Stars on GitHub' +
        '</a>' +
      '</div>' +

      '<section class="contributors-section" id="contributorsSection" style="padding:0">' +
        '<div class="contributors-container">' +
          '<div class="contributors-header">' +
            '<h3><i class="fas fa-users"></i> Our Contributors</h3>' +
            '<p>People who have contributed academic files to this project. <span id="contributorsCount">0</span> contributors and counting!</p>' +
          '</div>' +
          '<div class="contributors-grid" id="contributorsGrid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">' +
            '<div class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading contributors...</div>' +
          '</div>' +
          '<div class="contributors-cta">' +
            '<p>Want to see your name here? Share your academic files with fellow students!</p>' +
            '<button class="btn btn-glow btn-sm" onclick="ContributorsView.showContributeModal()">' +
              '<i class="fas fa-upload"></i> Contribute Now' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<div id="contributeModal" class="modal">' +
        '<div class="modal-content modal-lg">' +
          '<div class="modal-header">' +
            '<h2><i class="fas fa-graduation-cap"></i> How to Contribute</h2>' +
            '<button class="btn-icon" onclick="ContributorsView.closeContributeModal()"><i class="fas fa-times"></i></button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="contribute-info">' +
              '<i class="fas fa-heart"></i>' +
              '<p>Share your notes, sheets, previous questions & class materials with fellow students. It takes just 3 minutes!</p>' +
            '</div>' +
            '<div class="tutorial-steps">' +
              '<div class="tutorial-step"><div class="step-number">1</div><div class="step-content"><h4>Create GitHub Account</h4><p>Go to <a href="https://github.com/signup" target="_blank">github.com/signup</a> and create a free account.</p></div></div>' +
              '<div class="tutorial-step"><div class="step-number">2</div><div class="step-content"><h4>Login to QSIS-ARMS</h4><p>Click the Upload button and login with your GitHub account. Verify with your IIUC email.</p></div></div>' +
              '<div class="tutorial-step"><div class="step-number">3</div><div class="step-content"><h4>Upload Your Academic Files</h4><p>Select your files, choose semester & category, enter your details, and submit. We handle the fork and PR automatically!</p></div></div>' +
              '<div class="tutorial-step"><div class="step-number">4</div><div class="step-content"><h4>Get Credit!</h4><p>Once merged, your name and avatar appear in this <strong>Contributors</strong> list automatically. You also help hundreds of QSIS students!</p></div></div>' +
            '</div>' +
            '<div style="margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">' +
              '<a href="' + CONFIG.repoUrl + '/fork" target="_blank" class="btn btn-glow btn-sm"><i class="fas fa-code-branch"></i> Fork Repository</a>' +
              '<a href="#/" class="btn btn-sm btn-outline"><i class="fas fa-home"></i> Browse Files</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</main>';
  },

  async init() {
    Contributors.renderStarBadge();
    var el = document.getElementById('githubStars');
    var nav = document.getElementById('navStars');
    if (el && nav) el.textContent = nav.textContent;
    Contributors.renderSection();
  },

  destroy() {
    this.closeContributeModal();
  },

  showContributeModal() {
    var modal = document.getElementById('contributeModal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeContributeModal() {
    var modal = document.getElementById('contributeModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
};
