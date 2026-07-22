const HistoryView = {
  render() {
    return `
      <main class="max-w-[800px] mx-auto py-5 px-5">
        <div class="flex items-center justify-between mb-5 pb-4 border-b border-dark-border">
          <h2 class="text-[1.3rem] font-semibold flex items-center gap-2"><i class="fas fa-clock"></i> Read History</h2>
          <div class="flex gap-2">
            <button class="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-xl border border-danger text-danger cursor-pointer text-[0.75rem] font-semibold bg-transparent hover:bg-[rgba(239,68,68,.1)] transition-all" onclick="HistoryView.clearHistory()">
              <i class="fas fa-trash"></i> Clear All
            </button>
          </div>
        </div>
        <div id="historyList" class="flex flex-col gap-2">
          <div class="text-center py-10 text-dark-text2"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>
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
        list.innerHTML = '<div class="text-center py-10 text-dark-text2"><i class="fas fa-clock"></i><p>No read history yet. Open a file to get started.</p><a href="#/" class="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl bg-gradient-to-br from-qsis to-qsis-dark text-white border-none shadow-[0_0_16px_rgba(34,197,94,0.3)] cursor-pointer text-[0.8rem] font-semibold no-underline mt-3"><i class="fas fa-home"></i> Go to Files</a></div>';
        return;
      }
      list.innerHTML = items.map(item => {
        const id = DB.makeId(item.path);
        return '<div class="flex items-center gap-3 p-3 bg-dark-bg2 border border-dark-border rounded-xl transition-all hover:border-qsis">' +
          '<div class="text-[1.4rem] flex-shrink-0">' + getFileIconByType(item.mimeType) + '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="font-semibold text-[0.85rem] whitespace-nowrap overflow-hidden text-ellipsis">' + esc(item.name) + '</div>' +
            '<div class="text-[0.72rem] text-dark-text2 mt-0.5">' + esc(item.path) + ' &middot; ' + timeAgo(item.lastRead) + '</div>' +
          '</div>' +
          '<div class="flex gap-1 flex-shrink-0">' +
            '<button class="bg-transparent border border-dark-border text-dark-text2 cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-dark-bg3 hover:text-qsis hover:border-qsis transition-all" title="Open" onclick="HistoryView.openItem(\'' + esc(item.path) + '\',\'' + esc(item.mimeType) + '\')"><i class="fas fa-eye"></i></button>' +
            '<button class="bg-transparent border border-dark-border text-dark-text2 cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-dark-bg3 hover:text-danger hover:border-danger transition-all" title="Remove" onclick="HistoryView.removeHistory(\'' + id + '\')"><i class="fas fa-trash"></i></button>' +
          '</div>' +
        '</div>';
      }).join('');
    } catch (err) {
      list.innerHTML = '<div class="text-center py-10 text-dark-text2"><i class="fas fa-exclamation-triangle"></i><p>Failed to load history.</p></div>';
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
