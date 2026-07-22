function waitForDB() {
  return new Promise(function(resolve) {
    if (DB && DB.db) { resolve(); return; }
    var check = setInterval(function() { if (DB && DB.db) { clearInterval(check); resolve(); } }, 100);
  });
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function() {});
  }
}

function getMimeFromExt(ext) {
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc','docx'].includes(ext)) return 'doc';
  if (['xls','xlsx','csv'].includes(ext)) return 'sheet';
  if (['ppt','pptx'].includes(ext)) return 'ppt';
  return 'other';
}

function getFileIconByType(mime) {
  if (mime === 'image') return '<i class="fas fa-file-image" style="color:#34d399"></i>';
  if (mime === 'pdf') return '<i class="fas fa-file-pdf" style="color:#ef4444"></i>';
  if (mime === 'doc') return '<i class="fas fa-file-word" style="color:#3b82f6"></i>';
  if (mime === 'sheet') return '<i class="fas fa-file-excel" style="color:#22c55e"></i>';
  if (mime === 'ppt') return '<i class="fas fa-file-powerpoint" style="color:#f59e0b"></i>';
  return '<i class="fas fa-file" style="color:#94a3b8"></i>';
}

function esc(text) {
  var d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML.replace(/'/g, '&#39;');
}

function timeAgo(ts) {
  var d = Date.now() - ts;
  if (d < 60000) return 'Just now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  return Math.floor(d / 86400000) + 'd ago';
}

function toggleTheme() {
  var c = document.documentElement.getAttribute('data-theme');
  var n = c === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', n);
  localStorage.setItem('qsis-theme', n);
  var icon = document.querySelector('.theme-toggle i');
  if (icon) icon.className = n === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function loadTheme() {
  var s = localStorage.getItem('qsis-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', s);
  var icon = document.querySelector('.theme-toggle i');
  if (icon) icon.className = s === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function showToast(msg, type) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'fixed bottom-5 right-5 px-5 py-3 rounded-xl text-white font-semibold text-[0.85rem] z-[2000] transition-all duration-300 ' + (type || 'info') + ' show';
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.classList.remove('show'); }, 3500);
}

function toggleNav() {
  var el = document.getElementById('navActionsMobile');
  if (el) el.classList.toggle('hidden');
}

function showUploadModal() {
  if (!AUTH.isLoggedIn()) {
    AUTH.showAuthModal();
    return;
  }
  if (!AUTH.isEmailVerified()) {
    AUTH.showAuthModal();
    showToast('Verify your university email first', 'info');
    return;
  }
  document.getElementById('uploadModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  var m = document.getElementById(id);
  if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
}

function showUploadTab(tab) {
  document.querySelectorAll('.upload-tab').forEach(function(t) { t.classList.add('hidden'); });
  document.querySelectorAll('.upload-tab-btn').forEach(function(b) { b.classList.remove('active'); });
  var target = document.getElementById('uploadTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (target) target.classList.remove('hidden');
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

function updateAuthUI() {
  var authBtn = document.getElementById('authBtn');
  var uploadBtn = document.getElementById('uploadBtn');
  var profileAvatar = document.getElementById('profileAvatar');
  var profileName = document.getElementById('profileName');
  var profileEmail = document.getElementById('profileEmail');
  var mobileAuthArea = document.getElementById('mobileAuthArea');

  if (AUTH.isLoggedIn()) {
    var user = AUTH.getUser();
    if (authBtn) {
      authBtn.innerHTML = '<img src="' + (user?.avatar_url || '') + '" alt="" style="width:22px;height:22px;border-radius:50%" /> ' + (user?.login || 'Account');
    }
    if (profileAvatar) profileAvatar.src = user?.avatar_url || '';
    if (profileName) profileName.textContent = user?.name || user?.login || 'User';
    if (profileEmail) profileEmail.textContent = user?.login ? '@' + user.login : '';
    if (uploadBtn) uploadBtn.style.display = '';
    if (mobileAuthArea) {
      mobileAuthArea.innerHTML =
        '<button class="w-full inline-flex items-center justify-center gap-[6px] px-4 py-2 rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.8rem] font-semibold" onclick="AUTH.logout()">' +
          '<img src="' + (user?.avatar_url || '') + '" alt="" style="width:18px;height:18px;border-radius:50%" /> ' + (user?.login || 'Account') +
          ' <i class="fas fa-sign-out-alt ml-auto"></i>' +
        '</button>';
    }
  } else {
    if (authBtn) authBtn.innerHTML = '<i class="fas fa-user"></i> Login';
    if (uploadBtn) uploadBtn.style.display = '';
    if (mobileAuthArea) {
      mobileAuthArea.innerHTML = '<button class="w-full inline-flex items-center justify-center gap-[6px] px-4 py-2 rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.8rem] font-semibold" onclick="AUTH.showAuthModal()"><i class="fas fa-user"></i> Login</button>';
    }
  }
}

async function checkCachedButtons() {
  var cards = document.querySelectorAll('[id^="file-"]');
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var id = card.id.replace('file-', '');
    var cached = await DB.cacheGet(id);
    if (cached) {
      var dl = document.getElementById('dl-' + id);
      var sv = document.getElementById('sv-' + id);
      if (dl) dl.style.display = 'none';
      if (sv) sv.style.display = '';
    }
  }
}

async function downloadToCache(path, name, mime) {
  var id = DB.makeId(path);
  var rawUrl = 'https://raw.githubusercontent.com/' + CONFIG.owner + '/' + CONFIG.repo + '/' + CONFIG.branch + '/' + CONFIG.uploadPath + '/' + path;
  var dl = document.getElementById('dl-' + id);
  var sv = document.getElementById('sv-' + id);

  if (dl) { dl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; dl.disabled = true; }

  try {
    var res = await fetch(rawUrl);
    if (!res.ok) throw new Error('Download failed');
    var blob = await res.blob();
    var item = { path: path, name: name, mimeType: mime, ext: name.split('.').pop(), size: blob.size };
    await DB.cacheFile(item, blob);

    if (dl) dl.style.display = 'none';
    if (sv) sv.style.display = '';
    showToast('Downloaded: ' + name, 'success');
  } catch (err) {
    console.error(err);
    if (dl) { dl.innerHTML = '<i class="fas fa-download"></i>'; dl.disabled = false; }
    showToast('Download failed. Try again.', 'error');
  }
}

async function saveAsFile(path, name) {
  var id = DB.makeId(path);
  var cached = await DB.cacheGet(id);
  if (!cached || !cached.blob) {
    showToast('File not cached. Download it first.', 'error');
    return;
  }
  var url = URL.createObjectURL(cached.blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Saving: ' + name, 'info');
}

var _currentViewerItem = null;

function viewerDownloadAction() {
  if (!_currentViewerItem) return;
  downloadToCache(_currentViewerItem.path, _currentViewerItem.name, _currentViewerItem.mimeType);
}

function viewerSaveAction() {
  if (!_currentViewerItem) return;
  saveAsFile(_currentViewerItem.path, _currentViewerItem.name);
}

function openViewer(item) {
  if (!item) return;
  _currentViewerItem = item;
  var viewer = document.getElementById('fileViewer');
  var viewerTitle = document.getElementById('viewerTitle');
  var viewerBody = document.getElementById('viewerBody');
  if (!viewer) return;

  viewerTitle.textContent = item.name;

  var id = DB.makeId(item.path);
  DB.cacheGet(id).then(function(cached) {
    if (cached && cached.blob) {
      document.getElementById('viewerDownloadBtn').classList.add('hidden');
      document.getElementById('viewerSaveAsBtn').classList.remove('hidden');
    } else {
      document.getElementById('viewerDownloadBtn').classList.remove('hidden');
      document.getElementById('viewerSaveAsBtn').classList.add('hidden');
    }
  });

  if (item.mimeType === 'pdf') openPdfViewer(item.rawUrl, viewerBody, item.path);
  else if (item.mimeType === 'image') openImageViewer(item.rawUrl, item.name, viewerBody);
  else if (item.mimeType === 'doc') openDocViewer(item.rawUrl, item.name, viewerBody);
  else if (item.mimeType === 'sheet') openSheetViewer(item.rawUrl, item.name, viewerBody);
  else if (item.mimeType === 'ppt') openOfficeViewer(item.rawUrl, item.name, 'powerpoint', viewerBody);
  else {
    openOfficeViewer(item.rawUrl, item.name, 'office', viewerBody);
  }

  viewer.classList.add('active');
  document.body.style.overflow = 'hidden';
  DB.historyAdd(item);
}

function openViewerFromBlob(item, blob) {
  if (!item || !blob) return;
  _currentViewerItem = item;
  var viewer = document.getElementById('fileViewer');
  var viewerTitle = document.getElementById('viewerTitle');
  var viewerBody = document.getElementById('viewerBody');
  if (!viewer) return;

  viewerTitle.textContent = item.name;
  document.getElementById('viewerDownloadBtn').classList.add('hidden');
  document.getElementById('viewerSaveAsBtn').classList.remove('hidden');

  var url = URL.createObjectURL(blob);
  if (item.mimeType === 'pdf') openPdfViewer(url, viewerBody, item.path);
  else if (item.mimeType === 'image') openImageViewer(url, item.name, viewerBody);
  else {
    viewerBody.innerHTML = '<div class="viewer-fallback"><i class="fas fa-file" style="font-size:3rem;color:#94a3b8;margin-bottom:16px"></i><p>File cached. Use "Save" to save to device.</p></div>';
  }
  viewer.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeViewer() {
  var viewer = document.getElementById('fileViewer');
  if (viewer) viewer.classList.remove('active');
  document.body.style.overflow = '';
  pdfFilePath = '';
  _currentViewerItem = null;
  if (document.fullscreenElement) document.exitFullscreen();
  var body = document.getElementById('viewerBody');
  if (body) body.innerHTML = '';
  var viewerHeader = document.querySelector('#fileViewer .flex.items-center.justify-between');
  if (viewerHeader) viewerHeader.classList.remove('hidden');
}

var pdfFilePath = '';

function openPdfViewer(url, container, filePath) {
  pdfFilePath = filePath || '';
  var fileName = filePath ? filePath.split('/').pop() : 'document.pdf';
  var viewerHeader = document.querySelector('#fileViewer .flex.items-center.justify-between');

  if (typeof AdobeDC !== 'undefined' && CONFIG.adobeClientId) {
    if (viewerHeader) viewerHeader.classList.add('hidden');
    openAdobePdf(url, container, filePath, fileName);
    return;
  }

  if (viewerHeader) viewerHeader.classList.add('hidden');
  container.innerHTML = '<div class="flex flex-col items-center justify-center h-full gap-3" style="color:#94a3b8"><i class="fas fa-spinner fa-spin text-2xl"></i><p style="font-size:0.85rem">Loading Adobe PDF viewer...</p></div>';

  function onAdobeReady() {
    if (typeof AdobeDC !== 'undefined' && CONFIG.adobeClientId) {
      openAdobePdf(url, container, filePath, fileName);
    } else {
      fallbackToPdfJs(url, container, filePath, fileName);
    }
  }

  if (typeof AdobeDC !== 'undefined') {
    onAdobeReady();
    return;
  }

  document.addEventListener('adobe_dc_view_sdk.ready', function handler() {
    document.removeEventListener('adobe_dc_view_sdk.ready', handler);
    onAdobeReady();
  });

  var attempts = 0;
  var checkAdobe = setInterval(function() {
    attempts++;
    if (typeof AdobeDC !== 'undefined') {
      clearInterval(checkAdobe);
      onAdobeReady();
    } else if (attempts >= 40) {
      clearInterval(checkAdobe);
      fallbackToPdfJs(url, container, filePath, fileName);
    }
  }, 500);
}

function openAdobePdf(url, container, filePath, fileName) {
  var divId = 'adobe-pdf-' + Date.now();
  container.innerHTML =
    '<div id="' + divId + '" style="width:100%;height:100%;position:relative">' +
      '<button id="adobeCloseBtn" onclick="closeViewer()" title="Close PDF" style="position:absolute;top:8px;left:8px;z-index:9999;width:32px;height:32px;border-radius:8px;background:#ef4444;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.4);transition:all .15s" onmouseover="this.style.background=\'#dc2626\';this.style.transform=\'scale(1.1)\'" onmouseout="this.style.background=\'#ef4444\';this.style.transform=\'scale(1)\'"><i class="fas fa-times"></i></button>' +
    '</div>';

  try {
    var adobeDCView = new AdobeDC.View({ clientId: CONFIG.adobeClientId, divId: divId });
    adobeDCView.previewFile({
      content: { location: { url: url } },
      metaData: { fileName: fileName }
    }, {}).then(function(adobeViewer) {
      if (filePath) {
        var item = { path: filePath, name: fileName, mimeType: 'pdf', rawUrl: url };
        DB.historyAdd(item);
      }
    }).catch(function(err) {
      console.warn('Adobe preview failed:', err);
      fallbackToPdfJs(url, container, filePath, fileName);
    });
  } catch (err) {
    console.warn('Adobe viewer init failed:', err);
    fallbackToPdfJs(url, container, filePath, fileName);
  }
}

function fallbackToPdfJs(url, container, filePath, fileName) {
  var viewerHeader = document.querySelector('#fileViewer .flex.items-center.justify-between');
  if (viewerHeader) viewerHeader.classList.remove('hidden');
  if (typeof pdfjsLib !== 'undefined') {
    openPdfJs(url, container, filePath, fileName);
  } else {
    container.innerHTML = '<div class="viewer-fallback"><i class="fas fa-file-pdf" style="font-size:3rem;color:#ef4444;margin-bottom:16px"></i><p>PDF viewer unavailable.</p><a href="' + url + '" target="_blank" class="auth-btn-primary" style="display:inline-flex;width:auto;margin-top:12px;text-decoration:none"><i class="fas fa-external-link-alt"></i> Open in new tab</a></div>';
  }
}

function openPdfJs(url, container, filePath, fileName) {
  var pdfPageNum = 1;
  var pdfScale = 1.0;
  var pdfRotation = 0;
  var pdfDoc = null;
  var pdfCanvas = null;
  var pdfCtx = null;
  var pdfPageRendering = false;
  var pdfPageNumPending = null;

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  var theme = localStorage.getItem('qsis-theme') || 'dark';
  var bg = theme === 'dark' ? '#0a0f1e' : '#f5f5f5';
  var toolbarBg = theme === 'dark' ? '#1a2236' : '#e8e8e8';
  var textColor = theme === 'dark' ? '#e8edf5' : '#222';
  var border = theme === 'dark' ? '#2a3a5c' : '#ccc';

  container.innerHTML = '<div class="flex flex-col h-full" style="background:' + bg + ';color:' + textColor + '">' +
    '<div class="flex items-center justify-between py-1.5 px-3 border-b flex-shrink-0 gap-1.5 flex-wrap" style="background:' + toolbarBg + ';border-color:' + border + '">' +
      '<div class="flex items-center gap-1.5">' +
        '<button class="pdf-btn" id="pdfPrevBtn" title="Previous"><i class="fas fa-chevron-left"></i></button>' +
        '<span id="pdfPageInfo" class="text-[0.78rem] font-semibold whitespace-nowrap">1 / 1</span>' +
        '<button class="pdf-btn" id="pdfNextBtn" title="Next"><i class="fas fa-chevron-right"></i></button>' +
      '</div>' +
      '<div class="flex items-center gap-1.5">' +
        '<button class="pdf-btn" id="pdfZoomOutBtn" title="Zoom Out"><i class="fas fa-minus"></i></button>' +
        '<span id="pdfZoomInfo" class="text-[0.75rem] font-semibold min-w-[40px] text-center">100%</span>' +
        '<button class="pdf-btn" id="pdfZoomInBtn" title="Zoom In"><i class="fas fa-plus"></i></button>' +
        '<button class="pdf-btn" id="pdfFitBtn" title="Fit Page"><i class="fas fa-expand"></i></button>' +
        '<button class="pdf-btn" id="pdfRotateBtn" title="Rotate"><i class="fas fa-redo"></i></button>' +
      '</div>' +
      '<div class="flex items-center gap-1">' +
        '<button class="pdf-btn" id="pdfDownloadBtn" title="Download"><i class="fas fa-download"></i></button>' +
        '<button class="pdf-btn" id="pdfSaveAsBtn" title="Save as" style="display:none"><i class="fas fa-share-alt"></i></button>' +
        '<button class="pdf-btn" id="pdfFullscreenBtn" title="Fullscreen"><i class="fas fa-expand-arrows-alt"></i></button>' +
      '</div>' +
    '</div>' +
    '<div id="pdfViewerArea" class="flex-1 overflow-auto flex justify-center relative" style="background:' + bg + '">' +
      '<canvas id="pdfCanvas" class="my-3 mx-auto shadow-[0_2px_12px_rgba(0,0,0,0.3)] block"></canvas>' +
    '</div>' +
  '</div>';

  pdfCanvas = document.getElementById('pdfCanvas');
  pdfCtx = pdfCanvas.getContext('2d');

  function renderPage(num) {
    pdfPageRendering = true;
    pdfPageNum = num;
    pdfDoc.getPage(num).then(function(page) {
      var viewport = page.getViewport({ scale: pdfScale, rotation: pdfRotation });
      pdfCanvas.height = viewport.height;
      pdfCanvas.width = viewport.width;
      pdfCtx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
      pdfCtx.fillStyle = '#fff';
      pdfCtx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);
      page.render({ canvasContext: pdfCtx, viewport: viewport }).promise.then(function() {
        pdfPageRendering = false;
        document.getElementById('pdfPageInfo').textContent = pdfPageNum + ' / ' + pdfDoc.numPages;
        if (pdfPageNumPending !== null) {
          var next = pdfPageNumPending;
          pdfPageNumPending = null;
          renderPage(next);
        }
      });
    });
  }

  function queueRender(num) { if (pdfPageRendering) { pdfPageNumPending = num; } else { renderPage(num); } }

  document.getElementById('pdfPrevBtn').onclick = function() { if (pdfPageNum > 1) queueRender(pdfPageNum - 1); };
  document.getElementById('pdfNextBtn').onclick = function() { if (pdfDoc && pdfPageNum < pdfDoc.numPages) queueRender(pdfPageNum + 1); };
  document.getElementById('pdfZoomInBtn').onclick = function() { pdfScale = Math.min(pdfScale + 0.25, 3.0); document.getElementById('pdfZoomInfo').textContent = Math.round(pdfScale * 100) + '%'; if (pdfDoc) renderPage(pdfPageNum); };
  document.getElementById('pdfZoomOutBtn').onclick = function() { pdfScale = Math.max(pdfScale - 0.25, 0.5); document.getElementById('pdfZoomInfo').textContent = Math.round(pdfScale * 100) + '%'; if (pdfDoc) renderPage(pdfPageNum); };
  document.getElementById('pdfRotateBtn').onclick = function() { pdfRotation = (pdfRotation + 90) % 360; if (pdfDoc) renderPage(pdfPageNum); };
  document.getElementById('pdfFitBtn').onclick = function() {
    var area = document.getElementById('pdfViewerArea');
    if (!area || !pdfDoc) return;
    var w = area.clientWidth - 40;
    pdfDoc.getPage(pdfPageNum).then(function(page) {
      var vp = page.getViewport({ scale: 1, rotation: pdfRotation });
      pdfScale = w / vp.width;
      document.getElementById('pdfZoomInfo').textContent = Math.round(pdfScale * 100) + '%';
      renderPage(pdfPageNum);
    });
  };
  document.getElementById('pdfFullscreenBtn').onclick = function() { var el = container; if (el && el.requestFullscreen) el.requestFullscreen(); };
  document.getElementById('pdfDownloadBtn').onclick = function() {
    downloadToCache(filePath, fileName, 'pdf');
  };
  document.getElementById('pdfSaveAsBtn').onclick = function() { saveAsFile(filePath, fileName); };

  var id = DB.makeId(filePath);
  DB.cacheGet(id).then(function(cached) {
    if (cached && cached.blob) {
      document.getElementById('pdfDownloadBtn').classList.add('hidden');
      document.getElementById('pdfSaveAsBtn').classList.remove('hidden');
    }
  });

  pdfjsLib.getDocument(url).promise.then(function(doc) {
    pdfDoc = doc;
    document.getElementById('pdfPageInfo').textContent = '1 / ' + doc.numPages;
    renderPage(1);
  }).catch(function(err) {
    console.error('PDF.js error:', err);
    container.innerHTML = '<div class="viewer-fallback"><i class="fas fa-exclamation-triangle" style="font-size:2rem;color:#f59e0b;margin-bottom:12px"></i><p>Could not load PDF.</p><a href="' + url + '" target="_blank" class="auth-btn-primary" style="display:inline-flex;width:auto;margin-top:12px;text-decoration:none"><i class="fas fa-external-link-alt"></i> Open in new tab</a></div>';
  });
}

var imgZoom = 100, imgRotation = 0, imgPanX = 0, imgPanY = 0, imgDragging = false, imgDragStart = {x:0,y:0};
function openImageViewer(url, name, container) {
  imgZoom = 100; imgRotation = 0; imgPanX = 0; imgPanY = 0;
  container.innerHTML = '<div class="image-viewer-container">' +
    '<div class="image-toolbar">' +
      '<button class="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.75rem] font-semibold" onclick="imgZoomOut()"><i class="fas fa-minus"></i></button>' +
      '<span id="imgZoomInfo" class="text-[0.8rem] font-semibold min-w-[40px] text-center">100%</span>' +
      '<button class="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.75rem] font-semibold" onclick="imgZoomIn()"><i class="fas fa-plus"></i></button>' +
      '<button class="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.75rem] font-semibold" onclick="imgFit()"><i class="fas fa-expand"></i> Fit</button>' +
      '<button class="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.75rem] font-semibold" onclick="imgRotate()"><i class="fas fa-redo"></i></button>' +
      '<button class="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.75rem] font-semibold" id="imgHandBtn" onclick="imgToggleHand()"><i class="fas fa-hand-paper"></i></button>' +
    '</div>' +
    '<div class="image-scroll-area" id="imageScrollArea" style="cursor:default">' +
      '<img id="viewerImage" src="' + url + '" alt="' + esc(name) + '" draggable="false" />' +
    '</div>' +
  '</div>';

  var scrollArea = document.getElementById('imageScrollArea');
  scrollArea.addEventListener('mousedown', function(e) {
    if (imgZoom <= 100) return;
    e.preventDefault();
    imgDragging = true;
    imgDragStart = { x: e.clientX - imgPanX, y: e.clientY - imgPanY };
    scrollArea.style.cursor = 'grabbing';
  });
  document.addEventListener('mousemove', function(e) {
    if (!imgDragging) return;
    imgPanX = e.clientX - imgDragStart.x;
    imgPanY = e.clientY - imgDragStart.y;
    applyImgTransform();
  });
  document.addEventListener('mouseup', function() {
    if (imgDragging) {
      imgDragging = false;
      var scrollArea = document.getElementById('imageScrollArea');
      if (scrollArea) scrollArea.style.cursor = imgZoom > 100 ? 'grab' : 'default';
    }
  });

  scrollArea.addEventListener('wheel', function(e) {
    e.preventDefault();
    if (e.deltaY < 0) imgZoomIn(); else imgZoomOut();
  }, { passive: false });
}
function imgZoomIn() { imgZoom = Math.min(imgZoom + 15, 400); applyImgTransform(); }
function imgZoomOut() { imgZoom = Math.max(imgZoom - 15, 20); if (imgZoom <= 100) { imgPanX = 0; imgPanY = 0; } applyImgTransform(); }
function imgFit() { imgZoom = 100; imgRotation = 0; imgPanX = 0; imgPanY = 0; applyImgTransform(); }
function imgRotate() { imgRotation = (imgRotation + 90) % 360; applyImgTransform(); }
function imgToggleHand() {
  var scrollArea = document.getElementById('imageScrollArea');
  var btn = document.getElementById('imgHandBtn');
  if (!scrollArea || !btn) return;
  if (imgZoom <= 100) { imgZoom = 150; }
  applyImgTransform();
}
function applyImgTransform() {
  var img = document.getElementById('viewerImage');
  if (img) img.style.transform = 'translate(' + imgPanX + 'px,' + imgPanY + 'px) scale(' + (imgZoom / 100) + ') rotate(' + imgRotation + 'deg)';
  var info = document.getElementById('imgZoomInfo');
  if (info) info.textContent = Math.round(imgZoom) + '%';
  var scrollArea = document.getElementById('imageScrollArea');
  if (scrollArea) {
    scrollArea.style.cursor = imgZoom > 100 ? 'grab' : 'default';
  }
}

function openDocViewer(url, name, container) {
  var viewerHeader = document.querySelector('#fileViewer .flex.items-center.justify-between');
  if (typeof AdobeDC !== 'undefined' && CONFIG.adobeClientId) {
    if (viewerHeader) viewerHeader.classList.add('hidden');
    openAdobePdf(url, container, '', name);
  } else {
    container.innerHTML = '<div class="doc-viewer-container">' +
      '<div class="doc-toolbar">' +
        '<span><i class="fas fa-file-word" style="color:#3b82f6"></i> ' + esc(name) + '</span>' +
        '<a href="https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url) + '" target="_blank" class="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl border border-dark-border bg-transparent text-dark-text cursor-pointer text-[0.75rem] font-semibold no-underline"><i class="fas fa-external-link-alt"></i> Open in Office Online</a>' +
      '</div>' +
      '<iframe src="https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url) + '" style="width:100%;height:calc(100vh - 140px);border:none;border-radius:0 0 8px 8px"></iframe>' +
    '</div>';
  }
}

function openSheetViewer(url, name, container) {
  var viewerHeader = document.querySelector('#fileViewer .flex.items-center.justify-between');
  if (typeof AdobeDC !== 'undefined' && CONFIG.adobeClientId) {
    if (viewerHeader) viewerHeader.classList.add('hidden');
    openAdobePdf(url, container, '', name);
  } else {
    container.innerHTML = '<div class="doc-viewer-container">' +
      '<div class="doc-toolbar">' +
        '<span><i class="fas fa-file-excel" style="color:#22c55e"></i> ' + esc(name) + '</span>' +
        '<a href="https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url) + '" target="_blank" class="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl border border-dark-border bg-transparent text-dark-text cursor-pointer text-[0.75rem] font-semibold no-underline"><i class="fas fa-external-link-alt"></i> Open in Office Online</a>' +
      '</div>' +
      '<iframe src="https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url) + '" style="width:100%;height:calc(100vh - 140px);border:none;border-radius:0 0 8px 8px"></iframe>' +
    '</div>';
  }
}

function openOfficeViewer(url, name, type, container) {
  var viewerHeader = document.querySelector('#fileViewer .flex.items-center.justify-between');
  if (typeof AdobeDC !== 'undefined' && CONFIG.adobeClientId) {
    if (viewerHeader) viewerHeader.classList.add('hidden');
    openAdobePdf(url, container, '', name);
  } else {
    var icon = 'fa-file';
    var color = '#94a3b8';
    if (type === 'powerpoint') { icon = 'fa-file-powerpoint'; color = '#f59e0b'; }
    container.innerHTML = '<div class="doc-viewer-container">' +
      '<div class="doc-toolbar">' +
        '<span><i class="fas ' + icon + '" style="color:' + color + '"></i> ' + esc(name) + '</span>' +
        '<a href="https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url) + '" target="_blank" class="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl border border-dark-border bg-transparent text-dark-text cursor-pointer text-[0.75rem] font-semibold no-underline"><i class="fas fa-external-link-alt"></i> Open in Office Online</a>' +
      '</div>' +
      '<iframe src="https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url) + '" style="width:100%;height:calc(100vh - 140px);border:none;border-radius:0 0 8px 8px"></iframe>' +
    '</div>';
  }
}

var uploadFileQueue = [];

function onUploadFilePicked() {
  var input = document.getElementById('uploadFileInput');
  if (!input || !input.files) return;
  var picked = Array.from(input.files);
  var allowed = CONFIG.academicExtensions;
  var rejected = [];

  picked.forEach(function(f) {
    var ext = f.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      rejected.push(f.name);
      return;
    }
    if (uploadFileQueue.length >= CONFIG.maxFilesPerUpload) return;
    var duplicate = uploadFileQueue.some(function(q) { return q.name === f.name && q.size === f.size; });
    if (!duplicate) uploadFileQueue.push(f);
  });

  input.value = '';
  renderUploadQueue();

  if (rejected.length > 0) {
    showToast('Skipped: ' + rejected.join(', ') + ' (not allowed)', 'error');
  }
}

function removeFromUploadQueue(index) {
  uploadFileQueue.splice(index, 1);
  renderUploadQueue();
}

function renderUploadQueue() {
  var container = document.getElementById('uploadFileQueue');
  var label = document.getElementById('uploadFileLabel');
  var submitBtn = document.getElementById('uploadSubmitBtn');
  if (!container) return;

  if (uploadFileQueue.length === 0) {
    container.innerHTML = '';
    if (label) label.textContent = 'Tap to choose files';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  if (submitBtn) submitBtn.disabled = false;
  if (label) label.textContent = uploadFileQueue.length + ' file(s) selected — tap to add more';

  var totalSize = 0;
  var html = '<div class="flex flex-col gap-1.5">';
  uploadFileQueue.forEach(function(f, i) {
    totalSize += f.size;
    var ext = f.name.split('.').pop().toLowerCase();
    var icon = getFileIconByType(getMimeFromExt(ext));
    var size = f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : (f.size / 1024).toFixed(0) + ' KB';
    html += '<div class="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-dark-border bg-dark-bg3 text-[0.8rem]">' +
      '<span class="text-[1rem]">' + icon + '</span>' +
      '<span class="flex-1 min-w-0 truncate text-dark-text font-medium">' + esc(f.name) + '</span>' +
      '<span class="text-dark-text2 text-[0.72rem] whitespace-nowrap">' + size + '</span>' +
      '<button class="bg-transparent border-none text-dark-text2 cursor-pointer w-[24px] h-[24px] rounded-full flex items-center justify-center text-[0.75rem] hover:bg-danger hover:text-white transition-all" onclick="removeFromUploadQueue(' + i + ')" title="Remove"><i class="fas fa-times"></i></button>' +
    '</div>';
  });
  html += '</div>';

  var totalSizeLabel = totalSize > 1048576 ? (totalSize / 1048576).toFixed(1) + ' MB' : (totalSize / 1024).toFixed(0) + ' KB';
  var overSize = totalSize > CONFIG.maxUploadSizeMB * 1024 * 1024;
  html += '<p class="text-[0.72rem] mt-1.5 ' + (overSize ? 'text-danger' : 'text-dark-text2') + '">Total: ' + totalSizeLabel + ' / ' + CONFIG.maxUploadSizeMB + 'MB' + (overSize ? ' — exceeds limit' : '') + '</p>';

  container.innerHTML = html;

  if (submitBtn) submitBtn.disabled = overSize;
}

async function handleUpload() {
  var semSelect = document.getElementById('uploadSemester');
  var catSelect = document.getElementById('uploadCategory');
  var nameInput = document.getElementById('uploadName');
  var qsIdInput = document.getElementById('uploadQsId');
  var whatsappInput = document.getElementById('uploadWhatsapp');
  var progress = document.getElementById('uploadProgress');
  var progressFill = document.getElementById('uploadProgressFill');
  var statusText = document.getElementById('uploadStatus');

  if (uploadFileQueue.length === 0) { showToast('Add files first', 'error'); return; }
  if (uploadFileQueue.length > CONFIG.maxFilesPerUpload) { showToast('Max ' + CONFIG.maxFilesPerUpload + ' files', 'error'); return; }

  var name = nameInput?.value?.trim();
  var qsId = qsIdInput?.value?.trim();
  var whatsapp = whatsappInput?.value?.trim();
  var semester = semSelect?.value;
  var category = catSelect?.value;

  if (!name || !qsId || !whatsapp) { showToast('Fill in all student info fields', 'error'); return; }
  if (!semester) { showToast('Select a semester', 'error'); return; }

  var totalSize = 0;
  uploadFileQueue.forEach(function(f) { totalSize += f.size; });
  if (totalSize > CONFIG.maxUploadSizeMB * 1024 * 1024) { showToast('Total size exceeds ' + CONFIG.maxUploadSizeMB + 'MB', 'error'); return; }

  var catLabel = CONFIG.categories[category]?.label || category || 'Other';
  var filesData = [];
  for (var j = 0; j < uploadFileQueue.length; j++) {
    var file = uploadFileQueue[j];
    var ext = file.name.split('.').pop().toLowerCase();
    if (!CONFIG.academicExtensions.includes(ext)) {
      showToast('File type .' + ext + ' not allowed', 'error');
      return;
    }
    var buffer = await file.arrayBuffer();
    var relPath = semester + '/' + (category || 'other') + '/' + file.name;
    filesData.push({ name: file.name, path: relPath, data: buffer });
  }

  if (progress) progress.classList.remove('hidden');
  if (statusText) statusText.textContent = 'Uploading ' + filesData.length + ' files...';

  try {
    var pr = await GITHUB.uploadFilesViaFork(filesData, {
      name: name, qsId: qsId, whatsapp: whatsapp,
      semester: semester, category: catLabel
    });
    if (statusText) statusText.textContent = 'Done! PR created.';
    if (progressFill) progressFill.style.width = '100%';
    showToast('Files submitted! PR #' + (pr.number || ''), 'success');
    uploadFileQueue = [];
    renderUploadQueue();
    setTimeout(function() { closeModal('uploadModal'); }, 2000);
  } catch (err) {
    if (statusText) statusText.textContent = 'Error: ' + err.message;
    showToast('Upload failed: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadTheme();
  registerSW();

  if (localStorage.getItem(AUTH.TOKEN_KEY) && localStorage.getItem(AUTH.USER_KEY)) {
    AUTH._sessionValid = true;
    AUTH._sessionChecked = true;
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(function(m) { m.classList.remove('active'); document.body.style.overflow = ''; });
      closeViewer();
    }
  });

  document.querySelectorAll('.modal').forEach(function(m) {
    m.addEventListener('click', function(e) { if (e.target === m) { m.classList.remove('active'); document.body.style.overflow = ''; } });
  });

  updateAuthUI();

  Router.register('/', HomeView);
  Router.register('/contributors', ContributorsView);
  Router.register('/routine', RoutineView);
  Router.register('/history', HistoryView);
  Router.register('/downloads', DownloadsView);
  Router.register('/settings', SettingsView);
  Router.start();
});
