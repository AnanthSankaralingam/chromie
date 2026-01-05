const recordBtn = document.getElementById('record-btn');
const status = document.getElementById('status');
const playerSection = document.getElementById('player-section');
const audioPlayer = document.getElementById('audio-player');

let isRecording = false;

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
    
  } else if (message.type === 'capture-error') {
    isRecording = false;
    recordBtn.disabled = false;
    recordBtn.textContent = 'Start Recording (4s)';
    showStatus(message.error, true);
    
  } else if (message.type === 'recording-complete') {
    isRecording = false;
    recordBtn.disabled = false;
    recordBtn.textContent = 'Start Recording (4s)';
    hideStatus();
    
    // Display the recorded audio
    audioPlayer.src = message.data;
    playerSection.style.display = 'block';
  }
});