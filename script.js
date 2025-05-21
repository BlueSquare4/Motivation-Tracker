// Elements & Templates
const main = document.getElementById('mainContent');
const templates = {
  log: document.getElementById('logView'),
  calendar: document.getElementById('calendarView'),
  stats: document.getElementById('statsView'),
  export: document.getElementById('exportView'),
};
const themeToggle = document.getElementById('themeToggle');
const quoteEl = document.getElementById('dailyQuote');
const authorEl = document.getElementById('quoteAuthor');

// State
let logs = JSON.parse(localStorage.getItem('logs') || '[]');
const quotes = [
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "It always seems impossible until it’s done.", author: "Nelson Mandela" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" }
];

// Initialization
document.querySelectorAll('.nav-btn').forEach(btn =>
  btn.addEventListener('click', () => switchView(btn.dataset.view))
);
themeToggle.addEventListener('click', () => document.body.classList.toggle('dark'));

renderQuote();
switchView('log');

// Daily Quote (rotates by day index)
function renderQuote(){
  const dayIndex = new Date().getDate() % quotes.length;
  quoteEl.innerText = `"${quotes[dayIndex].text}"`;
  authorEl.innerText = `— ${quotes[dayIndex].author}`;
}

// View Switcher
function switchView(view) {
  document.querySelectorAll('.nav-btn')
    .forEach(b => b.classList.toggle('active', b.dataset.view === view));
  main.innerHTML = '';
  main.append(templates[view].content.cloneNode(true));
  if (view === 'log') initLogView();
  if (view === 'calendar') initCalendar();
  if (view === 'stats') initStats();
  if (view === 'export') initExport();
}

// Helpers
function saveLogs() {
  localStorage.setItem('logs', JSON.stringify(logs));
}
function calcPoints(entry) {
  // 2 points for DSA if filled, 2 for each gym exercise, 1 for each 'Others' if filled
  let pts = 0;
  if (entry.dsa && entry.dsa.trim()) pts += 2;
  if (entry.gymExercises && Array.isArray(entry.gymExercises)) {
    pts += entry.gymExercises.filter(e => e.name && e.name.trim()).length * 2;
  }
  ['ml','os','net'].forEach(k => {
    if (entry[k] && entry[k].trim()) pts += 1;
  });
  return pts;
}

// Log View
function initLogView() {
  const form = document.getElementById('logForm');
  const logsDiv = document.getElementById('logs');
  const streakEl = document.getElementById('streakCount');
  const pointsEl = document.getElementById('pointsCount');
  const gymNum = form.querySelector('[name="gymNum"]');
  const gymSlotsDiv = document.getElementById('gymExerciseSlots');

  // Dynamic gym slots
  gymNum.addEventListener('change', () => {
    gymSlotsDiv.innerHTML = '';
    const n = parseInt(gymNum.value);
    if (!n || n < 1 || n > 7) return;
    for (let i = 0; i < n; i++) {
      const row = document.createElement('div');
      row.className = 'gym-exercise-row';
      row.innerHTML = `
        <input type="text" name="gymExerciseName${i}" placeholder="Exercise Name">
        <input type="number" name="gymExerciseSets${i}" placeholder="Sets" min="1" max="10">
        <input type="number" name="gymExerciseReps${i}" placeholder="Reps" min="1" max="50">
      `;
      gymSlotsDiv.appendChild(row);
    }
  });

  renderLogs();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    // Gather gym exercises
    let gymExercises = [];
    const num = parseInt(data.gymNum);
    for (let i = 0; i < num; i++) {
      gymExercises.push({
        name: data[`gymExerciseName${i}`] || '',
        sets: data[`gymExerciseSets${i}`] || '',
        reps: data[`gymExerciseReps${i}`] || ''
      });
      // Remove from data to avoid clutter
      delete data[`gymExerciseName${i}`];
      delete data[`gymExerciseSets${i}`];
      delete data[`gymExerciseReps${i}`];
    }
    data.gymExercises = gymExercises;
    data.timestamp = new Date().toLocaleString();
    data.points = calcPoints(data);
    logs.push(data);
    saveLogs();
    form.reset();
    gymSlotsDiv.innerHTML = '';
    renderLogs();
  });

  function renderLogs() {
    // Update streak & points
    streakEl.innerText = logs.length;
    pointsEl.innerText = logs.reduce((s, l) => s + (l.points || 0), 0);

    // Show each entry
    logsDiv.innerHTML = logs.map((l,i) => `
      <div>
        <button class="delete-btn" data-index="${i}" title="Delete Entry">✖</button>
        <strong>Day ${i+1} — ${l.timestamp}</strong><br>
        <span style="color:var(--primary);font-weight:600;">🚀 DSA:</span> ${l.dsa || '–'}<br>
        <span style="font-weight:600;">💪 Gym:</span> 
        ${l.gymTarget ? `Target: ${l.gymTarget}<br>` : ''}
        ${l.gymExercises && l.gymExercises.length ? l.gymExercises.map((ex, idx) => 
          ex.name ? `&nbsp;&nbsp;${idx+1}. ${ex.name} (${ex.sets || '-'} sets × ${ex.reps || '-'} reps)` : ''
        ).filter(Boolean).join('<br>') : '–'}<br>
        <span style="font-weight:600;">Others:</span>
        ${l.ml ? `🤖 ML: ${l.ml} ` : ''}${l.os ? `⚙️ OS: ${l.os} ` : ''}${l.net ? `🌐 Net: ${l.net}` : ''}<br>
        <em>Points: ${l.points}</em><br>
        📅 ${l.scheduledDate || '–'} @ ${l.scheduledTime || '–'}<br>
        📝 ${l.taskDesc || 'No task'}
      </div>`).join('');

    // Attach delete handlers
    logsDiv.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = function() {
        const idx = parseInt(this.dataset.index);
        if (confirm('Delete this entry?')) {
          logs.splice(idx, 1);
          saveLogs();
          renderLogs();
        }
      }
    });
  }
}

// Calendar View
function initCalendar() {
  const monthPicker = document.getElementById('monthPicker');
  const grid = document.getElementById('calendarGrid');
  monthPicker.value = new Date().toISOString().slice(0,7);
  monthPicker.addEventListener('change', drawCalendar);
  drawCalendar();

  function drawCalendar() {
    grid.innerHTML = '';
    const [y,m] = monthPicker.value.split('-').map(Number);
    const firstDow = new Date(y,m-1,1).getDay();
    const days = new Date(y,m,0).getDate();
    for (let i=0; i<firstDow; i++) grid.append(document.createElement('div'));
    for (let d=1; d<=days; d++){
      const cell = document.createElement('div');
      cell.textContent = d;
      const today = new Date();
      if (d===today.getDate() && m===today.getMonth()+1 && y===today.getFullYear())
        cell.classList.add('today');
      grid.append(cell);
    }
  }
}

// Stats View
function initStats() {
  document.getElementById('totalLogs').innerText = logs.length;
  const upcoming = logs.filter(l => {
    if (!l.scheduledDate) return false;
    return new Date(`${l.scheduledDate}T${l.scheduledTime}`) > new Date();
  }).length;
  document.getElementById('upcomingTasks').innerText = upcoming;
  document.getElementById('totalPoints').innerText =
    logs.reduce((s,l) => s + (l.points || 0), 0);
}

// Export View
function initExport() {
  document.getElementById('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(logs,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'blue_motivation_logs.json'; a.click();
  };
  document.getElementById('clearBtn').onclick = () => {
    if (confirm('Clear all entries?')) {
      logs = []; saveLogs(); switchView('log');
    }
  };
}
