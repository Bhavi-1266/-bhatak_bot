# भटकBot (BhatakBot)

**भटकBot** is a multilingual voice-activated travel assistant that helps users navigate, get checklists, and interact conversationally in multiple Indian languages. It supports real-time maps, AI-generated packing lists, and other necessary features.

---

## Features

### Chappal Mode (Direction Assistant)
- Users can say or type queries like _"Take me to Delhi Airport"_.
- It uses **Wit.ai** to extract intent and location entities.
- Origin is auto-detected using browser GPS; destination is resolved via **LocationIQ**, which can also handle typing errors and fuzzy searching.
- Uses **OpenRouteService** to get walking directions.
- Route is displayed using **Leaflet + OpenStreetMap**, including step-by-step voice narration.

### Checklist Chacha (Smart Checklist Generator)
- On the `/checklists` page, users can:
  - View all their checklists
  - Create a new one by specifying a purpose (e.g., _"Things to pack for a trek"_).
  - Check/uncheck items with real-time updates.
  - Backend uses **OpenRouter API** to generate relevant checklist items using `mistralai/mistral-7b-instruct`.

### Voice + Chat Interface (Aaji Mode)
- Users can interact using voice via **Web Speech API**.
- "Aaji Mode" slows down the speech and simplifies responses when toggled.
- Input is transcribed and displayed live as the user speaks.
- Detects and speaks in multiple Indian languages (Hindi, Marathi, Bengali, etc.).  

### TravelLine (Calling Service)
- Users can access few of our services via calling, increasing accessibility on the go
- Use of **Telegram** to route user calls
- Offline calling feature coming soon
  
### Call a Cab
- Asks you for a preference of cab type
- Detects your location via browser GPS
- Redirects you to **Ola** with location & cab type pre-filled
> Using Ola deep links


---

## Tech Stack

### Frontend
- **EJS** templating
- **Vanilla JS** (no framework)
- **Leaflet.js** + OpenStreetMap for maps
- Web Speech API for speech-to-text and text-to-speech

### Backend
- **Node.js + Express.js**
- **Firebase Admin SDK** (for Firestore + Auth)
- **Wit.ai** (intent + entity extraction)
- **OpenRouteService API** (route generation)
- **LocationIQ API** (fuzzy geocoding)
- **OpenRouter AI API** (checklist generation via mistral-7b)

---

## 🔗 APIs Used

| API               | Purpose                               |
|------------------|----------------------------------------|
| [Wit.ai](https://wit.ai)               | Intent + location extraction             |
| [OpenRouteService](https://openrouteservice.org/)   | Route directions + geometry             |
| [LocationIQ](https://locationiq.com/)            | Fuzzy destination geocoding             |
| [OpenRouter.ai](https://openrouter.ai)           | Chatbot and checklist generation        |
| [Firebase](https://firebase.google.com)           | Auth + Firestore database               |

---

## ⚙️ Setup & Run Locally

1. **Clone the repo:**
```bash
git clone https://github.com/Bhavi-1266/-bhatak_bot.git
cd -bhatak_bot
```
2. **Install Dependencies**  
```bash
npm install
```  
3. **Setup Environment Variables: .env**  
```bash
WIT_AI_SERVER_TOKEN=your_wit_token
ORS_API_KEY=your_openrouteservice_key
LOCATIONIQ_API_KEY=your_locationiq_key
OPENROUTER_API_KEY=your_openrouter_key
GOOGLE_APPLICATION_CREDENTIALS=path_to_your_firebase_adminsdk.json
```
4. **Start App**  
```bash
npm run app
```
