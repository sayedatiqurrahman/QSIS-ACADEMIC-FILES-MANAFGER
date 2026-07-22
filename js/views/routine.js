const RoutineView = {
  render() {
    return `<main class="max-w-[1100px] mx-auto py-5 px-5">
      <div class="mb-5 pb-4 border-b border-dark-border">
        <h2 class="text-[1.3rem] font-semibold flex items-center gap-2"><i class="fas fa-calendar-alt"></i> Routine Manager</h2>
        <p class="text-[0.82rem] text-dark-text2 mt-1">International Islamic University Chittagong &middot; Qur'anic Sciences &amp; Islamic Studies</p>
      </div>

      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <select id="routineSemester" class="px-3 py-2 border border-dark-border rounded-lg bg-dark-bg3 text-dark-text text-[0.85rem] outline-none focus:border-qsis">
          <option value="">Select Semester</option>
        </select>
        <span id="currentSemesterLabel" class="text-[0.8rem] text-dark-text2 font-semibold"></span>
        <div class="flex gap-1.5 ml-auto">
          <button class="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.75rem] font-semibold hover:bg-dark-bg3/80 transition-all" onclick="RoutineView.downloadPDF()" title="Download as PDF"><i class="fas fa-file-pdf"></i> PDF</button>
          <button class="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.75rem] font-semibold hover:bg-dark-bg3/80 transition-all" onclick="RoutineView.downloadImage()" title="Download as Image"><i class="fas fa-image"></i> Image</button>
        </div>
      </div>

      <div class="flex gap-2 mb-4">
        <button class="routine-tab-btn px-5 py-2.5 border border-dark-border rounded-lg bg-qsis text-white cursor-pointer text-[0.82rem] font-semibold flex items-center gap-2 transition-all" data-tab="tabClass"><i class="fas fa-chalkboard-teacher"></i> Class Routine</button>
        <button class="routine-tab-btn px-5 py-2.5 border border-dark-border rounded-lg bg-dark-bg2 text-dark-text2 cursor-pointer text-[0.82rem] font-semibold flex items-center gap-2 transition-all" data-tab="tabExam"><i class="fas fa-file-alt"></i> Exam Schedule</button>
      </div>

      <div id="tabClass" class="routine-tab">
        <div class="bg-dark-bg2 border border-dark-border rounded-xl p-5 mb-5">
          <div class="flex items-center justify-between flex-wrap gap-2.5 mb-4">
            <h3 class="text-base font-semibold flex items-center gap-2"><i class="fas fa-clock"></i> Weekly Timetable</h3>
            <div class="flex items-center gap-1.5">
              <input type="text" id="newSlotInput" placeholder="e.g. 9:00-9:55" class="px-2.5 py-1.5 border border-dark-border rounded-md bg-dark-bg3 text-dark-text text-[0.78rem] outline-none w-[140px] focus:border-qsis" />
              <button id="addSlotBtn" class="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-xl border border-dark-border bg-dark-bg3 text-dark-text cursor-pointer text-[0.75rem] font-semibold hover:bg-dark-bg3/80 transition-all" title="Add time slot">+ Slot</button>
            </div>
          </div>
          <div id="routineContainer" class="routine-print-area">
            <div id="routineHeader" class="routine-print-header">
              <div class="print-header-row">
                <div class="print-info">
                  <h2>International Islamic University Chittagong</h2>
                  <h3>Department of Qur'anic Sciences &amp; Islamic Studies</h3>
                  <p>Class Routine &middot; <span id="printSemLabel">-</span></p>
                </div>
                <div class="print-dept-logo"><img src="assets/iiuc-logo.png" alt="IIUC" height="60" /></div>
              </div>
            </div>
            <div id="routineGrid"><div class="text-center py-10 text-dark-text2"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div></div>
          </div>
          <details class="mt-4 bg-dark-bg3 border border-dark-border rounded-lg">
            <summary class="px-4 py-3 cursor-pointer font-semibold text-[0.85rem] flex items-center gap-2 text-qsis hover:opacity-80 transition-opacity"><i class="fas fa-plus-circle"></i> Add Class Entry</summary>
            <form id="addClassForm" class="px-4 pb-4 pt-1 border-t border-dark-border">
              <div class="flex gap-2 flex-wrap mb-2">
                <select name="day" required class="px-2.5 py-2 border border-dark-border rounded-md bg-dark-bg text-dark-text text-[0.8rem] flex-1 min-w-[120px] outline-none focus:border-qsis">
                  <option value="">Day</option><option>Saturday</option><option>Sunday</option><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option>
                </select>
                <input type="text" name="slot" placeholder="Time slot (e.g. 8:00-8:55)" required class="px-2.5 py-2 border border-dark-border rounded-md bg-dark-bg text-dark-text text-[0.8rem] flex-1 min-w-[120px] outline-none focus:border-qsis" />
                <input type="text" name="subject" placeholder="Subject name" required class="px-2.5 py-2 border border-dark-border rounded-md bg-dark-bg text-dark-text text-[0.8rem] flex-1 min-w-[120px] outline-none focus:border-qsis" />
                <input type="text" name="teacher" placeholder="Teacher name" class="px-2.5 py-2 border border-dark-border rounded-md bg-dark-bg text-dark-text text-[0.8rem] flex-1 min-w-[120px] outline-none focus:border-qsis" />
                <input type="text" name="room" placeholder="Room" class="px-2.5 py-2 border border-dark-border rounded-md bg-dark-bg text-dark-text text-[0.8rem] flex-1 min-w-[120px] outline-none focus:border-qsis" />
                <select name="type" class="px-2.5 py-2 border border-dark-border rounded-md bg-dark-bg text-dark-text text-[0.8rem] flex-1 min-w-[120px] outline-none focus:border-qsis">
                  <option value="Lecture">Lecture</option><option value="Lab">Lab</option>
                </select>
                <button type="submit" class="whitespace-nowrap inline-flex items-center gap-[6px] px-4 py-2 rounded-xl bg-gradient-to-br from-qsis to-qsis-dark text-white border-none shadow-[0_0_16px_rgba(34,197,94,0.3)] cursor-pointer text-[0.8rem] font-semibold hover:shadow-[0_0_24px_rgba(34,197,94,0.3)] transition-all"><i class="fas fa-plus"></i> Add</button>
              </div>
            </form>
          </details>
        </div>
      </div>

      <div id="tabExam" class="routine-tab hidden">
        <div class="bg-dark-bg2 border border-dark-border rounded-xl p-5 mb-5">
          <h3 class="text-base font-semibold flex items-center gap-2 mb-4"><i class="fas fa-file-alt"></i> Exam &amp; Break Schedule</h3>
          <div id="examContainer" class="routine-print-area">
            <div id="examPrintHeader" class="routine-print-header">
              <div class="print-header-row">
                <div class="print-info">
                  <h2>International Islamic University Chittagong</h2>
                  <h3>Department of Qur'anic Sciences &amp; Islamic Studies</h3>
                  <p>Exam Schedule &middot; <span id="printExamSemLabel">-</span></p>
                </div>
                <div class="print-dept-logo"><img src="assets/iiuc-logo.png" alt="IIUC" height="60" /></div>
              </div>
            </div>
            <div id="examSchedule"><div class="text-center py-10 text-dark-text2"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div></div>
          </div>
          <details class="mt-4 bg-dark-bg3 border border-dark-border rounded-lg">
            <summary class="px-4 py-3 cursor-pointer font-semibold text-[0.85rem] flex items-center gap-2 text-qsis hover:opacity-80 transition-opacity"><i class="fas fa-plus-circle"></i> Add Exam / Break</summary>
            <form id="addExamForm" class="px-4 pb-4 pt-1 border-t border-dark-border">
              <div class="flex gap-2 flex-wrap mb-2">
                <input type="text" name="examName" placeholder="Exam/Break name (e.g. Midterm, Break)" required class="px-2.5 py-2 border border-dark-border rounded-md bg-dark-bg text-dark-text text-[0.8rem] flex-1 min-w-[120px] outline-none focus:border-qsis" />
                <input type="date" name="examStart" required class="px-2.5 py-2 border border-dark-border rounded-md bg-dark-bg text-dark-text text-[0.8rem] flex-1 min-w-[120px] outline-none focus:border-qsis" />
                <input type="date" name="examEnd" required class="px-2.5 py-2 border border-dark-border rounded-md bg-dark-bg text-dark-text text-[0.8rem] flex-1 min-w-[120px] outline-none focus:border-qsis" />
              </div>
              <div class="flex gap-2 flex-wrap">
                <input type="text" name="examSubjects" placeholder="Subjects (comma-separated)" class="px-2.5 py-2 border border-dark-border rounded-md bg-dark-bg text-dark-text text-[0.8rem] flex-[2] min-w-[120px] outline-none focus:border-qsis" />
                <button type="submit" class="whitespace-nowrap inline-flex items-center gap-[6px] px-4 py-2 rounded-xl bg-gradient-to-br from-qsis to-qsis-dark text-white border-none shadow-[0_0_16px_rgba(34,197,94,0.3)] cursor-pointer text-[0.8rem] font-semibold hover:shadow-[0_0_24px_rgba(34,197,94,0.3)] transition-all"><i class="fas fa-plus"></i> Add</button>
              </div>
            </form>
          </details>
        </div>
      </div>
    </main>`;
  },

  async init() {
    var semSelect = document.getElementById('routineSemester');
    if (!semSelect) return;

    try {
      var tree = await GITHUB.getUploadTree(true);
      var semIds = [...new Set(tree.tree.map(function(i) { return i.path.split('/')[0]; }).filter(Boolean))].sort();
      semIds.forEach(function(id) {
        var opt = document.createElement('option');
        opt.value = id;
        opt.textContent = semLabelFromId(id);
        semSelect.appendChild(opt);
      });
      if (semIds.length) semSelect.value = semIds[0];
    } catch (e) {
      CONFIG.semesters.forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.label;
        semSelect.appendChild(opt);
      });
    }

    var self = this;
    semSelect.addEventListener('change', function() { self.loadRoutine(); });
    this.loadRoutine();

    var form = document.getElementById('addClassForm');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var semId = semSelect.value;
        var data = new FormData(form);
        ROUTINE.addClass(semId, {
          day: data.get('day'),
          slot: data.get('slot'),
          subject: data.get('subject'),
          teacher: data.get('teacher'),
          room: data.get('room'),
          type: data.get('type')
        });
        form.reset();
        self.loadRoutine();
      });
    }

    var examForm = document.getElementById('addExamForm');
    if (examForm) {
      examForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var semId = semSelect.value;
        var data = new FormData(examForm);
        ROUTINE.addExam(semId, {
          name: data.get('examName'),
          startDate: data.get('examStart'),
          endDate: data.get('examEnd'),
          subjects: data.get('examSubjects')
        });
        examForm.reset();
        self.loadRoutine();
      });
    }

    var addSlotBtn = document.getElementById('addSlotBtn');
    if (addSlotBtn) {
      addSlotBtn.addEventListener('click', function() {
        var semId = semSelect.value;
        var input = document.getElementById('newSlotInput');
        if (input && input.value.trim()) {
          ROUTINE.addSlot(semId, input.value.trim());
          input.value = '';
          self.loadRoutine();
        }
      });
    }

    document.querySelectorAll('.routine-tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.routine-tab-btn').forEach(function(b) {
          b.classList.remove('bg-qsis', 'text-white');
          b.classList.add('bg-dark-bg2', 'text-dark-text2');
        });
        this.classList.remove('bg-dark-bg2', 'text-dark-text2');
        this.classList.add('bg-qsis', 'text-white');
        document.querySelectorAll('.routine-tab').forEach(function(t) { t.classList.add('hidden'); });
        var tab = document.getElementById(this.dataset.tab);
        if (tab) tab.classList.remove('hidden');
      });
    });
  },

  destroy() {},

  loadRoutine() {
    var semSelect = document.getElementById('routineSemester');
    if (!semSelect) return;
    var semId = semSelect.value;
    var labelEl = document.getElementById('currentSemesterLabel');
    if (labelEl) labelEl.textContent = semSelect.options[semSelect.selectedIndex] ? semSelect.options[semSelect.selectedIndex].text : '';
    this.renderRoutine(semId);
    this.renderExamSchedule(semId);
  },

  renderRoutine(semId) {
    var container = document.getElementById('routineGrid');
    if (!container) return;
    var printLabel = document.getElementById('printSemLabel');
    if (printLabel) printLabel.textContent = semId ? semLabelFromId(semId) : '-';
    var routines = ROUTINE.getRoutines(semId);
    var days = ROUTINE.days;
    var slots = routines.slots;

    if (!slots.length) {
      container.innerHTML = '<div class="text-center py-10 text-dark-text2"><i class="fas fa-clock"></i><p>Add time slots and classes above.</p></div>';
      return;
    }

    var html = '<div class="timetable-wrapper"><table class="timetable"><thead><tr><th class="time-col">Time</th>';
    days.forEach(function(d) { html += '<th>' + d + '</th>'; });
    html += '</tr></thead><tbody>';

    slots.forEach(function(slot) {
      html += '<tr><td class="time-col">' + esc(slot) + '</td>';
      days.forEach(function(day) {
        var cls = routines.classes.filter(function(c) { return c.day === day && c.slot === slot; });
        if (cls.length) {
          html += '<td class="has-class">';
          cls.forEach(function(c) {
            html += '<div class="class-entry" title="Teacher: ' + esc(c.teacher) + ', Room: ' + esc(c.room) + '">' +
              '<span class="class-subject">' + esc(c.subject) + '</span>' +
              '<span class="class-meta">' + esc(c.teacher) + ' &middot; ' + esc(c.room) + '</span>' +
              '<span class="class-type ' + (c.type === 'Lab' ? 'lab' : 'lecture') + '">' + esc(c.type) + '</span>' +
              '<button class="class-del" onclick="RoutineView.removeClass(\'' + semId + '\',' + c.id + ')" title="Remove">&times;</button>' +
            '</div>';
          });
          html += '</td>';
        } else {
          html += '<td class="empty-slot"></td>';
        }
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  },

  removeClass(semId, id) {
    if (!confirm('Remove this class entry?')) return;
    ROUTINE.removeClass(semId, id);
    this.loadRoutine();
  },

  renderExamSchedule(semId) {
    var container = document.getElementById('examSchedule');
    if (!container) return;
    var printLabel = document.getElementById('printExamSemLabel');
    if (printLabel) printLabel.textContent = semId ? semLabelFromId(semId) : '-';
    var exams = ROUTINE.getExams(semId);

    if (!exams.length) {
      container.innerHTML = '<div class="text-center py-10 text-dark-text2"><i class="fas fa-calendar-alt"></i><p>No exams scheduled yet. Add one above.</p></div>';
      return;
    }

    var html = '<div class="exam-list">';
    exams.sort(function(a, b) { return new Date(a.startDate) - new Date(b.startDate); }).forEach(function(e) {
      html += '<div class="exam-card">' +
        '<div class="exam-header">' +
          '<strong class="text-[0.9rem]">' + esc(e.name) + '</strong>' +
          '<button class="exam-del" onclick="RoutineView.removeExam(\'' + semId + '\',' + e.id + ')" title="Remove">&times;</button>' +
        '</div>' +
        '<div class="exam-dates">' + esc(e.startDate) + ' &rarr; ' + esc(e.endDate) + '</div>' +
        '<div class="exam-subjects">' + esc(e.subjects) + '</div>' +
      '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  },

  removeExam(semId, id) {
    if (!confirm('Remove this exam schedule?')) return;
    ROUTINE.removeExam(semId, id);
    this.loadRoutine();
  },

  async downloadImage() {
    var containerId = document.getElementById('tabClass').classList.contains('hidden') ? 'examContainer' : 'routineContainer';
    var header = document.querySelector('#' + containerId + ' .routine-print-header');
    if (header) header.style.display = 'block';
    var el = document.getElementById(containerId);
    var canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    if (header) header.style.display = 'none';
    var link = document.createElement('a');
    link.download = 'QSIS-Routine-' + (document.getElementById('routineSemester').value || 'all') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  },

  async downloadPDF() {
    var containerId = document.getElementById('tabClass').classList.contains('hidden') ? 'examContainer' : 'routineContainer';
    var header = document.querySelector('#' + containerId + ' .routine-print-header');
    if (header) header.style.display = 'block';
    var el = document.getElementById(containerId);
    var canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    if (header) header.style.display = 'none';
    var imgData = canvas.toDataURL('image/png');
    var jsPDF = window.jspdf;
    var pdf = new jsPDF.jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save('QSIS-Routine-' + (document.getElementById('routineSemester').value || 'all') + '.pdf');
  }
};
