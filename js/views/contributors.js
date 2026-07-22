const ContributorsView = {
  render() {
    return '<main class="max-w-[900px] mx-auto py-5 px-5">' +
      '<div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-[rgba(250,204,21,.08)] to-[rgba(250,204,21,.02)] border border-[rgba(250,204,21,.2)] mb-5">' +
        '<div class="flex items-center gap-3.5">' +
          '<i class="fas fa-star text-[1.8rem] text-gold flex-shrink-0"></i>' +
          '<div>' +
            '<h3 class="text-[0.95rem] text-dark-text mb-0.5">Like QSIS-ARMS?</h3>' +
            '<p class="text-[0.78rem] text-dark-text2 m-0">Star our repository on GitHub to support the project and help other students find it!</p>' +
          '</div>' +
        '</div>' +
        '<a href="' + CONFIG.repoUrl + '" target="_blank" class="whitespace-nowrap flex-shrink-0 inline-flex items-center gap-[6px] px-4 py-2 rounded-xl bg-gradient-to-br from-qsis to-qsis-dark text-white border-none shadow-[0_0_16px_rgba(34,197,94,0.3)] cursor-pointer text-[0.8rem] font-semibold no-underline">' +
          '<i class="fas fa-star"></i> <span id="githubStars">-</span> Stars on GitHub' +
        '</a>' +
      '</div>' +

      '<section class="max-w-[1200px] mx-auto mb-[30px] px-0" id="contributorsSection">' +
        '<div class="bg-dark-bg2 border border-dark-border rounded-xl p-6">' +
          '<div class="text-center mb-6">' +
            '<h3 class="text-[1.15rem] font-semibold flex items-center justify-center gap-2 mb-1.5"><i class="fas fa-users"></i> Our Contributors</h3>' +
            '<p class="text-[0.8rem] text-dark-text2">People who have contributed academic files to this project. <span id="contributorsCount">0</span> contributors and counting!</p>' +
          '</div>' +
          '<div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 mb-6" id="contributorsGrid">' +
            '<div class="text-center py-10 text-dark-text2"><i class="fas fa-spinner fa-spin"></i> Loading contributors...</div>' +
          '</div>' +
          '<div class="text-center pt-4 border-t border-dark-border">' +
            '<p class="text-[0.8rem] text-dark-text2 mb-2.5">Want to see your name here? Share your academic files with fellow students!</p>' +
            '<button class="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl bg-gradient-to-br from-qsis to-qsis-dark text-white border-none shadow-[0_0_16px_rgba(34,197,94,0.3)] cursor-pointer text-[0.8rem] font-semibold" onclick="ContributorsView.showContributeModal()">' +
              '<i class="fas fa-upload"></i> Contribute Now' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<div id="contributeModal" class="modal">' +
        '<div class="modal-content max-w-[700px]">' +
          '<div class="flex items-center justify-between px-5 py-4 border-b border-dark-border">' +
            '<h2 class="text-base font-semibold flex items-center gap-2"><i class="fas fa-graduation-cap"></i> How to Contribute</h2>' +
            '<button class="bg-transparent border-none text-dark-text2 cursor-pointer w-[34px] h-[34px] rounded-full flex items-center justify-center text-base hover:bg-dark-bg3 hover:text-dark-text transition-all" onclick="ContributorsView.closeContributeModal()"><i class="fas fa-times"></i></button>' +
          '</div>' +
          '<div class="p-5">' +
            '<div class="flex items-center gap-3 p-3 rounded-lg bg-[rgba(16,185,129,.1)] border border-[rgba(16,185,129,.3)] text-[0.85rem] text-dark-text2 mb-4">' +
              '<i class="fas fa-heart text-accent text-[1.1rem]"></i>' +
              '<p class="m-0">Share your notes, sheets, previous questions & class materials with fellow students. It takes just 3 minutes!</p>' +
            '</div>' +
            '<div class="flex flex-col gap-3.5">' +
              '<div class="flex gap-3.5 items-start"><div class="w-[30px] h-[30px] min-w-[30px] rounded-full bg-gradient-to-br from-qsis to-accent text-white flex items-center justify-center font-bold text-[0.85rem]">1</div><div><h4 class="text-[0.9rem] mb-0.5">Create GitHub Account</h4><p class="text-[0.8rem] text-dark-text2">Go to <a href="https://github.com/signup" target="_blank" class="text-qsis no-underline hover:underline">github.com/signup</a> and create a free account.</p></div></div>' +
              '<div class="flex gap-3.5 items-start"><div class="w-[30px] h-[30px] min-w-[30px] rounded-full bg-gradient-to-br from-qsis to-accent text-white flex items-center justify-center font-bold text-[0.85rem]">2</div><div><h4 class="text-[0.9rem] mb-0.5">Login to QSIS-ARMS</h4><p class="text-[0.8rem] text-dark-text2">Click the Upload button and login with your GitHub account. Verify with your IIUC email.</p></div></div>' +
              '<div class="flex gap-3.5 items-start"><div class="w-[30px] h-[30px] min-w-[30px] rounded-full bg-gradient-to-br from-qsis to-accent text-white flex items-center justify-center font-bold text-[0.85rem]">3</div><div><h4 class="text-[0.9rem] mb-0.5">Upload Your Academic Files</h4><p class="text-[0.8rem] text-dark-text2">Select your files, choose semester & category, enter your details, and submit. We handle the fork and PR automatically!</p></div></div>' +
              '<div class="flex gap-3.5 items-start"><div class="w-[30px] h-[30px] min-w-[30px] rounded-full bg-gradient-to-br from-qsis to-accent text-white flex items-center justify-center font-bold text-[0.85rem]">4</div><div><h4 class="text-[0.9rem] mb-0.5">Get Credit!</h4><p class="text-[0.8rem] text-dark-text2">Once merged, your name and avatar appear in this <strong>Contributors</strong> list automatically. You also help hundreds of QSIS students!</p></div></div>' +
            '</div>' +
            '<div class="mt-4 flex gap-2 justify-center flex-wrap">' +
              '<a href="' + CONFIG.repoUrl + '/fork" target="_blank" class="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl bg-gradient-to-br from-qsis to-qsis-dark text-white border-none shadow-[0_0_16px_rgba(34,197,94,0.3)] cursor-pointer text-[0.8rem] font-semibold no-underline"><i class="fas fa-code-branch"></i> Fork Repository</a>' +
              '<a href="#/" class="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl border border-dark-border bg-transparent text-dark-text cursor-pointer text-[0.8rem] font-semibold no-underline"><i class="fas fa-home"></i> Browse Files</a>' +
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
