console.log('[CHROMIE:sidepanel.js] Side panel loaded');

// State management
let currentSessionId = null;
let isExecuting = false;
let port = null;

// DOM Elements
const messagesContainer = document.getElementById('messages-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const historyBtn = document.getElementById('history-btn');
const settingsBtn = document.getElementById('settings-btn');
const openSettingsBtn = document.getElementById('open-settings-btn');
const historySidebar = document.getElementById('history-sidebar');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyList = document.getElementById('history-list');
const configWarning = document.getElementById('config-warning');

// Initialize connection to background
function initConnection() {
  port = chrome.runtime.connect({ name: 'side-panel-connection' });
  
  port.onMessage.addListener((message) => {
    console.log('[CHROMIE:sidepanel.js] Received message:', message.type);
    handleBackgroundMessage(message);
  });

  port.onDisconnect.addListener(() => {
    console.log('[CHROMIE:sidepanel.js] Port disconnected');
    port = null;
    setTimeout(initConnection, 1000); // Reconnect after 1 second
  });

  // Send heartbeat every 20 seconds
  setInterval(() => {
    if (port) {
      port.postMessage({ type: 'heartbeat' });
    }
  }, 20000);
}

// Handle messages from background
function handleBackgroundMessage(message) {
  switch (message.type) {
    case 'agent_event':
      handleAgentEvent(message.event);
      break;
    case 'task_complete':
      handleTaskComplete(message);
      break;
    case 'task_error':
      handleTaskError(message.error);
      break;
    case 'heartbeat_ack':
      // Heartbeat acknowledged
      break;
    default:
      console.log('[CHROMIE:sidepanel.js] Unknown message type:', message.type);
  }
}

// Handle agent events
function handleAgentEvent(event) {
  if (event.type === 'thought') {
    addSystemMessage(event.content);
  } else if (event.type === 'action') {
    addSystemMessage(`🤖 Action: ${event.action} - ${event.content}`);
  } else if (event.type === 'result') {
    addSystemMessage(`✅ ${event.content}`);
  }
}

// Handle task completion
function handleTaskComplete(data) {
  isExecuting = false;
  updateUIState();
  if (data.result) {
    addAssistantMessage(data.result);
  } else {
    addAssistantMessage('Task completed successfully!');
  }
}

// Handle task error
function handleTaskError(error) {
  isExecuting = false;
  updateUIState();
  addSystemMessage(`❌ Error: ${error}`);
}

// Add message to chat
function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;
  
  messageDiv.appendChild(label);
  messageDiv.appendChild(contentDiv);
  
  // Remove welcome message if it exists
  const welcomeMsg = messagesContainer.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addUserMessage(content) {
  addMessage('user', content);
}

function addAssistantMessage(content) {
  addMessage('assistant', content);
}

function addSystemMessage(content) {
  addMessage('system', content);
}

// Show thinking indicator
function showThinking() {
  const thinkingDiv = document.createElement('div');
  thinkingDiv.id = 'thinking-indicator';
  thinkingDiv.className = 'message assistant';
  thinkingDiv.innerHTML = `
    <div class="message-label">Assistant</div>
    <div class="message-content">
      <div class="thinking-indicator">
        <div class="thinking-dot"></div>
        <div class="thinking-dot"></div>
        <div class="thinking-dot"></div>
      </div>
    </div>
  `;
  
  const welcomeMsg = messagesContainer.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
  
  messagesContainer.appendChild(thinkingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideThinking() {
  const thinkingIndicator = document.getElementById('thinking-indicator');
  if (thinkingIndicator) {
    thinkingIndicator.remove();
  }
}

// Send task to background
async function sendTask() {
  const task = userInput.value.trim();
  if (!task || isExecuting) return;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    addSystemMessage('❌ No active tab found');
    return;
  }

  addUserMessage(task);
  showThinking();
  userInput.value = '';
  isExecuting = true;
  updateUIState();

  // Generate session ID if needed
  if (!currentSessionId) {
    currentSessionId = `session_${Date.now()}`;
  }

  // Send to background
  port.postMessage({
    type: 'new_task',
    task: task,
    tabId: tab.id,
    sessionId: currentSessionId
  });

  // Save to history
  saveToHistory(task);
}

// Stop execution
function stopTask() {
  if (port) {
    port.postMessage({ type: 'stop_task' });
  }
  hideThinking();
  isExecuting = false;
  updateUIState();
  addSystemMessage('⏹️ Task stopped');
}

// Update UI state based on execution status
function updateUIState() {
  if (isExecuting) {
    sendBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    userInput.disabled = true;
  } else {
    sendBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    userInput.disabled = false;
  }
}

// Check API key configuration
async function checkConfiguration() {
  const result = await chrome.storage.local.get(['apiKey', 'apiProvider']);
  if (!result.apiKey) {
    configWarning.style.display = 'block';
    return false;
  }
  configWarning.style.display = 'none';
  return true;
}

// Save to history
async function saveToHistory(task) {
  const history = await chrome.storage.local.get('chatHistory') || { chatHistory: [] };
  const historyArray = history.chatHistory || [];
  
  historyArray.unshift({
    id: currentSessionId,
    title: task.slice(0, 50) + (task.length > 50 ? '...' : ''),
    timestamp: Date.now()
  });
  
  // Keep only last 50 items
  if (historyArray.length > 50) {
    historyArray.pop();
  }
  
  await chrome.storage.local.set({ chatHistory: historyArray });
}

// Load history
async function loadHistory() {
  const result = await chrome.storage.local.get('chatHistory');
  const historyArray = result.chatHistory || [];
  
  historyList.innerHTML = '';
  
  if (historyArray.length === 0) {
    historyList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No history yet</p>';
    return;
  }
  
  historyArray.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'history-item';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'history-item-title';
    titleDiv.textContent = item.title;
    
    const dateDiv = document.createElement('div');
    dateDiv.className = 'history-item-date';
    const date = new Date(item.timestamp);
    dateDiv.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    itemDiv.appendChild(titleDiv);
    itemDiv.appendChild(dateDiv);
    
    itemDiv.addEventListener('click', () => {
      // Load this session (not implemented in this template)
      console.log('[CHROMIE:sidepanel.js] Load session:', item.id);
    });
    
    historyList.appendChild(itemDiv);
  });
}

// Event listeners
sendBtn.addEventListener('click', sendTask);
stopBtn.addEventListener('click', stopTask);

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendTask();
  }
});

// Auto-resize textarea
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

openSettingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

historyBtn.addEventListener('click', () => {
  historySidebar.style.display = 'flex';
  loadHistory();
});

closeHistoryBtn.addEventListener('click', () => {
  historySidebar.style.display = 'none';
});

// Example prompt buttons
document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    userInput.value = btn.textContent.replace(/"/g, '');
    userInput.focus();
  });
});

// Initialize
(async function init() {
  console.log('[CHROMIE:sidepanel.js] Initializing...');
  await checkConfiguration();
  initConnection();
  
  // Check configuration periodically
  setInterval(checkConfiguration, 5000);
})();

