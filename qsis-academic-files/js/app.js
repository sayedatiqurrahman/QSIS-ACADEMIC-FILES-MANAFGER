let allItems = [];
let folderStructure = {};

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  populateYearSelect();
  loadFiles();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', (e) => {
    document.getElementById('clearBtn').style.display = e.target.value ? 'flex' : 'none';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => {
        m.classList.remove('active');
        document.body.style.overflow = '';
      });
    }
  });
}

// ========== THEME ==========
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('qsis-theme', next);
  document.querySelector('.btn-icon[title="Toggle Theme"] i').className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}
function loadTheme() {
  const saved = localStorage.getItem('qsis-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

// ========== MODALS ==========
function showUploadModal() {
  document.getElementById('uploadModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function showTutorialModal() {
  document.getElementById('tutorialModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

// Close modal on backdrop click
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target === m) { m.classList.remove('active'); document.body.style.overflow = ''; }
  });
});

// ========== TOAST ==========
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 4000);
}

// ========== YEAR SELECT ==========
function populateYearSelect() {
  const sel = document.getElementById('uploadYear');
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 2018; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    sel.appendChild(opt);
  }
}

// ========== LOAD FILES FROM GITHUB ==========
async function loadFiles() {
  const grid = document.getElementById('fileGrid');
  try {
    const tree = await GITHUB.getTree(true);
    processTree(tree.tree);

    // Update stats
    const stats = getStats();
    document.getElementById('totalSemesters').textContent = stats.semesters;
    document.getElementById('totalCourses').textContent = stats.courses;
    document.getElementById('totalFiles').textContent = stats.files;
    document.getElementById('totalYears').textContent = stats.years;

    populateSemesterFilter();
    populateYearFilter();
    renderFiles(allItems);
  } catch (err) {
    console.error('Failed to load files:', err);
    grid.innerHTML = `
      <div class="loading-spinner" style="grid-column:1/-1">
        <i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i>
        <p>Could not load files from GitHub.</p>
        <p style="font-size:0.85rem;color:var(--text2)">Make sure the repository exists and is accessible.</p>
        <button class="btn btn-sm" onclick="loadFiles()" style="margin-top:12px">
          <i class="fas fa-sync"></i> Retry
        </button>
      </div>`;
  }
}

function processTree(items) {
  allItems = [];
  folderStructure = {};

  // Build folder hierarchy
  for (const item of items) {
    if (item.type === 'tree') {
      setNested(folderStructure, item.path.split('/'), { type: 'folder', path: item.path });
    }
  }

  // Process files
  for (const item of items) {
    if (item.type === 'blob') {
      const parsed = parseFilePath(item.path, item);
      if (parsed) {
        allItems.push(parsed);
      }
    }
  }

  // Add folders from structure
  allItems.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function setNested(obj, keys, value) {
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  if (keys.length > 0) {
    if (!current[keys[keys.length - 1]]) {
      current[keys[keys.length - 1]] = value;
    }
  }
}

function parseFilePath(path, item) {
  const parts = path.split('/');
  const fileName = parts.pop();
  const dirPath = parts.join('/');

  if (!fileName || fileName === '.gitkeep' || fileName === 'README.md' || fileName.startsWith('.')) return null;

  const ext = fileName.split('.').pop()?.toLowerCase();
  const isFolder = item.type === 'tree';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';
  const isDoc = ['doc', 'docx'].includes(ext);

  const fileInfo = {
    name: fileName,
    path: path,
    dirPath: dirPath,
    fullPath: path,
    ext: ext,
    type: isFolder ? 'folder' : 'file',
    mimeType: isImage ? 'image' : isPdf ? 'pdf' : isDoc ? 'doc' : 'other',
    size: item.size || 0,
    sha: item.sha,
    url: `https://github.com/${GITHUB.owner}/${GITHUB.repo}/blob/${GITHUB.branch}/${encodeURIComponent(path)}`,
    rawUrl: `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${encodeURIComponent(path)}`
  };

  // Detect category from path
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('sheet') || lowerPath.includes('main sheet')) fileInfo.category = 'sheet';
  else if (lowerPath.includes('question') || lowerPath.includes('previous question') || lowerPath.includes('mid') || lowerPath.includes('final')) fileInfo.category = 'question';
  else if (lowerPath.includes('note') || lowerPath.includes('notes')) fileInfo.category = 'note';
  else if (lowerPath.includes('syllabus')) fileInfo.category = 'syllabus';
  else fileInfo.category = 'other';

  // Detect semester
  const semMatch = path.match(/(\d+)(?:st|nd|rd|th)?[-_ ]?sem(?:ester|ister)?/i);
  if (semMatch) fileInfo.semester = semMatch[1] + 'th';

  // Detect year
  const yearMatch = path.match(/\b(20\d{2})\b/);
  if (yearMatch) fileInfo.year = yearMatch[1];

  // Detect course code
  const codeMatch = path.match(/\b([A-Z]{2,4}-\d{4})\b/i);
  if (codeMatch) fileInfo.courseCode = codeMatch[1].toUpperCase();

  // Detect exam type
  if (lowerPath.includes('/mid/') || lowerPath.includes('\\mid\\') || lowerPath.endsWith('/mid') || lowerPath.startsWith('mid ')) fileInfo.examType = 'Mid';
  else if (lowerPath.includes('/final/') || lowerPath.includes('\\final\\') || lowerPath.endsWith('/final') || lowerPath.startsWith('final ')) fileInfo.examType = 'Final';

  return fileInfo;
}

function getStats() {
  const semesters = new Set();
  const courses = new Set();
  const years = new Set();
  let fileCount = 0;

  for (const item of allItems) {
    if (item.semester) semesters.add(item.semester);
    if (item.courseCode) courses.add(item.courseCode);
    if (item.year) years.add(item.year);
    if (item.type === 'file') fileCount++;
  }

  return {
    semesters: semesters.size || '?',
    courses: courses.size || '?',
    files: fileCount || allItems.length,
    years: years.size || '?'
  };
}

// ========== FILTERS ==========
function populateSemesterFilter() {
  const sel = document.getElementById('semesterFilter');
  const sems = new Set();
  allItems.forEach(i => { if (i.semester) sems.add(i.semester); });
  const sorted = [...sems].sort((a, b) => parseInt(a) - parseInt(b));
  sorted.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = `${s} Semester`;
    sel.appendChild(opt);
  });
}

function populateYearFilter() {
  const sel = document.getElementById('yearFilter');
  const years = new Set();
  allItems.forEach(i => { if (i.year) years.add(i.year); });
  [...years].sort().reverse().forEach(y => {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    sel.appendChild(opt);
  });
}

function filterFiles() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const year = document.getElementById('yearFilter').value;
  const type = document.getElementById('typeFilter').value;
  const semester = document.getElementById('semesterFilter').value;

  let filtered = allItems.filter(item => {
    if (query && !item.name.toLowerCase().includes(query) &&
        !(item.courseCode && item.courseCode.toLowerCase().includes(query)) &&
        !item.path.toLowerCase().includes(query)) {
      return false;
    }
    if (year && item.year !== year) return false;
    if (type && item.category !== type) return false;
    if (semester && item.semester !== semester) return false;
    return true;
  });

  renderFiles(filtered);
}

// ========== RENDER ==========
function renderFiles(items) {
  const grid = document.getElementById('fileGrid');
  if (!items || items.length === 0) {
    grid.innerHTML = `<div class="loading-spinner" style="grid-column:1/-1">
      <i class="fas fa-folder-open" style="font-size:2rem;color:var(--text2);margin-bottom:12px;display:block"></i>
      <p>No files found</p>
    </div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    if (item.type === 'tree' || item.type === 'folder') {
      return renderFolderCard(item);
    }
    return renderFileCard(item);
  }).join('');

  // Attach click handlers
  items.forEach((item, idx) => {
    const cards = grid.querySelectorAll('.file-card, .folder-card');
    if (cards[idx]) {
      cards[idx].addEventListener('click', () => {
        if (item.type === 'folder' || item.type === 'tree') {
          window.open(`https://github.com/${GITHUB.owner}/${GITHUB.repo}/tree/${GITHUB.branch}/${encodeURIComponent(item.path)}`, '_blank');
        } else if (item.mimeType === 'image' || item.mimeType === 'pdf') {
          previewFile(item);
        } else {
          window.open(item.url, '_blank');
        }
      });
    }
  });
}

function renderFolderCard(item) {
  const icon = `<i class="fas fa-folder" style="color:var(--accent);font-size:1.5rem"></i>`;
  return `<div class="folder-card">
    <div class="folder-name">${icon} ${escapeHtml(item.name || item.path.split('/').pop())}</div>
    <div style="font-size:0.75rem;color:var(--text2);margin-top:6px">${escapeHtml(item.path)}</div>
  </div>`;
}

function renderFileCard(item) {
  const icon = getFileIcon(item);
  const tags = [];
  if (item.category) tags.push(`<span class="file-tag ${item.category}">${item.category}</span>`);
  if (item.year) tags.push(`<span class="file-tag year">${item.year}</span>`);
  if (item.courseCode) tags.push(`<span class="file-tag" style="background:var(--bg3);color:var(--text)">${item.courseCode}</span>`);
  if (item.examType) tags.push(`<span class="file-tag" style="background:rgba(139,92,246,0.2);color:#a78bfa">${item.examType}</span>`);

  return `<div class="file-card">
    <div class="file-icon">${icon}</div>
    <div class="file-name">${escapeHtml(item.name)}</div>
    <div class="file-path">${escapeHtml(item.path)}</div>
    <div class="file-tags">${tags.join('')}</div>
  </div>`;
}

function getFileIcon(item) {
  if (item.mimeType === 'image') return '<i class="fas fa-file-image" style="color:#34d399"></i>';
  if (item.mimeType === 'pdf') return '<i class="fas fa-file-pdf" style="color:#ef4444"></i>';
  if (item.mimeType === 'doc') return '<i class="fas fa-file-word" style="color:#3b82f6"></i>';
  return '<i class="fas fa-file" style="color:var(--text2)"></i>';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function previewFile(item) {
  document.getElementById('previewTitle').textContent = item.name;
  const frame = document.getElementById('previewFrame');
  if (item.mimeType === 'image') {
    frame.srcdoc = `<img src="${item.rawUrl}" style="max-width:100%;height:auto;display:block;margin:0 auto" />`;
  } else if (item.mimeType === 'pdf') {
    frame.src = `https://docs.google.com/viewer?url=${encodeURIComponent(item.rawUrl)}&embedded=true`;
  }
  document.getElementById('previewModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function refreshFiles() {
  document.getElementById('fileGrid').innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading files...</div>';
  loadFiles();
}

// ========== UPLOAD ==========
async function uploadFiles() {
  const fileInput = document.getElementById('fileInput');
  const semester = document.getElementById('uploadSemester').value;
  const category = document.getElementById('uploadCategory').value;
  const year = document.getElementById('uploadYear').value;
  const examType = document.getElementById('uploadExamType').value;
  const courseCode = document.getElementById('uploadCourseCode').value.trim();
  const userName = document.getElementById('uploadUserName').value.trim();

  if (!fileInput.files.length || !semester || !category || !year) {
    showToast('Please fill all required fields and select files.', 'error');
    return;
  }

  const btn = document.getElementById('uploadBtn');
  const progress = document.getElementById('uploadProgress');
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
  progress.style.display = 'block';

  const files = Array.from(fileInput.files);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const percent = Math.round(((i) / files.length) * 100);
    fill.style.width = percent + '%';
    text.textContent = `Uploading ${i + 1}/${files.length}: ${file.name}`;

    // Build path: semester/category/year/examType/courseCode/filename
    let dirParts = [semester];
    if (category === 'sheet') dirParts.push('sheet');
    else if (category === 'question') dirParts.push('Previous Question', year);
    else if (category === 'note') dirParts.push('NOTES');
    else if (category === 'syllabus') dirParts.push('Syllabus');
    else dirParts.push('Other');

    if (category === 'question' && examType) dirParts.push(examType);
    if (courseCode) dirParts.push(courseCode);

    const filePath = dirParts.join('/') + '/' + file.name;

    try {
      const reader = new FileReader();
      const content = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });

      const pr = await GITHUB.uploadFileAsPR(
        filePath,
        content,
        `[Submission] ${file.name} - ${semester} ${category}${userName ? ` by ${userName}` : ''}`
      );
      successCount++;
    } catch (err) {
      console.error('Upload error:', err);
      failCount++;
    }
  }

  fill.style.width = '100%';
  text.textContent = successCount > 0
    ? `✅ ${successCount} file(s) submitted for review!${failCount > 0 ? ` (${failCount} failed)` : ''}`
    : '❌ Upload failed. Please try again.';

  if (successCount > 0) {
    showToast(`${successCount} file(s) submitted for admin review!`, 'success');
    setTimeout(() => {
      closeModal('uploadModal');
      resetUploadForm();
    }, 2000);
  } else {
    showToast('Upload failed. Check console for details.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Submit for Review';
}

function resetUploadForm() {
  document.getElementById('uploadForm').reset();
  document.getElementById('uploadProgress').style.display = 'none';
  document.getElementById('progressFill').style.width = '0%';
}
