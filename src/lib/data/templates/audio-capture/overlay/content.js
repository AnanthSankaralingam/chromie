// Content script that injects the overlay UI onto web pages

// Create overlay container
const overlayContainer = document.createElement('div');
overlayContainer.id = 'audio-capture-overlay';
overlayContainer.innerHTML = `
  <div class="overlay-content">
    <div class="overlay-header">
      <h2>Audio Capture</h2>
      <button id="close-overlay" class="close-btn">×</button>
    </div>
    
    <button id="record-btn">Start Recording (4s)</button>
    
    <div id="status" class="status" style="display: none;"></div>
    
    <div id="player-section" style="display: none;">
      <p>Recorded Audio:</p>
      <audio id="audio-player" controls></audio>
    </div>
  </div>
`;

// Inject overlay into page
document.body.appendChild(overlayContainer);

// Get UI elements
const recordBtn = document.getElementById('record-btn');
const status = document.getElementById('status');
const playerSection = document.getElementById('player-section');
const audioPlayer = document.getElementById('audio-player');
const closeBtn = document.getElementById('close-overlay');

let isRecording = false;

// Show overlay
function showOverlay() {
  overlayContainer.classList.add('visible');
}

// Hide overlay
function hideOverlay() {
  overlayContainer.classList.remove('visible');
}

// Close button handler
closeBtn.addEventListener('click', () => {
  hideOverlay();
});

// Record button handler
recordBtn.addEventListener('click', () => {
  if (!isRecording) {
    startRecording();
  }
});

function startRecording() {
  hideStatus();
  playerSection.style.display = 'none';
  
  chrome.runtime.sendMessage({ type: 'start-capture' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Message error:', chrome.runtime.lastError);
    }
  });
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.style.display = 'block';
  status.style.color = isError ? '#f87171' : '#f1f5f9';
}

function hideStatus() {
  status.style.display = 'none';
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'capture-started') {
    isRecording = true;
    recordBtn.disabled = true;
    recordBtn.textContent = 'Recording...';
    showStatus('Recording 4 seconds of audio...');
    showOverlay(); // Ensure overlay is visible when recording starts
    
  } else if (message.type === 'capture-error') {
    isRecording = false;
    recordBtn.disabled = false;
    recordBtn.textContent = 'Start Recording (4s)';
    showStatus(message.error, true);
    showOverlay(); // Show overlay on error
    
  } else if (message.type === 'recording-complete') {
    isRecording = false;
    recordBtn.disabled = false;
    recordBtn.textContent = 'Start Recording (4s)';
    hideStatus();
    
    // Display the recorded audio
    audioPlayer.src = message.data;
    playerSection.style.display = 'block';
    showOverlay(); // Ensure overlay is visible when recording completes
  }
  
  return true;
});

// Listen for extension icon click to toggle overlay
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'toggle-overlay') {
    if (overlayContainer.classList.contains('visible')) {
      hideOverlay();
    } else {
      showOverlay();
    }
    sendResponse({ toggled: true });
  }
  return true;
});
