// DOM elements
// DOM elements
const micBtn = document.getElementById('chatMicBtn'); // changed from micBtn to chatMicBtn
const inputBox = document.getElementById('chatInput'); // this already matches
const form = document.getElementById('chatForm');
const directionsContainer = document.getElementById('directions');
const mapContainer = document.getElementById('map');
const statusDiv = document.getElementById('status');


// Voice recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
const synth = window.speechSynthesis;

let isListening = false;
let map, directionsRenderer;

if (recognition) {
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
}

// Speak a string aloud
function speakTextAsync(text) {
    return new Promise((resolve, reject) => {
        if (synth.speaking) synth.cancel();

        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.9;
        utter.pitch = 1;
        utter.volume = 1;

        utter.onend = () => resolve();
        utter.onerror = (e) => {
            console.error("Speech error:", e);
            resolve(); // resolve anyway to continue loop
        };

        synth.speak(utter);
    });
}


// Get user's current location
async function getLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            err => reject('Unable to fetch location.')
        );
    });
}

// Render directions step by step
async function renderDirections(steps, destination) {
    directionsContainer.innerHTML = '';
    directionsContainer.innerHTML =  `Alright, Let\'s go to: ${destination}`;
    if (!steps || !Array.isArray(steps)) {
        console.error("Invalid steps:", steps);
        directionsContainer.textContent = '⚠️ No directions available.';
        return;
    }

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        // Safely clean HTML from instruction
        const html = step.instruction || 'Continue';
        const div = document.createElement('div');
        div.innerHTML = html;
        const plain = div.textContent || div.innerText || html;

        const distance = typeof step.distance === 'number' ? `${step.distance.toFixed(0)}m` : '';
        const duration = typeof step.duration === 'number' ? `${Math.round(step.duration)}s` : '';

        const details = [plain];
        if (distance || duration) {
            details.push(`(${[distance, duration].filter(Boolean).join(', ')})`);
        }

        // Display the message
        const para = document.createElement('p');
        para.textContent = `${i + 1}. ${details.join(' ')}`;
        directionsContainer.appendChild(para);
        directionsContainer.scrollTop = directionsContainer.scrollHeight;

        // Speak it out
        await speakTextAsync(plain);
    }
}


// Main handler (text or voice input)
async function processInput(query) {
    if (!query) return;

    inputBox.value = '';
    statusDiv.textContent = 'Processing...';

    try {
        const location = await getLocation();

        const res = await fetch('/chappal/directions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: query, location })
        });

        const data = await res.json();
        if (!data.steps || !data.route) {
            directionsContainer.innerHTML = 'Destination not understood.';
            return;
        }
        directionsContainer.innerHTML = `Alright, Let\'s go to: ${data.destName}`;

        renderDirections(data.steps, data.destName);

        // ⬇️ Leaflet map rendering
        const geometry = data.route.features[0].geometry.coordinates;
        const originCoords = geometry[0];
        const path = geometry.map(([lng, lat]) => [lat, lng]);

        if (map) {
            map.remove();
        }

        map = L.map('map').setView([originCoords[1], originCoords[0]], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        L.polyline(path, { color: 'blue' }).addTo(map);
        L.marker(path[0]).addTo(map).bindPopup('You are here').openPopup();
        L.marker(path[path.length - 1]).addTo(map).bindPopup('Destination');
    } catch (err) {
        console.error('Error:', err);
        directionsContainer.innerHTML = 'Failed to fetch directions.';
    } finally {
        statusDiv.textContent = '';
    }
}


// Voice input
function startVoiceInput() {
    if (!recognition) {
        alert("Speech recognition not supported.");
        return;
    }
    if (isListening) return;
    isListening = true;
    micBtn.classList.add('recording');
    recognition.start();
    statusDiv.textContent = '🎤 Listening...';
}

function stopVoiceInput() {
    isListening = false;
    micBtn.classList.remove('recording');
    recognition.stop();
    statusDiv.textContent = '';
}

if (recognition) {
    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
        inputBox.value = transcript;
    };

    recognition.onend = () => {
        stopVoiceInput();
        if (inputBox.value.trim()) {
            processInput(inputBox.value.trim());
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopVoiceInput();
    };
}

// Events
micBtn.addEventListener('click', () => {
    if (!isListening) {
        startVoiceInput();
    } else {
        stopVoiceInput();
    }
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = inputBox.value.trim();
    if (message) {
        processInput(message);
    }
});
