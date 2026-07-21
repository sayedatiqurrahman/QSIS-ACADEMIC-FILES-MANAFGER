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
      const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}`);
      if (!res.ok) throw new Error('Failed to fetch repo info');
      const data = await res.json();
      return data.stargazers_count || 0;
    } catch (err) {
      console.error('Star count fetch error:', err);
      return 0;
    }
  },

  renderOwnerProfile() {
    return `
      <div class="contributor-card owner-card">
        <div class="owner-badge"><i class="fas fa-crown"></i> Founder</div>
        <img src="https://avatars.githubusercontent.com/${this.ownerLogin}" alt="${this.ownerLogin}" class="contributor-avatar owner-avatar" />
        <div class="contributor-info">
          <div class="contributor-name owner-name">Sayeed Atiqur Rahman</div>
          <div class="contributor-role">${this.ownerDesignation}</div>
          <a href="https://github.com/${this.ownerLogin}" target="_blank" class="contributor-github">
            <i class="fab fa-github"></i> @${this.ownerLogin}
          </a>
        </div>
      </div>`;
  },

  renderContributor(c) {
    const isOwner = c.login === this.ownerLogin;
    if (isOwner) return '';
    return `
      <div class="contributor-card">
        <img src="${c.avatar_url}" alt="${c.login}" class="contributor-avatar" loading="lazy" />
        <div class="contributor-info">
          <div class="contributor-name">${c.login}</div>
          <div class="contributor-commits"><i class="fas fa-code-commit"></i> ${c.contributions} contribution${c.contributions !== 1 ? 's' : ''}</div>
          <a href="${c.html_url}" target="_blank" class="contributor-github">
            <i class="fab fa-github"></i> View Profile
          </a>
        </div>
      </div>`;
  },

  async renderSection() {
    const grid = document.getElementById('contributorsGrid');
    const countEl = document.getElementById('contributorsCount');
    if (!grid) return;

    const contributors = await this.fetchContributors();
    if (!contributors.length) {
      grid.innerHTML = '<div class="loading-cell"><i class="fas fa-users"></i> No contributors found yet. Be the first!</div>';
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
