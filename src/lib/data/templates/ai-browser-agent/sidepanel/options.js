console.log('[CHROMIE:options.js] Options page loaded');

// Model configurations
const MODELS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster, cheaper)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommended)' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Fast)' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most Capable)' }
  ],
  custom: [
    { value: 'llama3', label: 'Llama 3' },
    { value: 'llama3.1', label: 'Llama 3.1' },
    { value: 'mixtral', label: 'Mixtral' },
    { value: 'qwen2.5', label: 'Qwen 2.5' },
    { value: 'custom', label: 'Custom Model' }
  ]
};

// Default settings
const DEFAULT_SETTINGS = {
  apiProvider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: '',
  customEndpoint: '',
  maxSteps: 10,
  autoScroll: true,
  verboseLogging: false,
  timeout: 30,
  saveHistory: true
};

// DOM Elements
const apiProviderSelect = document.getElementById('api-provider');
const modelSelect = document.getElementById('model');
const apiKeyInput = document.getElementById('api-key');
const customEndpointInput = document.getElementById('custom-endpoint');
const customEndpointGroup = document.getElementById('custom-endpoint-group');
const toggleKeyBtn = document.getElementById('toggle-key-visibility');
const maxStepsInput = document.getElementById('max-steps');
const autoScrollCheckbox = document.getElementById('auto-scroll');
const verboseLoggingCheckbox = document.getElementById('verbose-logging');
const timeoutInput = document.getElementById('timeout');
const saveHistoryCheckbox = document.getElementById('save-history');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const statusMessage = document.getElementById('status-message');

// Initialize
async function init() {
  console.log('[CHROMIE:options.js] Initializing...');
  
  // Load saved settings
  const settings = await loadSettings();
  
  // Populate form
  populateForm(settings);
  
  // Setup event listeners
  setupEventListeners();
  
  console.log('[CHROMIE:options.js] Initialization complete');
}

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    return { ...DEFAULT_SETTINGS, ...result };
  } catch (error) {
    console.error('[CHROMIE:options.js] Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Populate form with settings
function populateForm(settings) {
  apiProviderSelect.value = settings.apiProvider;
  updateModelOptions(settings.apiProvider);
  modelSelect.value = settings.model;
  apiKeyInput.value = settings.apiKey;
  customEndpointInput.value = settings.customEndpoint || '';
  maxStepsInput.value = settings.maxSteps;
  autoScrollCheckbox.checked = settings.autoScroll;
  verboseLoggingCheckbox.checked = settings.verboseLogging;
  timeoutInput.value = settings.timeout;
  saveHistoryCheckbox.checked = settings.saveHistory;
}

// Update model options based on provider
function updateModelOptions(provider) {
  modelSelect.innerHTML = '';
  customEndpointGroup.style.display = (provider === 'custom') ? 'block' : 'none';
  
  const models = MODELS[provider] || MODELS.openai;
  
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    modelSelect.appendChild(option);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Provider change updates model options
  apiProviderSelect.addEventListener('change', (e) => {
    updateModelOptions(e.target.value);
  });
  
  // Toggle API key visibility
  toggleKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleKeyBtn.textContent = '🙈';
    } else {
      apiKeyInput.type = 'password';
      toggleKeyBtn.textContent = '👁️';
    }
  });
  
  // Save settings
  saveBtn.addEventListener('click', saveSettings);
  
  // Reset settings
  resetBtn.addEventListener('click', resetSettings);
  
  // Auto-save on input for some fields
  [maxStepsInput, timeoutInput].forEach(input => {
    input.addEventListener('blur', () => {
      validateNumericInput(input);
    });
  });
}

// Validate numeric input
function validateNumericInput(input) {
  const min = parseInt(input.getAttribute('min'));
  const max = parseInt(input.getAttribute('max'));
  let value = parseInt(input.value);
  
  if (isNaN(value)) {
    value = parseInt(input.defaultValue);
  }
  
  if (value < min) value = min;
  if (value > max) value = max;
  
  input.value = value;
}

// Save settings
async function saveSettings() {
  console.log('[CHROMIE:options.js] Saving settings...');
  
  // Validate inputs
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }
  
  // Validate numeric inputs
  validateNumericInput(maxStepsInput);
  validateNumericInput(timeoutInput);
  
  // Gather settings
  const settings = {
    apiProvider: apiProviderSelect.value,
    model: modelSelect.value,
    apiKey: apiKey,
    customEndpoint: customEndpointInput.value.trim(),
    maxSteps: parseInt(maxStepsInput.value),
    autoScroll: autoScrollCheckbox.checked,
    verboseLogging: verboseLoggingCheckbox.checked,
    timeout: parseInt(timeoutInput.value),
    saveHistory: saveHistoryCheckbox.checked
  };
  
  try {
    // Save to storage
    await chrome.storage.local.set(settings);
    
    console.log('[CHROMIE:options.js] Settings saved successfully');
    showStatus('✅ Settings saved successfully!', 'success');
    
    // Notify background script of settings change
    chrome.runtime.sendMessage({
      type: 'settings_updated',
      settings: settings
    }).catch(err => {
      console.log('[CHROMIE:options.js] Background not responding (normal):', err.message);
    });
    
  } catch (error) {
    console.error('[CHROMIE:options.js] Error saving settings:', error);
    showStatus('❌ Error saving settings. Please try again.', 'error');
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults? Your API key will be cleared.')) {
    return;
  }
  
  console.log('[CHROMIE:options.js] Resetting settings to defaults...');
  
  try {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
    populateForm(DEFAULT_SETTINGS);
    showStatus('✅ Settings reset to defaults', 'success');
  } catch (error) {
    console.error('[CHROMIE:options.js] Error resetting settings:', error);
    showStatus('❌ Error resetting settings', 'error');
  }
}

// Show status message
function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 5000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

console.log('[CHROMIE:options.js] Options script initialized');

