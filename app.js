/* =============================================================
   ROUTINELY — app.js
   
   TABLE OF CONTENTS
   -----------------
   01. State & Storage
   02. Config / Constants
   03. Initialisation
   04. Persistence (save / load)
   05. Date Utilities
   06. Selectors (UI pickers)
   07. Filter
   08. Add Task
   09. Toggle Done
   10. Cycle Priority (quick-change on card)
   11. Delete Task
   12. Edit Modal
   13. Streak Engine
   14. Heatmap
   15. Productivity Score
   16. Priority Breakdown Chart
   17. Render Tasks
   18. Toast Notifications
   19. Event Listeners
   20. Seed Demo Data
   21. Boot
============================================================= */


/* =============================================================
   01. STATE & STORAGE
   All application state lives here. Nothing is stored in the DOM.
============================================================= */

let tasks      = JSON.parse(localStorage.getItem('routinely_tasks')   || '[]');
let history    = JSON.parse(localStorage.getItem('routinely_history') || '{}'); // { "YYYY-MM-DD": completedCount }
let streakData = JSON.parse(localStorage.getItem('routinely_streak')  || '{"current":0,"best":0}');

// UI state — which filter / pickers are active
let filter           = 'all';
let selectedCat      = 'Work';
let selectedPriority = 'medium';
let selectedRecur    = 'none';

// Edit modal state
let editingId    = null;
let editPriority = 'medium';
let editRecur    = 'none';


/* =============================================================
   02. CONFIG / CONSTANTS
   Centralised lookup tables — change values here once to update
   everywhere else in the app.
============================================================= */

/** Ordered from most to least urgent — used for sorting & cycling */
const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

/** Display metadata for each priority level */
const PRIORITY_META = {
  urgent: { icon: '🚨', label: 'Urgent', color: '#ff4040' },
  high:   { icon: '🔴', label: 'High',   color: '#ff5757' },
  medium: { icon: '⚡', label: 'Medium', color: '#f0b429' },
  low:    { icon: '🟢', label: 'Low',    color: '#56d9a0' },
};

/** Display metadata for each recurrence pattern */
const RECUR_META = {
  none:     { icon: '–',  label: 'None' },
  daily:    { icon: '📅', label: 'Daily' },
  weekdays: { icon: '💼', label: 'Weekdays' },
  weekly:   { icon: '📆', label: 'Weekly' },
  monthly:  { icon: '🗓', label: 'Monthly' },
};

/** Motivational messages shown at different streak tiers */
const STREAK_MESSAGES = [
  '',                              // 0 days
  "You're on a roll! 🔥",          // 1–2 days
  'Momentum is building! ⚡',       // 3–6 days
  "You're unstoppable! 🚀",         // 7–13 days
  'Legendary streak! 🏆',           // 14+ days
];


/* =============================================================
   03. INITIALISATION
   Runs once when the page loads.
============================================================= */

/** Today's date as a YYYY-MM-DD string — used everywhere as a key */
const today = new Date().toISOString().split('T')[0];

// Pre-fill the date picker with today
document.getElementById('taskDate').value = today;

// Show today's friendly date in the header chip
document.getElementById('dateDisplay').textContent =
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  });


/* =============================================================
   04. PERSISTENCE
============================================================= */

/** Writes all application state to localStorage */
function save() {
  localStorage.setItem('routinely_tasks',   JSON.stringify(tasks));
  localStorage.setItem('routinely_history', JSON.stringify(history));
  localStorage.setItem('routinely_streak',  JSON.stringify(streakData));
}


/* =============================================================
   05. DATE UTILITIES
============================================================= */

/**
 * Given a start date and a recurrence pattern, returns the
 * next occurrence date as a YYYY-MM-DD string.
 *
 * @param {string} fromDate - Base date in YYYY-MM-DD format
 * @param {string} recur    - One of: daily | weekdays | weekly | monthly
 * @returns {string}
 */
function nextDueDate(fromDate, recur) {
  const d = new Date((fromDate || today) + 'T00:00:00');

  switch (recur) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;

    case 'weekdays':
      // Advance one day, then keep skipping weekend days
      d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) {
        d.setDate(d.getDate() + 1);
      }
      break;

    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;

    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;

    default:
      return fromDate;
  }

  return d.toISOString().split('T')[0];
}

/**
 * Returns true if a due date is in the past (i.e. before today).
 * @param {string} due - YYYY-MM-DD
 */
function isOverdue(due) {
  return due && due < today;
}


/* =============================================================
   06. SELECTORS — UI Picker Handlers
   These functions update state whenever the user clicks a pill
   in the Add Form or Edit Modal.
============================================================= */

function selectCat(el) {
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  selectedCat = el.dataset.cat;
}

function selectPriority(el) {
  document.querySelectorAll('.priority-pill').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  selectedPriority = el.dataset.p;
}

function selectRecur(el) {
  document.querySelectorAll('.recur-pill').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  selectedRecur = el.dataset.r;
}

function selectEditPriority(el) {
  document.querySelectorAll('.modal-priority-pill').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  editPriority = el.dataset.p;
}

function selectEditRecur(el) {
  document.querySelectorAll('.modal-recur-pill').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  editRecur = el.dataset.r;
}


/* =============================================================
   07. FILTER
============================================================= */

/**
 * Sets the active filter and re-renders the task list.
 * @param {string} f   - Filter key (all | active | done | high | overdue | recur | <priority>)
 * @param {Element} btn - The filter button element (optional — used to highlight it)
 */
function setFilter(f, btn) {
  filter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTasks();
}

/**
 * Convenience: filter to a specific priority level (called from the chart bars).
 * @param {string} p - Priority key
 */
function filterByPriority(p) {
  filter = p;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  renderTasks();
  showToast(PRIORITY_META[p].icon, `Showing ${PRIORITY_META[p].label} tasks`);
}


/* =============================================================
   08. ADD TASK
============================================================= */

/** Reads the add-form fields, creates a new task, and saves it. */
function addTask() {
  const text = document.getElementById('taskInput').value.trim();

  if (!text) {
    showToast('⚠️', 'Please enter a task name!');
    return;
  }

  const newTask = {
    id:            Date.now(),
    text,
    category:      selectedCat,
    priority:      selectedPriority,
    recur:         selectedRecur,
    due:           document.getElementById('taskDate').value,
    done:          false,
    notes:         '',
    completedDate: null,
    createdAt:     new Date().toISOString(),
  };

  tasks.unshift(newTask);
  save();
  renderTasks();
  renderStreak();

  // Reset form inputs
  document.getElementById('taskInput').value = '';
  document.getElementById('taskDate').value  = today;

  showToast('✅', 'Task added!');
}


/* =============================================================
   09. TOGGLE DONE
   Marks a task complete or active. When a recurring task is
   completed, a clone is automatically created for the next
   due date.
============================================================= */

function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  // Flip the done flag
  task.done          = !task.done;
  task.completedDate = task.done ? today : null;

  // Update today's completion count in history
  const todayDone     = tasks.filter(t => t.done && t.completedDate === today).length;
  history[today] = todayDone;

  // Spawn the next occurrence if this is a recurring task being completed
  if (task.done && task.recur && task.recur !== 'none') {
    const nextDue = nextDueDate(task.due || today, task.recur);
    const recurringClone = {
      ...task,
      id:            Date.now() + Math.floor(Math.random() * 999),
      done:          false,
      completedDate: null,
      due:           nextDue,
      createdAt:     new Date().toISOString(),
    };
    tasks.push(recurringClone);
    showToast(RECUR_META[task.recur].icon, `Next ${RECUR_META[task.recur].label} task → ${nextDue}`);
  } else {
    showToast(task.done ? '🎉' : '↩️', task.done ? 'Task completed!' : 'Marked as active');
  }

  save();
  renderTasks();
  renderStreak();

  // Milestone celebrations
  if (task.done) {
    if (todayDone === 5)  setTimeout(() => showToast('⭐', '5 tasks done today — great work!'), 500);
    if (todayDone === 10) setTimeout(() => showToast('🏆', "10 tasks done! You're crushing it!"), 500);
  }
}


/* =============================================================
   10. CYCLE PRIORITY
   Clicking the priority badge on a task card cycles through
   all priority levels without opening the edit modal.
============================================================= */

function cyclePriority(id, event) {
  event.stopPropagation(); // Prevent bubbling to the card

  const task = tasks.find(t => t.id === id);
  if (!task || task.done) return;

  const currentIndex = PRIORITY_ORDER.indexOf(task.priority);
  task.priority      = PRIORITY_ORDER[(currentIndex + 1) % PRIORITY_ORDER.length];

  save();
  renderTasks();

  const { icon, label } = PRIORITY_META[task.priority];
  showToast(icon, `Priority → ${label}`);
}


/* =============================================================
   11. DELETE TASK
============================================================= */

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  renderTasks();
  renderStreak();
  showToast('🗑️', 'Task deleted');
}


/* =============================================================
   12. EDIT MODAL
============================================================= */

/** Opens the edit modal and pre-populates all fields. */
function openEdit(id) {
  editingId = id;
  const task = tasks.find(t => t.id === id);

  // Populate text fields
  document.getElementById('editText').value  = task.text;
  document.getElementById('editCat').value   = task.category;
  document.getElementById('editDate').value  = task.due || '';
  document.getElementById('editNotes').value = task.notes || '';

  // Sync picker state
  editPriority = task.priority || 'medium';
  editRecur    = task.recur    || 'none';

  document.querySelectorAll('.modal-priority-pill')
    .forEach(p => p.classList.toggle('selected', p.dataset.p === editPriority));

  document.querySelectorAll('.modal-recur-pill')
    .forEach(p => p.classList.toggle('selected', p.dataset.r === editRecur));

  document.getElementById('editModal').classList.add('open');
}

/** Closes the edit modal without saving. */
function closeModal() {
  document.getElementById('editModal').classList.remove('open');
  editingId = null;
}

/** Reads modal fields and saves changes to the task. */
function saveEdit() {
  const task = tasks.find(t => t.id === editingId);

  task.text     = document.getElementById('editText').value.trim() || task.text;
  task.category = document.getElementById('editCat').value;
  task.priority = editPriority;
  task.recur    = editRecur;
  task.due      = document.getElementById('editDate').value;
  task.notes    = document.getElementById('editNotes').value;

  save();
  renderTasks();
  closeModal();
  showToast('✏️', 'Task updated!');
}


/* =============================================================
   13. STREAK ENGINE
   Calculates the current streak by walking backwards from today
   through the history object, counting consecutive days with
   at least one completed task.
============================================================= */

function updateStreak() {
  // Record today's current completion count
  const todayDone   = tasks.filter(t => t.done && t.completedDate === today).length;
  history[today] = todayDone;

  // Walk backwards counting consecutive active days
  let streak  = 0;
  const cursor = new Date(today + 'T00:00:00');

  for (let i = 0; i < 365; i++) {
    const dateKey = cursor.toISOString().split('T')[0];
    if ((history[dateKey] || 0) > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break; // Gap found — streak ends
    }
  }

  streakData.current = streak;
  if (streak > (streakData.best || 0)) {
    streakData.best = streak;
  }
}

/** Calls updateStreak() then refreshes all streak-related UI. */
function renderStreak() {
  updateStreak();

  const s = streakData.current;

  document.getElementById('streakCount').textContent = s;
  document.getElementById('streakBest').textContent  = streakData.best || 0;

  // Fire emoji intensity scales with streak length
  document.getElementById('streakFire').textContent =
    s === 0 ? '💤' : s < 3 ? '🔥' : s < 7 ? '🔥🔥' : '🔥🔥🔥';

  // Motivational message by tier
  const tier = s === 0 ? 0 : s < 3 ? 1 : s < 7 ? 2 : s < 14 ? 3 : 4;
  document.getElementById('streakMsg').textContent = tier > 0 ? STREAK_MESSAGES[tier] : '';

  renderHeatmap();
  renderProductivityScore();
}


/* =============================================================
   14. HEATMAP
   Renders the last 14 days as a bar chart inside the streak card.
   Bar height and colour intensity reflect completion volume.
============================================================= */

function renderHeatmap() {
  // Build an array of the last 14 dates (oldest → newest)
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  // Find the peak value so we can normalise bar heights
  const maxValue = Math.max(...days.map(d => history[d.toISOString().split('T')[0]] || 0), 1);

  document.getElementById('heatmap').innerHTML = days.map(date => {
    const dateKey    = date.toISOString().split('T')[0];
    const count      = history[dateKey] || 0;
    const isToday    = dateKey === today;
    const dayLabel   = date.toLocaleDateString('en-US', { weekday: 'narrow' });

    // Assign a heat level (0–4) based on how this day compares to the peak
    const level =
      count === 0              ? 0 :
      count >= maxValue        ? 4 :
      count >= maxValue * 0.7  ? 3 :
      count >= maxValue * 0.4  ? 2 : 1;

    // Bar height in px (minimum 6px so every active day is visible)
    const barHeight = Math.max(6, Math.round((count / maxValue) * 36));

    return `
      <div class="heatmap-day ${isToday ? 'today' : ''}" title="${dateKey}: ${count} completed">
        <div class="heatmap-bar level-${level}" style="height: ${barHeight}px"></div>
        <div class="heatmap-day-label">${dayLabel}</div>
      </div>
    `;
  }).join('');
}


/* =============================================================
   15. PRODUCTIVITY SCORE
   A composite 0–100 score weighted across three factors:
     50% — task completion rate
     30% — streak progress (capped at 14 days = 100%)
     20% — high-priority task completion rate
============================================================= */

function renderProductivityScore() {
  const total      = tasks.length;
  const done       = tasks.filter(t => t.done).length;
  const highDone   = tasks.filter(t => t.done   && (t.priority === 'high' || t.priority === 'urgent')).length;
  const highTotal  = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length;

  // Individual factor percentages
  const completionPct = total     > 0 ? Math.round((done     / total)    * 100) : 0;
  const streakPct     = Math.min(100,  Math.round((streakData.current / 14) * 100));
  const priorityPct   = highTotal > 0 ? Math.round((highDone / highTotal) * 100) : 100;

  // Weighted composite score
  const score = Math.round(completionPct * 0.5 + streakPct * 0.3 + priorityPct * 0.2);
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  // Update score and grade display
  document.getElementById('scoreNumber').textContent = score;
  const gradeEl = document.getElementById('scoreGrade');
  gradeEl.textContent = grade;
  gradeEl.className   = `score-grade ${grade}`;

  // Update factor bars
  document.getElementById('sf-completion').style.width  = completionPct + '%';
  document.getElementById('sfv-completion').textContent = completionPct + '%';

  document.getElementById('sf-streak').style.width      = streakPct + '%';
  document.getElementById('sfv-streak').textContent     = streakPct + '%';

  document.getElementById('sf-priority').style.width    = priorityPct + '%';
  document.getElementById('sfv-priority').textContent   = priorityPct + '%';
}


/* =============================================================
   16. PRIORITY BREAKDOWN CHART
   A simple bar chart showing how many active (incomplete) tasks
   exist at each priority level. Bars are clickable to filter.
============================================================= */

function renderPriorityBreakdown() {
  // Count active tasks per priority
  const counts = { urgent: 0, high: 0, medium: 0, low: 0 };
  tasks
    .filter(t => !t.done)
    .forEach(t => {
      if (counts[t.priority] !== undefined) counts[t.priority]++;
    });

  const max = Math.max(...Object.values(counts), 1);

  document.getElementById('priorityBreakdown').innerHTML = PRIORITY_ORDER.map(p => {
    const meta       = PRIORITY_META[p];
    const barHeight  = Math.max(4, Math.round((counts[p] / max) * 40));

    return `
      <div class="pb-col" onclick="filterByPriority('${p}')" title="Filter by ${meta.label}">
        <div class="pb-col-bar-wrap">
          <div class="pb-col-bar ${p}" style="height: ${barHeight}px"></div>
        </div>
        <div class="pb-col-count ${p}">${counts[p]}</div>
        <div class="pb-col-label">${meta.icon} ${meta.label}</div>
      </div>
    `;
  }).join('');
}


/* =============================================================
   17. RENDER TASKS
   The main render function. Filters, sorts, and builds the
   task list HTML, then updates all counters and charts.
============================================================= */

function renderTasks() {
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();

  // ── Filter ──────────────────────────────────────────────────
  let filtered = tasks.filter(task => {
    // Text search (applied regardless of filter)
    if (searchQuery && !task.text.toLowerCase().includes(searchQuery)) return false;

    switch (filter) {
      case 'active':  return !task.done;
      case 'done':    return task.done;
      case 'high':    return task.priority === 'high' || task.priority === 'urgent';
      case 'overdue': return !task.done && isOverdue(task.due);
      case 'recur':   return task.recur && task.recur !== 'none';
      default:
        // Could be a priority-level filter (e.g. 'urgent', 'medium', 'low')
        if (PRIORITY_ORDER.includes(filter)) return task.priority === filter;
        return true; // 'all'
    }
  });

  // ── Sort: urgent first, completed last ──────────────────────
  filtered.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
  });

  // ── Render list ─────────────────────────────────────────────
  const list = document.getElementById('taskList');

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🌿</div>
        <p>No tasks here. Add one above!</p>
      </div>
    `;
  } else {
    list.innerHTML = filtered.map(task => {
      const overdue   = !task.done && isOverdue(task.due);
      const dueStr    = task.due ? (overdue ? `⚠ Overdue: ${task.due}` : `📅 ${task.due}`) : '';
      const meta      = PRIORITY_META[task.priority] || PRIORITY_META.medium;
      const recurMeta = (task.recur && task.recur !== 'none') ? RECUR_META[task.recur] : null;
      const nextDue   = (task.done && recurMeta) ? nextDueDate(task.due || today, task.recur) : null;

      return `
        <div class="task-item ${task.done ? 'done' : ''}"
             data-cat="${task.category}"
             data-priority="${task.priority}">

          <!-- Completion checkbox -->
          <div class="task-check ${task.done ? 'done' : ''}"
               data-id="${task.id}"
               onclick="toggleDone(${task.id})">
            ${task.done ? '✓' : ''}
          </div>

          <!-- Task content -->
          <div class="task-body">
            <div class="task-text">${escapeHtml(task.text)}</div>
            <div class="task-meta">

              <!-- Priority badge (click to cycle) -->
              <span class="task-priority-badge ${task.priority}"
                    onclick="cyclePriority(${task.id}, event)"
                    title="Click to change priority">
                ${meta.icon} ${meta.label}
              </span>

              <!-- Category badge -->
              <span class="task-cat-badge">${task.category}</span>

              <!-- Recurring indicator -->
              ${recurMeta ? `<span class="recur-badge">🔁 ${recurMeta.label}</span>` : ''}

              <!-- Next occurrence (shown when recurring task is completed) -->
              ${nextDue ? `<span class="next-due-badge">↻ Next: ${nextDue}</span>` : ''}

              <!-- Due date -->
              ${dueStr ? `<span class="task-due ${overdue ? 'overdue' : ''}">${dueStr}</span>` : ''}

              <!-- Notes indicator -->
              ${task.notes ? `<span class="task-due" title="${escapeHtml(task.notes)}">📝 Note</span>` : ''}

            </div>
          </div>

          <!-- Action buttons (visible on hover) -->
          <div class="task-actions">
            <div class="icon-btn edit" onclick="openEdit(${task.id})"   title="Edit">✏️</div>
            <div class="icon-btn del"  onclick="deleteTask(${task.id})" title="Delete">🗑</div>
          </div>

        </div>
      `;
    }).join('');
  }

  // ── Update counters & charts ─────────────────────────────────
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const overdue = tasks.filter(t => !t.done && isOverdue(t.due)).length;

  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statDone').textContent    = done;
  document.getElementById('statPending').textContent = total - done;
  document.getElementById('statOverdue').textContent = overdue;
  document.getElementById('taskCount').textContent   = `${filtered.length} task${filtered.length !== 1 ? 's' : ''}`;

  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('progressPct').textContent  = completionPct + '%';
  document.getElementById('progressFill').style.width = completionPct + '%';

  renderPriorityBreakdown();
}


/* =============================================================
   18. TOAST NOTIFICATIONS
   A simple slide-up notification shown briefly at the bottom
   right of the screen.
============================================================= */

let toastTimer; // Holds the auto-dismiss timeout

/**
 * Shows a toast message.
 * @param {string} icon - An emoji to display on the left
 * @param {string} msg  - The message text
 */
function showToast(icon, msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastIcon').textContent = icon;
  document.getElementById('toastMsg').textContent  = msg;

  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}


/* =============================================================
   19. UTILITY HELPERS
============================================================= */

/**
 * Escapes HTML special characters to prevent XSS when inserting
 * user-supplied text into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}


/* =============================================================
   20. EVENT LISTENERS
============================================================= */

// Press Enter in the task input to quickly add a task
document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

// Click outside the modal to close it
document.getElementById('editModal').addEventListener('click', e => {
  if (e.target === document.getElementById('editModal')) closeModal();
});


/* =============================================================
   21. SEED DEMO DATA
   Populates sample tasks and history on first load so users
   immediately see a meaningful, populated interface.
============================================================= */

if (tasks.length === 0) {
  // Seed the last 5 days with some completion history
  for (let i = 5; i >= 1; i--) {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - i);
    history[d.toISOString().split('T')[0]] = Math.floor(Math.random() * 4) + 1;
  }

  tasks = [
    {
      id: 1, text: 'Review morning emails',
      category: 'Work',     priority: 'urgent', recur: 'weekdays',
      due: today, done: false, notes: 'Check urgent flagged items',
      completedDate: null, createdAt: new Date().toISOString(),
    },
    {
      id: 2, text: '30 min morning run 🏃',
      category: 'Health',   priority: 'medium', recur: 'daily',
      due: today, done: true, notes: '',
      completedDate: today, createdAt: new Date().toISOString(),
    },
    {
      id: 3, text: 'Read 20 pages',
      category: 'Learning', priority: 'low',    recur: 'daily',
      due: today, done: false, notes: '',
      completedDate: null, createdAt: new Date().toISOString(),
    },
    {
      id: 4, text: 'Plan weekly grocery list',
      category: 'Personal', priority: 'high',   recur: 'weekly',
      due: today, done: false, notes: '',
      completedDate: null, createdAt: new Date().toISOString(),
    },
    {
      id: 5, text: 'Submit project proposal',
      category: 'Work',     priority: 'urgent', recur: 'none',
      due: today, done: false, notes: 'Due end of day!',
      completedDate: null, createdAt: new Date().toISOString(),
    },
    {
      id: 6, text: 'Team standup meeting',
      category: 'Work',     priority: 'high',   recur: 'weekdays',
      due: today, done: true, notes: '',
      completedDate: today, createdAt: new Date().toISOString(),
    },
  ];

  history[today] = tasks.filter(t => t.done).length;
  save();
}


/* =============================================================
   BOOT — run everything on page load
============================================================= */
renderTasks();
renderStreak();
