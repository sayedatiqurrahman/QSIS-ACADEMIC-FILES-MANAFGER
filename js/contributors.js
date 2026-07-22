const Contributors = {
  owner: 'sayedatiqurrahman',
  repo: 'QSIS-ACADEMIC-FILES-MANAFGER',
  ownerLogin: 'sayedatiqurrahman',
  ownerDesignation: 'Founder & Lead Developer',
  ownerWhatsapp: '',

  async fetchContributors() {
    try {
      const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/contributors?per_page=100`);
      if (!res.ok) throw new Error('Failed to fetch contributors');
      return await res.json();
    } catch (err) {
      console.error('Contributors fetch error:', err);
      return [];
    }
  },

  async fetchStarCount() {
    try {
      const headers = { Accept: 'application/vnd.github.v3+json' };
      const token = AUTH.getToken();
      if (token) headers.Authorization = 'token ' + token;
      const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}`, { headers });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.stargazers_count || 0;
    } catch (err) {
      return 0;
    }
  },

  renderOwnerProfile() {
    return `
      <div class="col-span-full p-5 bg-gradient-to-br from-[rgba(34,197,94,.08)] to-[rgba(16,185,129,.04)] border-2 border-[rgba(34,197,94,.3)] rounded-xl relative hover:border-qsis hover:shadow-[0_0_24px_rgba(34,197,94,0.3)] transition-all">
        <div class="absolute top-3 right-4 inline-flex items-center gap-[5px] px-2.5 py-1 bg-gradient-to-br from-qsis to-qsis-dark text-white rounded-[20px] text-[0.7rem] font-bold"><i class="fas fa-crown text-[0.65rem]"></i> Founder</div>
        <img src="https://avatars.githubusercontent.com/${this.ownerLogin}" alt="${this.ownerLogin}" class="w-[60px] h-[60px] rounded-full object-cover border-[3px] border-qsis flex-shrink-0" />
        <div class="mt-2">
          <div class="text-[1.05rem] font-bold bg-gradient-to-br from-qsis to-accent bg-clip-text text-transparent">Sayeed Atiqur Rahman</div>
          <div class="text-[0.72rem] text-accent font-semibold mt-0.5">${this.ownerDesignation}</div>
          <a href="https://github.com/${this.ownerLogin}" target="_blank" class="inline-flex items-center gap-1 text-[0.72rem] text-qsis no-underline mt-1 hover:underline"><i class="fab fa-github"></i> @${this.ownerLogin}</a>
        </div>
      </div>`;
  },

  renderContributor(c) {
    const isOwner = c.login === this.ownerLogin;
    if (isOwner) return '';
    return `
      <div class="flex items-center gap-3 p-3.5 bg-dark-bg3 border border-dark-border rounded-xl transition-all hover:border-qsis hover:shadow-[0_0_12px_rgba(34,197,94,0.3)] hover:-translate-y-0.5">
        <img src="${c.avatar_url}" alt="${c.login}" class="w-12 h-12 rounded-full object-cover border-2 border-dark-border flex-shrink-0" loading="lazy" />
        <div class="min-w-0 flex-1">
          <div class="font-bold text-[0.88rem] whitespace-nowrap overflow-hidden text-ellipsis">${c.login}</div>
          <div class="text-[0.72rem] text-dark-text2 mt-0.5"><i class="fas fa-code-commit mr-1"></i> ${c.contributions} contribution${c.contributions !== 1 ? 's' : ''}</div>
          <a href="${c.html_url}" target="_blank" class="inline-flex items-center gap-1 text-[0.72rem] text-qsis no-underline mt-1 hover:underline"><i class="fab fa-github"></i> View Profile</a>
        </div>
      </div>`;
  },

  async renderSection() {
    const grid = document.getElementById('contributorsGrid');
    const countEl = document.getElementById('contributorsCount');
    if (!grid) return;

    const contributors = await this.fetchContributors();
    if (!contributors.length) {
      grid.innerHTML = '<div class="text-center py-10 text-dark-text2"><i class="fas fa-users"></i> No contributors found yet. Be the first!</div>';
      return;
    }

    if (countEl) countEl.textContent = contributors.length;

    const ownerHtml = this.renderOwnerProfile();
    const contribHtml = contributors.map(c => this.renderContributor(c)).filter(Boolean).join('');

    grid.innerHTML = ownerHtml + contribHtml;
  },

  async renderStarBadge() {
    const starCount = await this.fetchStarCount();
    const el = document.getElementById('githubStars');
    const navEl = document.getElementById('navStars');
    if (el) el.textContent = starCount.toLocaleString();
    if (navEl) navEl.textContent = starCount.toLocaleString();
  }
};
