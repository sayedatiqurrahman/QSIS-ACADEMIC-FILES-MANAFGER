const GITHUB = {
  api: 'https://api.github.com',

  headers(extra = {}) {
    const h = { Accept: 'application/vnd.github.v3+json', ...extra };
    const token = AUTH.getToken();
    if (token) h.Authorization = `token ${token}`;
    return h;
  },

  async getContents(path = '') {
    const url = `${this.api}/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path.replace(/^\//, '')}?ref=${CONFIG.branch}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  },

  async getTree(recursive = true) {
    const url = `${this.api}/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/${CONFIG.branch}?recursive=${recursive ? 1 : 0}`;
    const res = await fetch(url, { headers: this.headers() });
    if (res.status === 403) {
      var errData = await res.json().catch(function() { return {}; });
      if (errData.message && errData.message.includes('rate limit')) {
        throw new Error('GitHub API rate limit. Login for higher limits, or wait 1 hour.');
      }
    }
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  },

  async getUploadTree(recursive = true) {
    const fullTree = await this.getTree(recursive);
    const prefix = CONFIG.uploadPath + '/';
    fullTree.tree = fullTree.tree.filter(item =>
      item.path.startsWith(prefix) && item.path !== prefix
    ).map(item => ({
      ...item,
      path: item.path.substring(prefix.length)
    }));
    return fullTree;
  },

  async forkRepo() {
    const res = await fetch(`${this.api}/repos/${CONFIG.owner}/${CONFIG.repo}/forks`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ default_branch_only: true })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to fork repository');
    }
    return res.json();
  },

  async waitForFork(forkOwner, maxWait = 30000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      try {
        const res = await fetch(`${this.api}/repos/${forkOwner}/${CONFIG.repo}`, {
          headers: this.headers()
        });
        if (res.ok) {
          const data = await res.json();
          if (data.default_branch) return data;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Fork creation timed out');
  },

  async getForkDefaultBranch(forkOwner) {
    const res = await fetch(`${this.api}/repos/${forkOwner}/${CONFIG.repo}`, {
      headers: this.headers()
    });
    if (!res.ok) throw new Error('Cannot access fork');
    const data = await res.json();
    return data.default_branch;
  },

  async createBranchOnFork(forkOwner, branchName) {
    const baseBranch = await this.getForkDefaultBranch(forkOwner);
    const refRes = await fetch(`${this.api}/repos/${forkOwner}/${CONFIG.repo}/git/refs/heads/${baseBranch}`, {
      headers: this.headers()
    });
    if (!refRes.ok) throw new Error('Failed to get fork base ref');
    const refData = await refRes.json();
    const baseSha = refData.object.sha;

    const branchRes = await fetch(`${this.api}/repos/${forkOwner}/${CONFIG.repo}/git/refs`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha })
    });
    if (!branchRes.ok) throw new Error('Failed to create branch on fork');
    return branchName;
  },

  async commitFileToBranch(forkOwner, branch, filePath, content, message) {
    const fullPath = CONFIG.uploadPath + '/' + filePath;
    const encoded = btoa(unescape(encodeURIComponent(content)));
    const res = await fetch(`${this.api}/repos/${forkOwner}/${CONFIG.repo}/contents/${fullPath}`, {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message, content: encoded, branch })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to commit file');
    }
    return res.json();
  },

  async commitBinaryFileToBranch(forkOwner, branch, filePath, base64Content, message) {
    const fullPath = CONFIG.uploadPath + '/' + filePath;
    const res = await fetch(`${this.api}/repos/${forkOwner}/${CONFIG.repo}/contents/${fullPath}`, {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message, content: base64Content, branch })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to commit file');
    }
    return res.json();
  },

  async createCrossRepoPR(forkOwner, branch, title, body) {
    const res = await fetch(`${this.api}/repos/${CONFIG.owner}/${CONFIG.repo}/pulls`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title,
        body,
        head: `${forkOwner}:${branch}`,
        base: CONFIG.branch
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create pull request');
    }
    return res.json();
  },

  async checkExistingFork() {
    const user = AUTH.getUser();
    if (!user) return null;
    try {
      const res = await fetch(`${this.api}/repos/${user.login}/${CONFIG.repo}`, {
        headers: this.headers()
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },

  async uploadFilesViaFork(files, metadata) {
    const user = AUTH.getUser();
    if (!user) throw new Error('Not logged in');
    if (!AUTH.canUpload()) throw new Error('Email not verified');

    showToast('Checking for fork...', 'info');
    let fork = await this.checkExistingFork();
    if (!fork) {
      showToast('Creating fork of repository...', 'info');
      fork = await this.forkRepo();
      await this.waitForFork(user.login);
    }

    const branchName = `upload/${Date.now()}`;
    showToast('Creating upload branch...', 'info');
    await this.createBranchOnFork(user.login, branchName);

    const commitMsg = `Add academic files via QSIS-ARMS`;
    let uploadedCount = 0;

    for (const file of files) {
      try {
        const base64 = await this._fileToBase64(file.data);
        await this.commitBinaryFileToBranch(
          user.login,
          branchName,
          file.path,
          base64,
          commitMsg
        );
        uploadedCount++;
        showToast(`Uploaded ${uploadedCount}/${files.length}: ${file.name}`, 'info');
      } catch (err) {
        console.error('Failed to upload', file.name, err);
        showToast(`Failed: ${file.name} - ${err.message}`, 'error');
      }
    }

    if (uploadedCount === 0) {
      throw new Error('No files were uploaded successfully');
    }

    const studentName = metadata.name || '';
    const qsId = metadata.qsId || '';
    const whatsapp = metadata.whatsapp || '';
    const semester = metadata.semester || '';
    const category = metadata.category || '';

    const prBody = `## New File Submission

| Field | Value |
|-------|-------|
| **Student Name** | ${studentName} |
| **QSIS ID** | ${qsId} |
| **WhatsApp** | ${whatsapp} |
| **Semester** | ${semester} |
| **Category** | ${category} |
| **Files Uploaded** | ${uploadedCount} |

---
> Submitted via [QSIS-ARMS](https://qsis-arms.eu.cc) web interface.`;

    showToast('Creating Pull Request...', 'info');
    const pr = await this.createCrossRepoPR(
      user.login,
      branchName,
      `QSIS-ARMS: ${studentName} (${qsId}) - ${uploadedCount} file(s)`,
      prBody
    );

    showToast(`PR created! ${uploadedCount} files submitted.`, 'success');
    return pr;
  },

  _fileToBase64(arrayBuffer) {
    return new Promise((resolve, reject) => {
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      resolve(btoa(binary));
    });
  }
};
