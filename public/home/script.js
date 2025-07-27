
const micBtn = document.getElementById('micBtn');
const micContainer = document.getElementById('micContainer');
const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');
const sendBtn = document.getElementById('sendBtn');
const voiceIndicator = document.getElementById('voiceIndicator');
const chatMicBtn = document.getElementById('chatMicBtn');
const aajiBtn = document.getElementById('aajiBtn');

const synth = window.speechSynthesis;
let aajiMode = false;
const defaultRate = 1.0;
const aajiRate = 0.5;
let currentRate = defaultRate;
let lastAIMessage = "";
let userLang = "English";

let preferredFemaleVoice = null;
let languageVoiceMap = {};
function loadVoices() {
  const voices = synth.getVoices();
  function findFemaleVoice(langCode, fallbackName = '') {
    return (
      voices.find(v => v.lang === langCode && /female|woman/i.test(v.name)) ||
      voices.find(v => v.lang === langCode && v.name.includes(fallbackName)) ||
      voices.find(v => v.lang === langCode)
    );
  }

  preferredFemaleVoice = 
    findFemaleVoice('en-US', 'Google UK English Female') ||
    voices.find(v => v.name.includes('English (India)')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0];

  languageVoiceMap = {
    'English': findFemaleVoice('en-US', 'Google UK English Female'),
    'Hindi': findFemaleVoice('hi-IN'),
    'Marathi': findFemaleVoice('mr-IN'),
    'Gujarati': findFemaleVoice('gu-IN'),
    'Bengali': findFemaleVoice('bn-IN'),
    'Punjabi': findFemaleVoice('pa-IN'),
    'Tamil': findFemaleVoice('ta-IN'),
    'Telugu': findFemaleVoice('te-IN'),
    'Kannada': findFemaleVoice('kn-IN'),
    'Urdu': findFemaleVoice('ur-IN'),
  };
}

// ✅ Move these outside the function
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices();


aajiBtn.addEventListener('click', () => {
  aajiMode = !aajiMode;
  currentRate = aajiMode ? aajiRate : defaultRate;
  aajiBtn.textContent = aajiMode ? "Aaji Mode: ON" : "Aaji Mode";
  aajiBtn.style.opacity = aajiMode ? '1' : '0.8';
  if (synth.speaking && lastAIMessage) {
    synth.cancel();
    setTimeout(() => speakText(lastAIMessage), 300);
  }
});

function stripEmojis(text) {
  return text.replace(/[\p{Emoji}\uFE0F]/gu, '').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
}

function speakText(text) {
  lastAIMessage = text;
  return new Promise((resolve) => {
    if (synth.speaking) synth.cancel();
    const cleanText = stripEmojis(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = currentRate;
    utterance.pitch = aajiMode ? 1.4 : 1;
    utterance.volume = 0.8;
    utterance.voice = languageVoiceMap[userLang] || preferredFemaleVoice;

    utterance.onend = resolve;
    utterance.onerror = resolve;
    console.log(`Speaking [${userLang}] with voice:`, utterance.voice?.name);
    synth.speak(utterance);
  });
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;
}

let isListening = false;
let isProcessing = false;

function initChat() {
  micContainer.style.display = 'none';
  chatBox.style.display = 'flex';
  chatInput.focus();
}

function addMessage(content, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
  messageDiv.innerHTML = isUser ? content : marked.parse(content);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function startVoiceInput() {
  if (!recognition) return;
  isListening = true;
  micBtn.classList.add('recording');
  chatMicBtn.classList.add('recording');
  voiceIndicator.classList.add('active');
  recognition.start();
}

function stopVoiceInput() {
  isListening = false;
  micBtn.classList.remove('recording');
  chatMicBtn.classList.remove('recording');
  voiceIndicator.classList.remove('active');
  recognition.stop();
}

micBtn.addEventListener('click', () => {
  if (!isListening) {
    initChat();
    startVoiceInput();
  } else {
    stopVoiceInput();
  }
});
chatMicBtn.addEventListener('click', () => {
  if (!isListening) {
    startVoiceInput();
  } else {
    stopVoiceInput();
  }
});

if (recognition) {
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
    chatInput.value = transcript;
  };
  recognition.onend = () => {
    if (chatInput.value.trim()) handleSubmit();
    stopVoiceInput();
  };
  recognition.onerror = (event) => {
    addMessage(`Speech recognition error: ${event.error}`, false);
    stopVoiceInput();
  };
}

let OPENROUTER_API_KEY = null;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MISTRAL_MODEL = "mistralai/mistral-7b-instruct";
sendBtn.disabled = true;

async function initializeAPI() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    OPENROUTER_API_KEY = config.openrouterApiKey;
    if (OPENROUTER_API_KEY) sendBtn.disabled = false;
  } catch (err) {
    addMessage("Failed to load API key. Chat will not work.", false);
  }
}
initializeAPI();
async function handleSubmit() {
  const message = chatInput.value.trim();
  if (!message || isProcessing) return;



  isProcessing = true;
  sendBtn.disabled = true;
  chatMicBtn.disabled = true;
  addMessage(message, true);
  chatInput.value = '';

  try {
    const langCode = franc.min(message);
    const langMap = {
      'eng': 'English', 'hin': 'Hindi', 'mar': 'Marathi', 'guj': 'Gujarati',
      'ben': 'Bengali', 'pan': 'Punjabi', 'kan': 'Kannada', 'tam': 'Tamil',
      'tel': 'Telugu', 'urd': 'Urdu'
    };
    userLang = langMap[langCode] || 'English';

  } catch {
    userLang = "English";
  }
  try {
    if (!OPENROUTER_API_KEY) throw new Error("API key not loaded");

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "BhatakBot"
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: "system",
            content: `You are भटकBot, a fun and helpful travel assistant. The user is speaking in ${userLang}. Respond in that same language. Do not translate English queries into Hindi unless explicitly asked. Be concise and casual.`

          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.8,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API failed: ${response.statusText}`);
    }

    const result = await response.json();
    const aiResponse = result.choices?.[0]?.message?.content || "Hmm, no reply from the bot.";
    addMessage(aiResponse, false);
    // Step 2: Detect bot reply language for correct voice
    try {
      const langCode = franc.min(aiResponse);
      const langMap = {
        'eng': 'English', 'hin': 'Hindi', 'mar': 'Marathi', 'guj': 'Gujarati',
        'ben': 'Bengali', 'pan': 'Punjabi', 'kan': 'Kannada', 'tam': 'Tamil',
        'tel': 'Telugu', 'urd': 'Urdu'
      };
      userLang = langMap[langCode] || 'English';
    } catch {
      userLang = 'English';
    }
    speakText(aiResponse);

  } catch (error) {
    addMessage("Sorry, something went wrong. Please try again.", false);
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    chatMicBtn.disabled = false;
  }
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  handleSubmit();
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
});

const pauseBtn = document.getElementById('pauseBtn');
pauseBtn.addEventListener('click', () => {
  if (synth.speaking) synth.cancel();
});
