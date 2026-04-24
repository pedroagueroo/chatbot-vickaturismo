let token = localStorage.getItem('vicka_token');
let currentChatId = null;

if (token) {
  showDashboard();
  loadChats();
  setInterval(loadChats, 5000); // Refrescar chats cada 5 seg
}

function showDashboard() {
  document.getElementById('loginScreen').classList.remove('active');
  document.getElementById('dashboardScreen').classList.add('active');
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    const res = await fetch('/admin/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password})
    });
    if (res.ok) {
      const data = await res.json();
      token = data.token;
      localStorage.setItem('vicka_token', token);
      showDashboard();
      loadChats();
    } else {
      document.getElementById('loginError').innerText = 'Credenciales inválidas';
    }
  } catch (e) {
    document.getElementById('loginError').innerText = 'Error de conexión';
  }
}

function logout() {
  localStorage.removeItem('vicka_token');
  location.reload();
}

async function fetchAPI(url, options = {}) {
  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) logout();
  return res.json();
}

async function loadChats() {
  const chats = await fetchAPI('/admin/conversations');
  const chatList = document.getElementById('chatList');
  chatList.innerHTML = '';
  
  chats.forEach(chat => {
    const div = document.createElement('div');
    div.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
    div.innerHTML = `
      <div class="name">${chat.user_name || 'Desconocido'} (${chat.platform})</div>
      <div class="status ${chat.status}">${chat.status}</div>
    `;
    div.onclick = () => selectChat(chat);
    chatList.appendChild(div);
  });
}

let activeChatObj = null;

async function selectChat(chat) {
  currentChatId = chat.id;
  activeChatObj = chat;
  document.getElementById('chatHeader').innerText = `${chat.user_name} - ${chat.platform_user_id}`;
  document.getElementById('agentNotes').value = chat.agent_notes || '';
  document.getElementById('chatStatus').value = chat.status;
  
  // Refrescar mensajes
  loadMessages();
  // Limpiar chats activos visualmente
  loadChats();
}

async function loadMessages() {
  if (!currentChatId) return;
  const msgs = await fetchAPI(`/admin/conversations/${currentChatId}/messages`);
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '';
  
  msgs.forEach(msg => {
    const div = document.createElement('div');
    div.className = `msg ${msg.role}`;
    div.innerText = msg.content;
    chatMessages.appendChild(div);
  });
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function saveNotes() {
  if (!currentChatId) return alert('Selecciona un chat');
  const notes = document.getElementById('agentNotes').value;
  await fetchAPI(`/admin/conversations/${currentChatId}/notes`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({notes})
  });
  alert('Notas guardadas. Claude las leerá en el próximo mensaje.');
}

async function updateStatus() {
  if (!currentChatId) return alert('Selecciona un chat');
  const status = document.getElementById('chatStatus').value;
  await fetchAPI(`/admin/conversations/${currentChatId}/status`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({status})
  });
  alert(`Estado cambiado a: ${status}`);
  loadChats();
}

// Auto refrescar mensajes si hay chat abierto
setInterval(() => {
  if (currentChatId) loadMessages();
}, 5000);
