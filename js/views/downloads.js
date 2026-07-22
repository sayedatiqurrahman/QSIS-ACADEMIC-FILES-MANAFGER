const DownloadsView = {
  render() {
    return '<main class="max-w-[800px] mx-auto py-5 px-5">' +
      '<div class="flex items-center justify-between mb-5 pb-4 border-b border-dark-border">' +
        '<h2 class="text-[1.3rem] font-semibold flex items-center gap-2"><i class="fas fa-download"></i> Downloads</h2>' +
        '<div class="flex items-center gap-2">' +
          '<span id="cacheSize" class="text-[0.75rem] text-dark-text2 self-center"></span>' +
          '<button class="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-xl border border-danger text-danger cursor-pointer text-[0.75rem] font-semibold bg-transparent hover:bg-[rgba(239,68,68,.1)] transition-all" onclick="DownloadsView.clearAllCache()">' +
            '<i class="fas fa-trash"></i> Clear All' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div id="cachedList" class="flex flex-col gap-2">' +
        '<div class="text-center py-10 text-dark-text2"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>' +
      '</div>' +
    '</main>';
  },

  async init() {
    await waitForDB();
    this.loadCached();
  },

  destroy() {},

  formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  },

  async loadCached() {
    var list = document.getElementById('cachedList');
    if (!list) return;
    try {
      var items = await DB.cacheGetAll();
      if (!items || items.length === 0) {
        list.innerHTML = '<div class="text-center py-10 text-dark-text2"><i class="fas fa-download"></i><p>No downloaded files yet.<br>Open a file and tap Download to cache it offline.</p><a href="#/" class="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl border border-dark-border bg-transparent text-dark-text cursor-pointer text-[0.8rem] font-semibold no-underline mt-3"><i class="fas fa-home"></i> Browse Files</a></div>';
        return;
      }

      var totalSize = 0;
      items.forEach(function(i) { totalSize += i.size || 0; });
      var sizeEl = document.getElementById('cacheSize');
      if (sizeEl) sizeEl.textContent = items.length + ' files \u00B7 ' + this.formatSize(totalSize);

      var self = this;
      list.innerHTML = items.map(function(item) {
        var id = DB.makeId(item.path);
        return '<div class="flex items-center gap-3 p-3 bg-dark-bg2 border border-dark-border rounded-xl transition-all hover:border-qsis" id="cache-' + id + '">' +
          '<div class="text-[1.4rem] flex-shrink-0">' + getFileIconByType(item.mimeType) + '</div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="font-semibold text-[0.85rem] whitespace-nowrap overflow-hidden text-ellipsis">' + esc(item.name) + '</div>' +
            '<div class="text-[0.72rem] text-dark-text2 mt-0.5">' + self.formatSize(item.size) + ' &middot; ' + (item.editedAt ? 'Edited ' + timeAgo(item.editedAt) : 'Cached ' + timeAgo(item.cachedAt)) + '</div>' +
          '</div>' +
          '<div class="flex gap-1 flex-shrink-0">' +
            '<button class="bg-transparent border border-dark-border text-dark-text2 cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-dark-bg3 hover:text-qsis hover:border-qsis transition-all" title="Preview" onclick="DownloadsView.previewCached(\'' + id + '\')"><i class="fas fa-eye"></i></button>' +
            '<button class="bg-transparent border border-accent text-accent cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-[rgba(16,185,129,.15)] transition-all" title="Save to device" onclick="DownloadsView.saveToDevice(\'' + id + '\',\'' + esc(item.name).replace(/'/g, "&#39;") + '\')"><i class="fas fa-share-alt"></i></button>' +
            '<button class="bg-transparent border border-danger text-danger cursor-pointer w-[30px] h-[30px] rounded-md inline-flex items-center justify-center text-[0.8rem] hover:bg-[rgba(239,68,68,.1)] transition-all" title="Remove" onclick="DownloadsView.removeCache(\'' + id + '\')"><i class="fas fa-trash"></i></button>' +
          '</div>' +
        '</div>';
      }).join('');
    } catch (err) {
      list.innerHTML = '<div class="text-center py-10 text-dark-text2"><i class="fas fa-exclamation-triangle"></i><p>Failed to load downloads.</p></div>';
    }
  },

  async saveToDevice(id, name) {
    var item = await DB.cacheGet(id);
    if (!item || !item.blob) { showToast('File not found.', 'error'); return; }
    var url = URL.createObjectURL(item.blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Saving: ' + name, 'info');
  },

  async removeCache(id) {
    await DB.cacheDelete(id);
    showToast('Removed', 'info');
    this.loadCached();
  },

  async clearAllCache() {
    if (!confirm('Delete all cached files?')) return;
    await DB.cacheClear();
    showToast('All downloads cleared', 'info');
    this.loadCached();
  }
};
