let mediaRecorder = null;
let recordedChunks = [];
let mediaStream = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'start-recording') {
    startRecording(message.streamId);
    sendResponse({ received: true });
  } else if (message.type === 'stop-recording') {
    stopRecording();
    sendResponse({ received: true });
  }
  return true; // Keep message channel open
});

async function startRecording(streamId) {
  try {
    // Get media stream from tab
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });

    // Create MediaRecorder
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      // Create blob from recorded chunks and convert to WAV
      const webmBlob = new Blob(recordedChunks, { type: 'audio/webm' });
      const wavBlob = await convertToWav(webmBlob);
      
      // Convert to data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        chrome.runtime.sendMessage({
          type: 'recording-complete',
          data: reader.result
        });
      };
      reader.readAsDataURL(wavBlob);

      // Stop all tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };

    mediaRecorder.start();
  } catch (error) {
    console.error('CHROMIE: Recording error:', error);
    chrome.runtime.sendMessage({
      type: 'capture-error',
      error: 'Failed to access media stream'
    });
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

// Convert WebM to WAV
async function convertToWav(webmBlob) {
  const audioContext = new AudioContext();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const wav = audioBufferToWav(audioBuffer);
  return new Blob([wav], { type: 'audio/wav' });
}

// Convert AudioBuffer to WAV format
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  // Interleave channels
  const interleaved = new Float32Array(buffer.length * numChannels);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < buffer.length; i++) {
      interleaved[i * numChannels + ch] = channelData[i];
    }
  }
  
  // Create WAV file
  const wavBuffer = new ArrayBuffer(44 + interleaved.length * bytesPerSample);
  const view = new DataView(wavBuffer);
  
  // Write WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + interleaved.length * bytesPerSample, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, interleaved.length * bytesPerSample, true);
  
  // Write audio data
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, int16, true);
    offset += 2;
  }
  
  return wavBuffer;
}
