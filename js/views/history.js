const HistoryView = {
  render() {
    return `
      <main class="main-content" style="max-width:800px;margin:0 auto;padding:20px">
        <div class="page-header">
          <h2><i class="fas fa-clock"></i> Read History</h2>
          <div class="page-actions">
            <button class="btn btn-sm btn-outline" onclick="HistoryView.clearHistory()" style="border-color:var(--danger);color:var(--danger)">
              <i class="fas fa-trash"></i> Clear All
            </button>
          </div>
        </div>
        <div id="historyList" style="display:flex;flex-direction:column;gap:8px">
          <div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>
        </div>
      </main>`;
  },

  async init() {
    await waitForDB();
    this.loadHistory();
  },

  destroy() {},

  async loadHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;
    try {
      const items = await DB.historyGetAll();
      if (!items || items.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><p>No read history yet. Open a file to get started.</p><a href="#/" class="btn btn-glow btn-sm" style="margin-top:12px"><i class="fas fa-home"></i> Go to Files</a></div>';
        return;
      }
      list.innerHTML = items.map(item => {
        const id = DB.makeId(item.path);
        return '<div class="list-item">' +
          '<div class="list-item-icon">' + getFileIconByType(item.mimeType) + '</div>' +
          '<div class="list-item-info">' +
            '<div class="list-item-name">' + esc(item.name) + '</div>' +
            '<div class="list-item-meta">' + esc(item.path) + ' &middot; ' + timeAgo(item.lastRead) + '</div>' +
          '</div>' +
          '<div class="list-item-actions">' +
            '<button class="btn-action" title="Open" onclick="HistoryView.openItem(\'' + esc(item.path) + '\',\'' + esc(item.mimeType) + '\')"><i class="fas fa-eye"></i></button>' +
            '<button class="btn-action" title="Remove" onclick="HistoryView.removeHistory(\'' + id + '\')"><i class="fas fa-trash"></i></button>' +
          '</div>' +
        '</div>';
      }).join('');
    } catch (err) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load history.</p></div>';
    }
  },

  openItem(path, mime) {
    var rawUrl = 'https://raw.githubusercontent.com/' + CONFIG.owner + '/' + CONFIG.repo + '/' + CONFIG.branch + '/' + CONFIG.uploadPath + '/' + path;
    var item = { path: path, name: path.split('/').pop(), mimeType: mime, rawUrl: rawUrl };
    var id = DB.makeId(path);
    DB.cacheGet(id).then(function(cached) {
      if (cached && cached.blob) {
        openViewerFromBlob(item, cached.blob);
      } else {
        openViewer(item);
      }
    });
  },

  async removeHistory(id) {
    await DB.historyDelete(id);
    showToast('Removed', 'info');
    this.loadHistory();
  },

  async clearHistory() {
    if (!confirm('Clear all read history?')) return;
    await DB.historyClear();
    showToast('History cleared', 'info');
    this.loadHistory();
  }
};
