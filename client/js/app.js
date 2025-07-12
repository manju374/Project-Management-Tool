let currentProjectId = null;
const ws = new WebSocket(`ws://${window.location.hostname}:5000`);
let token = '';
let role = '';
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

      if (role === 'admin') {
        document.getElementById('adminControls').style.display = 'block';
        document.getElementById('taskControls').style.display = 'block';
      } else {
        document.getElementById('adminControls').style.display = 'none';
        document.getElementById('taskControls').style.display = 'none';
      }

      loadProjects();
    })
    .catch(() => alert('Login failed'));
}
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'chat') {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML += `<div>${msg.data}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight; 
  }
};

function createProject() {
  if (role !== 'admin') {
    alert('Only admins can create projects');
    return;
  }
  const name = document.getElementById('projectName').value.trim();
  if (!name) {
    alert('Please enter a project name');
    return;
  }

  fetch('/projects', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name }),
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to create project');
      return res.json();
    })
    .then(() => {
      document.getElementById('projectName').value = '';
      loadProjects();
    })
    .catch(err => console.error('Error creating project:', err));
}
function loadProjects() {
  fetch('/projects', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
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

function addTask() {
  if (!currentProjectId) {
    alert("Please select a project first.");
    return;
  }
  if (role !== 'admin') {
    alert("Only admins can create tasks.");
    return;
  }
  const title = document.getElementById('taskTitle').value.trim();
  const status = document.getElementById('taskStatus').value;
  const deadline = document.getElementById('taskDeadline').value;

  if (!title || !deadline) {
    alert("Please provide task title and deadline.");
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
      deadline
    }),
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to add task");
      return res.json();
    })
    .then(() => {
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskDeadline').value = '';
      document.getElementById('taskStatus').selectedIndex = 0;
      loadTasks();
    })
    .catch(err => console.error('Error adding task:', err));
}
function loadTasks() {
  if (!currentProjectId) return;

  fetch(`/tasks/${currentProjectId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(tasks => {
      const statuses = ['To-Do', 'In Progress', 'Done'];
      const board = document.getElementById('kanban');
      board.innerHTML = '';

      statuses.forEach(status => {
        const col = document.createElement('div');
        col.className = 'column';
        col.innerHTML = `<h3>${status}</h3>`;

        tasks.filter(t => t.status === status).forEach(t => {
          const dueDisplay = status === 'Done' ? '' : ` (Due: ${t.deadline})`;
          col.innerHTML += `<div>${t.title}${dueDisplay}</div>`;
        });

        board.appendChild(col);
      });

      if (typeof Gantt !== 'undefined' && tasks.length) {
        const ganttData = tasks.map(t => ({
          id: `${t.id}`,
          name: t.title,
          start: t.deadline,
          end: t.deadline,
          progress: 0,
          dependencies: ''
        }));
        document.getElementById('gantt').innerHTML = '';
        new Gantt("#gantt", ganttData);
      } else {
        document.getElementById('gantt').innerHTML = '<p>No tasks to show in Gantt chart</p>';
      }
    })
    .catch(err => console.error('Error loading tasks:', err));
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  ws.send(JSON.stringify({ type: 'chat', data: msg }));

  input.value = '';
}
document.getElementById('mainApp').style.display = 'none';
document.getElementById('adminControls').style.display = 'none';
document.getElementById('taskControls').style.display = 'none';
