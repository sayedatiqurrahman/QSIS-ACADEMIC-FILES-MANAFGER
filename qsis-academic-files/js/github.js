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

  async getContents(path = '') {
    const url = `${this.api}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path)}?ref=${this.branch}`;
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

  async getFile(path) {
    const data = await this.getContents(path);
    if (data.content) {
      data.decoded = atob(data.content.replace(/\n/g, ''));
    }
    return data;
  },

  async createFile(path, content, message = 'Upload academic file') {
    const url = `${this.api}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path)}`;
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

    // Get base tree SHA
    const refRes = await fetch(`${this.api}/repos/${this.owner}/${this.repo}/git/refs/heads/${this.branch}`, {
      headers: this.headers()
    });
    if (!refRes.ok) throw new Error('Failed to get base ref');
    const refData = await refRes.json();
    const baseSha = refData.object.sha;

    // Create new branch
    const branchRes = await fetch(`${this.api}/repos/${this.owner}/${this.repo}/git/refs`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha })
    });
    if (!branchRes.ok) throw new Error('Failed to create branch');

    // Create file on new branch
    const encoded = btoa(unescape(encodeURIComponent(content)));
    const createRes = await fetch(`${this.api}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message, content: encoded, branch: branchName })
    });
    if (!createRes.ok) throw new Error('Failed to create file on branch');

    // Create PR
    const prRes = await fetch(`${this.api}/repos/${this.owner}/${this.repo}/pulls`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: message,
        body: `## 📁 New File Submission\n\n**File:** \`${filePath}\`\n\nThis submission is pending review. Please check the file and merge if appropriate.`,
        head: branchName,
        base: this.branch
      })
    });
    if (!prRes.ok) throw new Error('Failed to create pull request');
    return prRes.json();
  }
};
