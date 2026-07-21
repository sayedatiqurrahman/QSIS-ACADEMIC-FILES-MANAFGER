const GITHUB = {
  owner: 'sayedatiqurrahman',
  repo: 'QSIS-ACADEMIC-FILES-MANAFGER',
  branch: 'main',
  token: null,
  api: 'https://api.github.com',

  setToken(t) { this.token = t; },

  headers(extra = {}) {
    const h = { Accept: 'application/vnd.github.v3+json', ...extra };
    if (this.token) h.Authorization = `token ${this.token}`;
    return h;
  },

  getUploadTreeCache() {
    try {
      const cached = JSON.parse(localStorage.getItem('qsis_tree_cache'));
      if (cached && cached.timestamp && Date.now() - cached.timestamp < 1800000) {
        return cached.tree;
      }
    } catch {}
    return null;
  },

  setUploadTreeCache(tree) {
    try {
      localStorage.setItem('qsis_tree_cache', JSON.stringify({ tree, timestamp: Date.now() }));
    } catch {}
  },

  async getContents(path = '') {
    const url = `${this.api}/repos/${this.owner}/${this.repo}/contents/${path.replace(/^\//, '')}?ref=${this.branch}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  },

  async getTree(recursive = true) {
    const url = `${this.api}/repos/${this.owner}/${this.repo}/git/trees/${this.branch}?recursive=${recursive ? 1 : 0}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  },

  async getUploadTree(recursive = true) {
    const cached = this.getUploadTreeCache();
    if (cached) return { tree: cached };

    const fullTree = await this.getTree(recursive);
    const prefix = CONFIG.uploadPath + '/';
    fullTree.tree = fullTree.tree.filter(item =>
      item.path.startsWith(prefix) && item.path !== prefix
    ).map(item => ({
      ...item,
      path: item.path.substring(prefix.length)
    }));
    this.setUploadTreeCache(fullTree.tree);
    return fullTree;
  },

  async createFile(path, content, message = 'Upload academic file') {
    const url = `${this.api}/repos/${this.owner}/${this.repo}/contents/${path}`;
    const encoded = btoa(unescape(encodeURIComponent(content)));
    const body = { message, content: encoded, branch: this.branch };
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `Create file error: ${res.status}`);
    }
    return res.json();
  },

  async uploadFileAsPR(filePath, content, message = 'New file submission for review') {
    const branchName = `upload/${Date.now()}`;
    const fullPath = CONFIG.uploadPath + '/' + filePath;

    const refRes = await fetch(`${this.api}/repos/${this.owner}/${this.repo}/git/refs/heads/${this.branch}`, {
      headers: this.headers()
    });
    if (!refRes.ok) throw new Error('Failed to get base ref');
    const refData = await refRes.json();
    const baseSha = refData.object.sha;

    const branchRes = await fetch(`${this.api}/repos/${this.owner}/${this.repo}/git/refs`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha })
    });
    if (!branchRes.ok) throw new Error('Failed to create branch');

    const encoded = btoa(unescape(encodeURIComponent(content)));
    const createRes = await fetch(`${this.api}/repos/${this.owner}/${this.repo}/contents/${fullPath}`, {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message, content: encoded, branch: branchName })
    });
    if (!createRes.ok) throw new Error('Failed to create file on branch');

    const prRes = await fetch(`${this.api}/repos/${this.owner}/${this.repo}/pulls`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: message,
        body: `## New File Submission\n\n**File:** \`${fullPath}\`\n\nPending review.`,
        head: branchName,
        base: this.branch
      })
    });
    if (!prRes.ok) throw new Error('Failed to create pull request');
    return prRes.json();
  }
};
