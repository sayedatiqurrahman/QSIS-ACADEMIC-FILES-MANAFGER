let allTreeItems = [];
let currentPath = '';
let currentSemester = '';
let currentCategory = '';
let currentCourse = '';
let breadcrumb = [];
let semesterFolders = {};
let semesterLabels = {};

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  registerSW();
  waitForDB().then(() => {
    loadRecentReads();
    loadSemesters().then(() => populateYearSelect());
  });
  setupEventListeners();
});

function waitForDB() {
  return new Promise((resolve) => {
    if (DB && DB.db) { resolve(); return; }
    const check = setInterval(() => { if (DB && DB.db) { clearInterval(check); resolve(); } }, 100);
  });
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function setupEventListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => { m.classList.remove('active'); document.body.style.overflow = ''; });
      closeViewer();
    }
  });
}

// ========== THEME ==========
function toggleTheme() {
  const c = document.documentElement.getAttribute('data-theme');
  const n = c === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', n);
  localStorage.setItem('qsis-theme', n);
  const icon = document.querySelector('.theme-toggle i');
  if (icon) icon.className = n === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}
function loadTheme() {
  const s = localStorage.getItem('qsis-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', s);
  const icon = document.querySelector('.theme-toggle i');
  if (icon) icon.className = s === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// ========== TOAST ==========
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ========== MODALS ==========
function showUploadModal() { document.getElementById('uploadModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function showTutorialModal() { document.getElementById('tutorialModal').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
document.querySelectorAll('.modal').forEach(m => { m.addEventListener('click', (e) => { if (e.target === m) { m.classList.remove('active'); document.body.style.overflow = ''; } }); });

// ========== UPLOAD TABS ==========
function showUploadTab(tab) {
  document.querySelectorAll('.upload-tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('uploadTab' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = '';
  event.currentTarget.classList.add('active');
}

// ========== RECENT READS ==========
async function loadRecentReads() {
  const container = document.getElementById('recentReads');
  if (!container) return;
  try {
    const items = await DB.historyGetRecent(7);
    if (!items || items.length === 0) {
      container.innerHTML = `<div class="recent-empty"><i class="fas fa-clock"></i> No recent reads yet. Open a file to get started.</div>`;
      return;
    }
    container.innerHTML = items.map(item => {
      const icon = getFileIconByType(item.mimeType);
      const time = timeAgo(item.lastRead);
      const cached = DB.makeId(item.path);
      return `<div class="recent-card" onclick="openRecentFile('${esc(item.path)}', '${esc(item.mimeType)}')">
        <div class="recent-icon">${icon}</div>
        <div class="recent-info">
          <div class="recent-name">${esc(item.name)}</div>
          <div class="recent-time">${time}</div>
        </div>
      </div>`;
    }).join('');

    const moreBtn = document.getElementById('recentMore');
    if (moreBtn && items.length >= 7) moreBtn.style.display = '';
    else if (moreBtn) moreBtn.style.display = 'none';
  } catch (err) {
    container.innerHTML = `<div class="recent-empty"><i class="fas fa-clock"></i> No recent reads yet.</div>`;
  }
}

async function openRecentFile(path, mimeType) {
  const id = DB.makeId(path);
  const cached = await DB.cacheGet(id);
  const item = {
    path, name: path.split('/').pop(), mimeType,
    rawUrl: `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${CONFIG.uploadPath}/${path}`
  };
  if (cached && cached.blob) {
    openViewerFromBlob(item, cached.blob);
  } else {
    openViewer(item);
  }
  await DB.historyAdd(item);
}

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'Just now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  return Math.floor(d / 86400000) + 'd ago';
}

// ========== LOAD SEMESTERS (ENTRY POINT) ==========
async function loadSemesters() {
  const grid = document.getElementById('semesterGrid');
  grid.innerHTML = `<div class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading semesters...</div>`;
  try {
    const tree = await GITHUB.getUploadTree(true);
    allTreeItems = tree.tree.filter(item => {
      const parts = item.path.split('/');
      const fileName = parts[parts.length - 1];
      const ext = fileName.split('.').pop().toLowerCase();
      if (item.type === 'blob') {
        if (CONFIG.ignoredFiles.includes(fileName)) return false;
        if (CONFIG.ignoredExtensions.includes(ext)) return false;
        if (!CONFIG.academicExtensions.includes(ext)) return false;
      }
      return true;
    });

    const detectedSemIds = [...new Set(allTreeItems.map(i => i.path.split('/')[0]).filter(Boolean))];
    detectedSemIds.sort();
    const semFolders = detectedSemIds.map(semId => {
      const numMatch = semId.match(/^(\d+)/);
      const num = numMatch ? numMatch[1] : '';
      const suffix = num === '1' ? 'st' : num === '2' ? 'nd' : num === '3' ? 'rd' : 'th';
      const label = num ? num + suffix + ' Semester' : semId.replace(/-/g, ' ');
      const items = allTreeItems.filter(i => i.path.startsWith(semId + '/'));
      const fileCount = items.filter(i => i.type === 'blob').length;
      const courseSet = new Set();
      items.forEach(i => {
        const parts = i.path.split('/');
        if (parts.length < 3) return;
        const f2 = (parts[2] || '').toLowerCase();
        if (parts[2] && !/^\d{4}$/.test(parts[2]) && !f2.startsWith('mid') && !f2.startsWith('final') && !f2.startsWith('note') && !f2.startsWith('readme') && !f2.startsWith('.gitkeep') && !parts[2].match(/\.\w{1,5}$/)) {
          courseSet.add(parts[2]);
        } else if (parts.length >= 4 && parts[3]) {
          const f3 = (parts[3] || '').toLowerCase();
          if (parts[3] && !/^\d{4}$/.test(parts[3]) && !f3.startsWith('mid') && !f3.startsWith('final') && !f3.startsWith('note') && !parts[3].match(/\.\w{1,5}$/)) {
            courseSet.add(parts[3]);
          }
        }
      });
      const courseCount = courseSet.size;
      const years = new Set();
      items.forEach(i => {
        const m = i.path.match(/\/(\d{4})\//);
        if (m) years.add(m[1]);
      });
      return { id: semId, label, icon: 'fa-book', fileCount, courseCount, yearCount: years.size };
    });
    semesterLabels = {};
    semFolders.forEach(s => semesterLabels[s.id] = s.label);

    const semSelect = document.getElementById('searchSemester');
    if (semSelect) {
      semSelect.innerHTML = '<option value="">All Semesters</option>' +
        semFolders.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
    }

    grid.innerHTML = semFolders.map(s => `
      <div class="semester-card" onclick="openSemester('${s.id}')">
        <div class="semester-icon"><i class="fas fa-book"></i></div>
        <div class="semester-label">${s.label}</div>
        <div class="semester-meta">${s.courseCount || 0} courses &middot; ${s.fileCount} files</div>
      </div>
    `).join('');

    document.getElementById('statsSemesters').textContent = semFolders.length;
    document.getElementById('statsCourses').textContent = semFolders.reduce((sum, s) => sum + s.courseCount, 0);
    document.getElementById('statsFiles').textContent = allTreeItems.filter(i => i.type === 'blob').length;
    document.getElementById('statsYears').textContent = semFolders.reduce((sum, s) => sum + s.yearCount, 0);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="loading-cell" style="grid-column:1/-1">
      <i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i>
      <p>Could not load from GitHub. Check connection.</p>
      <button class="btn btn-sm" onclick="loadSemesters()" style="margin-top:12px"><i class="fas fa-sync"></i> Retry</button>
    </div>`;
  }
}

// ========== NAVIGATION ==========
function semLabel(semId) { return semesterLabels[semId] || semId.replace(/-/g, ' '); }

function openSemester(semId) {
  currentSemester = semId;
  currentCategory = '';
  currentCourse = '';
  currentPath = semId;
  breadcrumb = [{ label: 'Home', action: 'goHome()' }, { label: semLabel(semId), action: `openSemester('${semId}')` }];
  renderBreadcrumb();
  renderCategories(semId);
  document.getElementById('fileSection').style.display = '';
  document.getElementById('semesterSection').style.display = 'none';
  document.getElementById('sectionTitle2').innerHTML = `<i class="fas fa-book"></i> ${semLabel(semId)}`;
}

function openCategory(semId, catKey) {
  currentCategory = catKey;
  currentCourse = '';
  const actualFolder = semesterFolders[semId]?.[catKey] || catKey;
  currentPath = semId + '/' + actualFolder;
  breadcrumb = [
    { label: 'Home', action: 'goHome()' },
    { label: semLabel(semId), action: `openSemester('${semId}')` },
    { label: CONFIG.categories[catKey]?.label || catKey, action: `openCategory('${semId}','${catKey}')` }
  ];
  renderBreadcrumb();
  renderCourses(semId, catKey);
  document.getElementById('sectionTitle2').innerHTML = `<i class="fas ${CONFIG.categories[catKey]?.icon || 'fa-folder'}"></i> ${CONFIG.categories[catKey]?.label || catKey}`;
}

function openCourse(semId, catKey, coursePath) {
  currentCourse = coursePath;
  currentPath = coursePath;

  const actualFolder = semesterFolders[semId]?.[catKey] || catKey;
  const prefix = semId + '/' + actualFolder + '/';
  const relPath = coursePath.startsWith(prefix) ? coursePath.substring(prefix.length) : coursePath.split('/').pop();
  const parts = relPath.split('/').filter(Boolean);

  breadcrumb = [
    { label: 'Home', action: 'goHome()' },
    { label: semLabel(semId), action: `openSemester('${semId}')` },
    { label: CONFIG.categories[catKey]?.label || catKey, action: `openCategory('${semId}','${catKey}')` }
  ];

  let builtPath = prefix;
  parts.forEach((part, i) => {
    builtPath += part;
    if (i < parts.length - 1) {
      const p = builtPath;
      breadcrumb.push({ label: part, action: `openCourse('${semId}','${catKey}','${p}')` });
    } else {
      breadcrumb.push({ label: part });
    }
    builtPath += '/';
  });

  renderBreadcrumb();
  renderFilesInPath(coursePath);
  const lastPart = parts[parts.length - 1] || coursePath.split('/').pop();
  document.getElementById('sectionTitle2').innerHTML = `<i class="fas fa-folder-open"></i> ${esc(lastPart)}`;
}

function goHome() {
  currentSemester = '';
  currentCategory = '';
  currentCourse = '';
  currentPath = '';
  breadcrumb = [];
  renderBreadcrumb();
  document.getElementById('fileSection').style.display = 'none';
  document.getElementById('semesterSection').style.display = '';
  document.getElementById('sectionTitle').innerHTML = `<i class="fas fa-book"></i> Select Semester`;
  loadRecentReads();
}

function renderBreadcrumb() {
  const el = document.getElementById('breadcrumb');
  if (!breadcrumb.length) { el.innerHTML = ''; return; }
  el.innerHTML = breadcrumb.map((b, i) => {
    if (b.action) return `<span class="bc-item" onclick="${b.action}">${b.label}</span><span class="bc-sep"><i class="fas fa-chevron-right"></i></span>`;
    return `<span class="bc-item bc-active">${b.label}</span>`;
  }).join('');
}

function detectCatFromFolder(folderName) {
  const lower = folderName.toLowerCase();
  if (lower === 'sheet' || lower.includes('sheet')) return 'sheet';
  if (lower.includes('previous question') || lower.includes('question')) return 'question';
  if (lower === 'notes' || lower.toLowerCase() === 'note') return 'note';
  if (lower.includes('syllabus')) return 'syllabus';
  return 'other';
}

// ========== RENDER CATEGORIES ==========
function renderCategories(semId) {
  const grid = document.getElementById('fileGrid');

  const topFolders = {};
  allTreeItems.forEach(item => {
    if (!item.path.startsWith(semId + '/')) return;
    const rel = item.path.substring(semId.length + 1);
    const firstPart = rel.split('/')[0];
    if (!firstPart) return;
    if (!topFolders[firstPart]) topFolders[firstPart] = { name: firstPart, blobCount: 0, treeCount: 0 };
    if (item.type === 'blob') topFolders[firstPart].blobCount++;
    else topFolders[firstPart].treeCount++;
  });

  semesterFolders[semId] = {};
  const catEntries = [];

  Object.values(topFolders).forEach(folder => {
    const cat = detectCatFromFolder(folder.name);
    semesterFolders[semId][cat] = folder.name;
    const existing = catEntries.find(e => e.cat === cat);
    if (existing) {
      existing.count += folder.blobCount;
      existing.folders.push(folder.name);
    } else {
      catEntries.push({ cat, count: folder.blobCount, folders: [folder.name] });
    }
  });

  if (catEntries.length === 0) {
    grid.innerHTML = `<div class="loading-cell" id="setupSemesterCell">
      <i class="fas fa-folder-open" style="font-size:2rem;color:var(--text2);margin-bottom:8px"></i>
      <p>No files found in this semester.</p>
      <p style="font-size:.78rem;color:var(--text2);margin-top:6px">Add folders like <code>sheet/</code>, <code>Notes/</code>, <code>Previous Questions/</code>, <code>Syllabus/</code> under <strong>${semId}/</strong> in the repo.</p>
    </div>`;
    return;
  }

  grid.innerHTML = catEntries.map(ce => {
    const cat = CONFIG.categories[ce.cat] || CONFIG.categories.other;
    return `<div class="category-card" onclick="openCategory('${semId}','${ce.cat}')">
      <div class="cat-icon" style="color:${cat.color}"><i class="fas ${cat.icon}"></i></div>
      <div class="cat-label">${cat.label}</div>
      <div class="cat-count">${ce.count} files</div>
    </div>`;
  }).join('');
}

// ========== RENDER COURSES ==========
function renderCourses(semId, catKey) {
  const grid = document.getElementById('fileGrid');
  const actualFolder = semesterFolders[semId]?.[catKey] || catKey;
  const prefix = semId + '/' + actualFolder + '/';
  const items = allTreeItems.filter(i => i.path.startsWith(prefix) && i.path !== prefix);

  const directFiles = [];
  const courseMap = {};

  items.forEach(item => {
    const rel = item.path.substring(prefix.length);
    const parts = rel.split('/');
    if (!rel || parts.length === 0) return;
    if (item.type === 'blob') {
      if (parts.length <= 1) {
        directFiles.push(item);
      } else {
        const courseName = parts[0];
        if (!courseMap[courseName]) courseMap[courseName] = [];
        courseMap[courseName].push(item);
      }
    } else if (item.type === 'tree') {
      const folderName = parts[0];
      if (!courseMap[folderName]) courseMap[folderName] = [];
    }
  });

  const courses = Object.entries(courseMap).sort((a, b) => a[0].localeCompare(b[0]));

  if (courses.length === 0 && directFiles.length === 0) {
    grid.innerHTML = `<div class="loading-cell"><i class="fas fa-folder-open"></i> No files found.</div>`;
    return;
  }

  let html = '';

  if (courses.length > 0) {
    html += courses.map(([name, files]) => {
      const pdfCount = files.filter(f => f.path.toLowerCase().endsWith('.pdf')).length;
      const docCount = files.filter(f => /\.(doc|docx)$/i.test(f.path)).length;
      const imgCount = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.path)).length;
      const isEmpty = files.length === 0;
      const iconClass = isEmpty ? 'fa-folder' : 'fa-book-open';
      const iconColor = isEmpty ? 'var(--text2)' : '';
      return `<div class="course-card" onclick="openCourse('${semId}','${catKey}','${prefix}${name}')">
        <div class="course-icon"><i class="fas ${iconClass}" ${iconColor ? `style="color:${iconColor}"` : ''}></i></div>
        <div class="course-info">
          <div class="course-name">${esc(name)}</div>
          <div class="course-meta">
            ${pdfCount ? `<span><i class="fas fa-file-pdf" style="color:#ef4444"></i> ${pdfCount}</span>` : ''}
            ${docCount ? `<span><i class="fas fa-file-word" style="color:#3b82f6"></i> ${docCount}</span>` : ''}
            ${imgCount ? `<span><i class="fas fa-file-image" style="color:#34d399"></i> ${imgCount}</span>` : ''}
            ${isEmpty ? '<span><i class="fas fa-inbox"></i> Empty</span>' : `<span><i class="fas fa-file"></i> ${files.length} total</span>`}
          </div>
        </div>
        <i class="fas fa-chevron-right course-arrow"></i>
      </div>`;
    }).join('');
  }

  if (directFiles.length > 0) {
    html += directFiles.map(item => {
      const name = item.path.split('/').pop();
      const ext = name.split('.').pop().toLowerCase();
      const mime = ['jpg','jpeg','png','gif','webp'].includes(ext) ? 'image' : ext === 'pdf' ? 'pdf' : ['doc','docx'].includes(ext) ? 'doc' : 'other';
      const id = DB.makeId(item.path);
      return `<div class="file-card" id="file-${id}">
        <div class="file-card-main" onclick="clickFile('${esc(item.path)}','${mime}')">
          <div class="file-icon">${getFileIconByType(mime)}</div>
          <div class="file-info">
            <div class="file-name">${esc(name)}</div>
            <div class="file-path">${esc(item.path)}</div>
          </div>
        </div>
        <div class="file-actions">
          <button class="btn-action btn-view" title="View" onclick="event.stopPropagation();clickFile('${esc(item.path)}','${mime}')"><i class="fas fa-eye"></i></button>
          <button class="btn-action btn-download" id="dl-${id}" title="Download" onclick="event.stopPropagation();downloadToCache('${esc(item.path)}','${esc(name)}','${mime}')"><i class="fas fa-download"></i></button>
          <button class="btn-action btn-saveas" id="sv-${id}" title="Save as" style="display:none" onclick="event.stopPropagation();saveAsFile('${esc(item.path)}','${esc(name)}')"><i class="fas fa-share-alt"></i></button>
        </div>
      </div>`;
    }).join('');
    checkCachedButtons();
  }

  grid.innerHTML = html;
}

// ========== RENDER FILES ==========
function renderFilesInPath(folderPath) {
  const grid = document.getElementById('fileGrid');
  const prefix = folderPath.endsWith('/') ? folderPath : folderPath + '/';
  const items = allTreeItems.filter(i => {
    if (i.type !== 'blob') return false;
    if (!i.path.startsWith(prefix)) return false;
    const rel = i.path.substring(prefix.length);
    return rel && !rel.includes('/');
  });
  const subFolders = new Set();
  allTreeItems.forEach(i => {
    if (!i.path.startsWith(prefix)) return;
    const rel = i.path.substring(prefix.length);
    if (!rel) return;
    if (i.type === 'tree') {
      if (!rel.includes('/')) subFolders.add(rel);
    } else if (i.type === 'blob') {
      const slashIdx = rel.indexOf('/');
      if (slashIdx > 0) subFolders.add(rel.substring(0, slashIdx));
    }
  });

  let html = '';
  if (subFolders.size > 0) {
    html += [...subFolders].sort().map(f => {
      return `<div class="course-card" onclick="openCourse('${currentSemester}','${currentCategory}','${prefix}${f}')">
        <div class="course-icon"><i class="fas fa-folder" style="color:var(--accent)"></i></div>
        <div class="course-info"><div class="course-name">${esc(f)}</div></div>
        <i class="fas fa-chevron-right course-arrow"></i>
      </div>`;
    }).join('');
  }

  if (items.length === 0 && !subFolders.size) {
    grid.innerHTML = `<div class="loading-cell"><i class="fas fa-folder-open"></i> No files here yet.</div>`;
    return;
  }

  const fileCards = items.map((item, idx) => {
    const name = item.path.split('/').pop();
    const ext = name.split('.').pop().toLowerCase();
    const mime = ['jpg','jpeg','png','gif','webp'].includes(ext) ? 'image' : ext === 'pdf' ? 'pdf' : ['doc','docx'].includes(ext) ? 'doc' : 'other';
    const icon = getFileIconByType(mime);
    const id = DB.makeId(item.path);
    return `<div class="file-card" id="file-${id}">
      <div class="file-card-main" onclick="clickFile('${esc(item.path)}','${mime}')">
        <div class="file-icon">${icon}</div>
        <div class="file-info">
          <div class="file-name">${esc(name)}</div>
          <div class="file-path">${esc(item.path)}</div>
        </div>
      </div>
      <div class="file-actions">
        <button class="btn-action btn-view" title="View" onclick="event.stopPropagation();clickFile('${esc(item.path)}','${mime}')">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-action btn-download" id="dl-${id}" title="Download" onclick="event.stopPropagation();downloadToCache('${esc(item.path)}','${esc(name)}','${mime}')">
          <i class="fas fa-download"></i>
        </button>
        <button class="btn-action btn-saveas" id="sv-${id}" title="Save as" style="display:none" onclick="event.stopPropagation();saveAsFile('${esc(item.path)}','${esc(name)}')">
          <i class="fas fa-share-alt"></i>
        </button>
      </div>
    </div>`;
  }).join('');

  grid.innerHTML = html + fileCards;
  checkCachedButtons();
}

async function checkCachedButtons() {
  const cards = document.querySelectorAll('.file-card');
  for (const card of cards) {
    const id = card.id.replace('file-', '');
    const cached = await DB.cacheGet(id);
    if (cached) {
      const dl = document.getElementById('dl-' + id);
      const sv = document.getElementById('sv-' + id);
      if (dl) dl.style.display = 'none';
      if (sv) sv.style.display = '';
    }
  }
}

// ========== CLICK FILE ==========
function clickFile(path, mime) {
  const name = path.split('/').pop();
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${CONFIG.uploadPath}/${path}`;
  const item = { path, name, mimeType: mime, rawUrl };
  openViewer(item);
  DB.historyAdd(item).then(() => loadRecentReads());
}

// ========== DOWNLOAD TO CACHE ==========
async function downloadToCache(path, name, mime) {
  const id = DB.makeId(path);
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${CONFIG.uploadPath}/${path}`;
  const dl = document.getElementById('dl-' + id);
  const sv = document.getElementById('sv-' + id);

  if (dl) { dl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; dl.disabled = true; }

  try {
    const res = await fetch(rawUrl);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const item = { path, name, mimeType: mime, ext: name.split('.').pop(), size: blob.size };
    await DB.cacheFile(item, blob);

    if (dl) dl.style.display = 'none';
    if (sv) sv.style.display = '';
    showToast(`Downloaded: ${name}`, 'success');
  } catch (err) {
    console.error(err);
    if (dl) { dl.innerHTML = '<i class="fas fa-download"></i>'; dl.disabled = false; }
    showToast('Download failed. Try again.', 'error');
  }
}

// ========== SAVE AS (to device) ==========
async function saveAsFile(path, name) {
  const id = DB.makeId(path);
  const cached = await DB.cacheGet(id);
  if (!cached || !cached.blob) {
    showToast('File not cached. Download it first.', 'error');
    return;
  }
  const url = URL.createObjectURL(cached.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Saving: ${name}`, 'info');
}

// ========== HELPERS ==========
function detectCategory(path) {
  const lp = path.toLowerCase();
  if (lp.includes('sheet') || lp.includes('main sheet')) return 'sheet';
  if (lp.includes('question') || lp.includes('previous question') || lp.includes('/mid') || lp.includes('/final')) return 'question';
  if (lp.includes('note') || lp.includes('notes')) return 'note';
  if (lp.includes('syllabus')) return 'syllabus';
  return 'other';
}

function getFileIconByType(mime) {
  if (mime === 'image') return '<i class="fas fa-file-image" style="color:#34d399"></i>';
  if (mime === 'pdf') return '<i class="fas fa-file-pdf" style="color:#ef4444"></i>';
  if (mime === 'doc') return '<i class="fas fa-file-word" style="color:#3b82f6"></i>';
  return '<i class="fas fa-file" style="color:var(--text2)"></i>';
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML.replace(/'/g, '&#39;');
}

// ========== FILE VIEWER ==========
function openViewer(item) {
  if (!item) return;
  const viewer = document.getElementById('fileViewer');
  const viewerTitle = document.getElementById('viewerTitle');
  const viewerBody = document.getElementById('viewerBody');

  viewerTitle.textContent = item.name;
  document.getElementById('viewerDownloadBtn').onclick = () => downloadToCache(item.path, item.name, item.mimeType);
  document.getElementById('viewerSaveAsBtn').onclick = () => saveAsFile(item.path, item.name);

  const id = DB.makeId(item.path);
  DB.cacheGet(id).then(cached => {
    if (cached && cached.blob) {
      document.getElementById('viewerDownloadBtn').style.display = 'none';
      document.getElementById('viewerSaveAsBtn').style.display = '';
    } else {
      document.getElementById('viewerDownloadBtn').style.display = '';
      document.getElementById('viewerSaveAsBtn').style.display = 'none';
    }
  });

  if (item.mimeType === 'pdf') openPdfViewer(item.rawUrl, viewerBody, item.path);
  else if (item.mimeType === 'image') openImageViewer(item.rawUrl, item.name, viewerBody);
  else if (item.mimeType === 'doc') openDocViewer(item.rawUrl, viewerBody);
  else {
    viewerBody.innerHTML = `<div class="viewer-fallback">
      <i class="fas fa-file" style="font-size:3rem;color:var(--text2);margin-bottom:16px"></i>
      <p>Preview not available for this file type.</p>
      <p style="font-size:0.85rem;color:var(--text2)">Use download button to save offline.</p>
    </div>`;
  }

  viewer.classList.add('active');
  document.body.style.overflow = 'hidden';
  DB.historyAdd(item).then(() => loadRecentReads());
}

function openViewerFromBlob(item, blob) {
  if (!item || !blob) return;
  const viewer = document.getElementById('fileViewer');
  const viewerTitle = document.getElementById('viewerTitle');
  const viewerBody = document.getElementById('viewerBody');

  viewerTitle.textContent = item.name;
  document.getElementById('viewerDownloadBtn').style.display = 'none';
  document.getElementById('viewerSaveAsBtn').style.display = '';
  document.getElementById('viewerSaveAsBtn').onclick = () => saveAsFile(item.path, item.name);

  const url = URL.createObjectURL(blob);
  if (item.mimeType === 'pdf') openPdfViewer(url, viewerBody, item.path);
  else if (item.mimeType === 'image') openImageViewer(url, item.name, viewerBody);
  else {
    viewerBody.innerHTML = `<div class="viewer-fallback">
      <i class="fas fa-file" style="font-size:3rem;color:var(--text2);margin-bottom:16px"></i>
      <p>File cached. Use "Save as" to save to device.</p>
    </div>`;
  }
  viewer.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeViewer() {
  const viewer = document.getElementById('fileViewer');
  if (viewer) viewer.classList.remove('active');
  document.body.style.overflow = '';
  pdfFilePath = '';
  if (document.fullscreenElement) document.exitFullscreen();
  const body = document.getElementById('viewerBody');
  if (body) body.innerHTML = '';
}

// ========== PDF VIEWER (Adobe PDF Embed API with annotations toggle) ==========
let pdfFilePath = '';
let adobeDCView = null;
let pdfAnnotationsEnabled = true;

function openPdfViewer(url, container, filePath) {
  pdfFilePath = filePath || '';
  const fileName = filePath ? filePath.split('/').pop() : 'document.pdf';
  const pdfId = filePath || fileName;

  container.innerHTML = `<div class="adobe-pdf-wrapper" style="position:relative;height:100%">
    <div id="adobe-dc-view"></div>
    <button id="annotationToggleBtn" class="btn btn-sm" style="position:absolute;top:8px;right:8px;z-index:10;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:.72rem">
      <i class="fas fa-pen"></i> <span id="annotationToggleLabel">Annotate: On</span>
    </button>
  </div>`;

  function initAdobe() {
    adobeDCView = new AdobeDC.View({
      clientId: CONFIG.adobeClientId,
      divId: 'adobe-dc-view'
    });

    pdfAnnotationsEnabled = true;

    var previewConfig = {
      embedMode: 'FULL_WINDOW',
      defaultViewMode: 'FIT_WIDTH',
      showDownloadPDF: true,
      showPrintPDF: true,
      showAnnotationTools: true,
      enableAnnotationAPIs: true,
      includeAnnotationAPIs: true,
      showLeftHandPanel: true,
      showPageControls: true,
      showFullScreenViewButton: true,
      enableFormFilling: true,
      showToolbarPDF: true
    };

    var contentConfig = { location: { url: url } };

    adobeDCView.previewFile(
      { content: contentConfig, metaData: { fileName: fileName, id: pdfId } },
      previewConfig
    ).then(function() {
      setupAnnotationToggle(adobeDCView);
    }).catch(function(err) {
      console.error('Adobe PDF viewer error:', err);
      container.innerHTML = '<div class="viewer-fallback">' +
        '<i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--warning);margin-bottom:12px"></i>' +
        '<p>Could not load PDF viewer.</p>' +
        '<a href="' + url + '" target="_blank" class="btn btn-sm" style="margin-top:12px"><i class="fas fa-external-link-alt"></i> Open in new tab</a>' +
        '</div>';
    });
  }

  if (window.AdobeDC) {
    initAdobe();
  } else {
    document.addEventListener('adobe_dc_view_sdk.ready', initAdobe, { once: true });
  }
}

function setupAnnotationToggle(view) {
  var btn = document.getElementById('annotationToggleBtn');
  if (!btn) return;
  btn.onclick = function() {
    pdfAnnotationsEnabled = !pdfAnnotationsEnabled;
    document.getElementById('annotationToggleLabel').textContent = 'Annotate: ' + (pdfAnnotationsEnabled ? 'On' : 'Off');
    if (view && view.setTheme) {
      view.setAnnotationManagerVisibility(pdfAnnotationsEnabled);
    }
  };
}

// ========== IMAGE VIEWER ==========
let imgZoom = 100, imgRotation = 0;
function openImageViewer(url, name, container) {
  imgZoom = 100; imgRotation = 0;
  container.innerHTML = `<div class="image-viewer-container">
    <div class="image-toolbar">
      <button class="btn btn-sm" onclick="imgZoomOut()"><i class="fas fa-minus"></i></button>
      <span id="imgZoomInfo">100%</span>
      <button class="btn btn-sm" onclick="imgZoomIn()"><i class="fas fa-plus"></i></button>
      <button class="btn btn-sm" onclick="imgFit()"><i class="fas fa-expand"></i> Fit</button>
      <button class="btn btn-sm" onclick="imgRotate()"><i class="fas fa-redo"></i></button>
    </div>
    <div class="image-scroll-area" id="imageScrollArea">
      <img id="viewerImage" src="${url}" alt="${esc(name)}" />
    </div>
  </div>`;
}
function imgZoomIn() { imgZoom = Math.min(imgZoom + 15, 300); applyImgTransform(); }
function imgZoomOut() { imgZoom = Math.max(imgZoom - 15, 20); applyImgTransform(); }
function imgFit() { imgZoom = 100; imgRotation = 0; applyImgTransform(); }
function imgRotate() { imgRotation = (imgRotation + 90) % 360; applyImgTransform(); }
function applyImgTransform() {
  const img = document.getElementById('viewerImage');
  if (img) img.style.transform = `scale(${imgZoom / 100}) rotate(${imgRotation}deg)`;
  const info = document.getElementById('imgZoomInfo');
  if (info) info.textContent = Math.round(imgZoom) + '%';
}

// ========== DOC VIEWER ==========
function openDocViewer(url, container) {
  container.innerHTML = `<div class="doc-viewer-container">
    <div class="doc-toolbar">
      <span><i class="fas fa-file-word" style="color:#3b82f6"></i> Word Document</span>
      <a href="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}" target="_blank" class="btn btn-sm btn-outline">
        <i class="fas fa-external-link-alt"></i> Open in Office Online
      </a>
    </div>
    <iframe src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}"
      style="width:100%;height:calc(100vh - 140px);border:none;border-radius:0 0 8px 8px"></iframe>
  </div>`;
}

// ========== UPLOAD ==========

function populateYearSelect() {
  const sel = document.getElementById('searchYear');
  if (!sel) return;
  const years = new Set();
  allTreeItems.forEach(i => {
    const match = i.path.match(/\/(\d{4})(?:\/|$)/);
    if (match) years.add(match[1]);
  });
  const sorted = [...years].sort();
  if (sorted.length === 0) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">All Years</option>' +
    sorted.map(y => `<option value="${y}" ${y === current ? 'selected' : ''}>${y}</option>`).join('');
}

// ========== SEARCH ==========
function searchFiles() {
  const query = document.getElementById('searchInput')?.value.toLowerCase().trim();
  const semFilter = document.getElementById('searchSemester')?.value || '';
  const typeFilter = document.getElementById('searchType')?.value || '';
  const yearFilter = document.getElementById('searchYear')?.value || '';

  const hasFilter = query || semFilter || typeFilter || yearFilter;
  if (!hasFilter) return;

  const results = allTreeItems.filter(i => {
    if (i.type !== 'blob') return false;
    const name = i.path.split('/').pop().toLowerCase();
    const ext = name.split('.').pop().toLowerCase();

    if (query && !name.includes(query) && !i.path.toLowerCase().includes(query)) return false;

    if (semFilter && !i.path.startsWith(semFilter + '/')) return false;

    if (typeFilter === 'pdf' && ext !== 'pdf') return false;
    if (typeFilter === 'image' && !['jpg','jpeg','png','gif','webp'].includes(ext)) return false;
    if (typeFilter === 'doc' && !['doc','docx'].includes(ext)) return false;

    if (yearFilter && !i.path.includes('/' + yearFilter + '/')) return false;

    return true;
  });

  if (!currentPath) {
    document.getElementById('fileSection').style.display = '';
    document.getElementById('semesterSection').style.display = 'none';
    const filterParts = [];
    if (query) filterParts.push(`"${query}"`);
    if (semFilter) filterParts.push(semLabel(semFilter));
    if (typeFilter) filterParts.push(typeFilter);
    if (yearFilter) filterParts.push(yearFilter);
    const filterLabel = filterParts.length ? filterParts.join(', ') : 'All';
    document.getElementById('sectionTitle2').innerHTML = `<i class="fas fa-search"></i> Search: ${esc(filterLabel)}`;
    breadcrumb = [{ label: 'Home', action: 'goHome()' }, { label: 'Search Results' }];
    renderBreadcrumb();
  }

  const grid = document.getElementById('fileGrid');
  if (results.length === 0) {
    grid.innerHTML = `<div class="loading-cell"><i class="fas fa-search"></i> No results for "${esc(query)}"</div>`;
    return;
  }

  grid.innerHTML = results.slice(0, 50).map(item => {
    const name = item.path.split('/').pop();
    const ext = name.split('.').pop().toLowerCase();
    const mime = ['jpg','jpeg','png','gif','webp'].includes(ext) ? 'image' : ext === 'pdf' ? 'pdf' : ['doc','docx'].includes(ext) ? 'doc' : 'other';
    const id = DB.makeId(item.path);
    return `<div class="file-card" id="file-${id}">
      <div class="file-card-main" onclick="clickFile('${esc(item.path)}','${mime}')">
        <div class="file-icon">${getFileIconByType(mime)}</div>
        <div class="file-info">
          <div class="file-name">${esc(name)}</div>
          <div class="file-path">${esc(item.path)}</div>
        </div>
      </div>
      <div class="file-actions">
        <button class="btn-action btn-view" title="View" onclick="event.stopPropagation();clickFile('${esc(item.path)}','${mime}')"><i class="fas fa-eye"></i></button>
        <button class="btn-action btn-download" id="dl-${id}" title="Download" onclick="event.stopPropagation();downloadToCache('${esc(item.path)}','${esc(name)}','${mime}')"><i class="fas fa-download"></i></button>
        <button class="btn-action btn-saveas" id="sv-${id}" title="Save as" style="display:none" onclick="event.stopPropagation();saveAsFile('${esc(item.path)}','${esc(name)}')"><i class="fas fa-share-alt"></i></button>
      </div>
    </div>`;
  }).join('');
  checkCachedButtons();
}

// ========== REFRESH ==========
function refreshFiles() {
  if (currentSemester) openSemester(currentSemester);
  else loadSemesters();
}
