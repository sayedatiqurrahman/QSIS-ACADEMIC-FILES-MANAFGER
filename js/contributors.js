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

  async fetchCommits() {
    try {
      const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/commits?per_page=100`);
      if (!res.ok) throw new Error('Failed to fetch commits');
      return await res.json();
    } catch (err) {
      return [];
    }
  },

  async fetchMergedPRs() {
    try {
      const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/pulls?state=closed&per_page=100`);
      if (!res.ok) throw new Error('Failed to fetch PRs');
      const prs = await res.json();
      return prs.filter(pr => pr.merged_at).map(pr => ({
        login: pr.user.login,
        avatar_url: pr.user.avatar_url,
        html_url: pr.user.html_url,
        contributions: 1
      }));
    } catch (err) {
      return [];
    }
  },

  assignRole(username) {
    if (username === this.ownerLogin) return this.ownerDesignation
    const lower = username.toLowerCase()
    if (lower.includes('develop') || lower.includes('dev') || lower.includes('coder') || lower.includes('engineer') || lower.includes('programmer')) return 'Developer'
    if (lower.includes('fix') || lower.includes('bug') || lower.includes('solve') || lower.includes('debug')) return 'Problem Solver'
    return 'Academic Contributor'
  },

  getRoleFromCommits(username, commits) {
    if (username === 'github-actions[bot]' || username === 'github-actions') return 'Bot'
    const userCommits = commits.filter(c =>
      c.author && c.author.login === username
    )
    const messages = userCommits.map(c => c.commit.message.toLowerCase())

    // Detect file-upload-only commits: messages like "2nd semester sheet added",
    // "notes uploaded", "previous question" — these are academic file contributions
    const isFileUpload = messages.every(m =>
      (m.includes('semester') || m.includes('semister') || m.includes('sheet') ||
       m.includes('note') || m.includes('syllabus') || m.includes('question') ||
       m.includes('upload') || m.includes('file submission')) &&
      !m.includes('feat:') && !m.includes('fix:') && !m.includes('refactor')
    )
    if (isFileUpload) return 'Data Collector'

    const hasDevWork = messages.some(m =>
      m.includes('feat') || m.includes('feature') || m.includes('add ') ||
      m.includes('implement') || m.includes('build') || m.includes('setup') ||
      m.includes('create') || m.includes('ui') || m.includes('frontend') ||
      m.includes('backend') || m.includes('refactor') || m.includes('component') ||
      m.includes('page') || m.includes('routine') || m.includes('route') ||
      m.includes('pdf') || m.includes('download') || m.includes('viewer') ||
      m.includes('deploy') || m.includes('workflow') || m.includes('ci') ||
      m.includes('config') || m.includes('script') || m.includes('style') ||
      m.includes('css') || m.includes('js') || m.startsWith('feat')
    )
    if (hasDevWork) return 'Developer'

    const hasBugFix = messages.some(m =>
      m.includes('fix') || m.includes('bug') || m.includes('error') ||
      m.includes('issue') || m.includes('broken') || m.includes('correct') ||
      m.includes('repair') || m.includes('duplicate') || m.includes('missing')
    )
    if (hasBugFix) return 'Problem Solver'

    return 'Academic Contributor'
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
      </div>`
  },

  renderContributor(c, role) {
    if (c.login === this.ownerLogin) return ''
    const roleColors = {
      'Developer': 'var(--primary)',
      'Problem Solver': '#f59e0b',
      'Data Collector': '#22c55e',
      'Academic Contributor': '#3b82f6',
      'Bot': '#94a3b8'
    }
    const color = roleColors[role] || 'var(--text2)'
    const roleIcons = {
      'Developer': 'fa-code',
      'Problem Solver': 'fa-wrench',
      'Data Collector': 'fa-database',
      'Academic Contributor': 'fa-graduation-cap',
      'Bot': 'fa-robot'
    }
    return `
      <div class="contributor-card">
        <img src="${c.avatar_url}" alt="${c.login}" class="contributor-avatar" loading="lazy" />
        <div class="contributor-info">
          <div class="contributor-name">${c.login}</div>
          <div class="contributor-role" style="color:${color}"><i class="fas ${roleIcons[role] || 'fa-user'}"></i> ${role}</div>
          <div class="contributor-commits"><i class="fas fa-code-commit"></i> ${c.contributions} contribution${c.contributions !== 1 ? 's' : ''}</div>
          <a href="${c.html_url}" target="_blank" class="contributor-github">
            <i class="fab fa-github"></i> View Profile
          </a>
        </div>
      </div>`
  },

  async renderSection() {
    const grid = document.getElementById('contributorsGrid')
    const countEl = document.getElementById('contributorsCount')
    if (!grid) return

    const [contributors, commits, mergedPRs] = await Promise.all([
      this.fetchContributors().catch(() => []),
      this.fetchCommits().catch(() => []),
      this.fetchMergedPRs().catch(() => [])
    ])

    const contribMap = {}
    contributors.forEach(c => { contribMap[c.login] = c })
    mergedPRs.forEach(pr => {
      if (!contribMap[pr.login]) {
        contribMap[pr.login] = pr
      } else {
        contribMap[pr.login].contributions += 1
      }
    })

    const allContributors = Object.values(contribMap)

    if (!allContributors.length) {
      grid.innerHTML = '<div class="loading-cell"><i class="fas fa-users"></i> No contributors found yet. Be the first!</div>'
      return
    }

    if (countEl) countEl.textContent = allContributors.length

    const ownerHtml = this.renderOwnerProfile()
    const contribHtml = allContributors.map(c => {
      const role = this.getRoleFromCommits(c.login, commits)
      return this.renderContributor(c, role)
    }).filter(Boolean).join('')

    grid.innerHTML = ownerHtml + contribHtml
  },

  async renderStarBadge() {
    const starCount = await this.fetchStarCount()
    const el = document.getElementById('githubStars')
    const navEl = document.getElementById('navStars')
    if (el) el.textContent = starCount.toLocaleString()
    if (navEl) navEl.textContent = starCount.toLocaleString()
  }
}
