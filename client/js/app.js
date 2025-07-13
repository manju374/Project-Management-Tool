let currentProjectId = null;
const ws = new WebSocket(`ws://${window.location.hostname}:5000`);
let token = '';
let role = '';

// ---------- Login ----------
function login() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;

  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
    .then(res => {
      if (!res.ok) throw new Error('Login failed');
      return res.json();
    })
    .then(data => {
      token = data.token;
      role = data.role;

      alert(`Logged in as ${role}`);
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('mainApp').style.display = 'block';

      document.getElementById('adminControls').style.display = role === 'admin' ? 'block' : 'none';
      document.getElementById('taskControls').style.display = role === 'admin' ? 'block' : 'none';

      loadProjects();
    })
    .catch(() => alert('Login failed'));
}

// ---------- WebSocket Chat ----------
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'chat') {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML += `<div>${msg.data}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
  }
};

function sendMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  ws.send(JSON.stringify({ type: 'chat', data: msg }));
  input.value = '';
}

// ---------- Projects ----------
function createProject() {
  if (role !== 'admin') return alert('Only admins can create projects');

  const name = document.getElementById('projectName').value.trim();
  if (!name) return alert('Please enter a project name');

  fetch('/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name }),
  })
    .then(res => res.json())
    .then(() => {
      document.getElementById('projectName').value = '';
      loadProjects();
    })
    .catch(err => console.error('Error creating project:', err));
}

function loadProjects() {
  fetch('/projects', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      const div = document.getElementById('projects');
      div.innerHTML = '';
      data.forEach(p => {
        const btn = document.createElement('button');
        btn.innerText = p.name;
        btn.onclick = () => {
          currentProjectId = p.id;
          loadTasks();
        };
        div.appendChild(btn);
      });
    })
    .catch(err => console.error('Error loading projects:', err));
}

// ---------- Tasks ----------
function addTask() {
  if (!currentProjectId) return alert("Please select a project first.");
  if (role !== 'admin') return alert("Only admins can create tasks.");

  const title = document.getElementById('taskTitle').value.trim();
  const status = document.getElementById('taskStatus').value;
  const start_date = document.getElementById('taskStartDate').value;
  const deadline = document.getElementById('taskDeadline').value;

  if (!title || !start_date || !deadline) {
    alert("Please provide task title, start date, and deadline.");
    return;
  }

  fetch('/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      project_id: currentProjectId,
      title,
      status,
      start_date,
      deadline
    }),
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to add task");
      return res.json();
    })
    .then(() => {
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskStartDate').value = '';
      document.getElementById('taskDeadline').value = '';
      document.getElementById('taskStatus').selectedIndex = 0;
      loadTasks();
    })
    .catch(err => console.error('Error adding task:', err));
}

// ---------- Load Tasks + Gantt Chart ----------
function loadTasks() {
  fetch(`/tasks/${currentProjectId}`)
    .then(res => res.json())
    .then(tasks => {
      // --- Kanban Board ---
      const statuses = ['To-Do', 'In Progress', 'Done'];
      const board = document.getElementById('kanban');
      board.innerHTML = '';

      statuses.forEach(status => {
        const col = document.createElement('div');
        col.className = 'column';
        col.innerHTML = `<h3>${status}</h3>`;
        tasks
          .filter(t => t.status === status)
          .forEach(t => {
            col.innerHTML += `<div>${t.title} (Due: ${t.deadline})</div>`;
          });
        board.appendChild(col);
      });

      // --- Gantt Chart ---
      const ganttData = tasks
        .filter(t => t.start_date && t.deadline)
        .map(t => ({
          id: `${t.id}`,
          name: t.title,
          start: t.start_date,
          end: t.deadline,
          progress: 0,
          dependencies: ''
        }));

      const ganttEl = document.getElementById('gantt');
      ganttEl.innerHTML = '';

      if (ganttData.length > 0) {
        new window.Gantt("#gantt", ganttData); // ✅ Ensure correct access
      } else {
        ganttEl.innerHTML = 'No tasks to show in Gantt chart';
      }
    })
    .catch(err => console.error("Error loading tasks:", err));
}

// ---------- Initialize View ----------
document.getElementById('mainApp').style.display = 'none';
document.getElementById('adminControls').style.display = 'none';
document.getElementById('taskControls').style.display = 'none';
