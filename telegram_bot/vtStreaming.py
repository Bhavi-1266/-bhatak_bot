import sounddevice as sd
import numpy as np
import whisper
import requests
import time
import subprocess
import tempfile
import os
import threading

# Ultra-fast Configuration
SAMPLE_RATE = 16000
MAX_RECORD_SECONDS = 5  # Shorter to avoid long waits
SILENCE_THRESHOLD = 0.008  # More sensitive to actual speech
SILENCE_DURATION = 1.2  # Longer pause before stopping

# Multiple fast APIs for redundancy
APIS = [
    {
        "name": "Groq",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "key": "gsk_demo_key",  # Replace with your Groq key for best speed
        "model": "llama3-8b-8192",
        "timeout": 3
    },
    {
        "name": "OpenRouter-Phi3",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "key": "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",
        "model": "microsoft/phi-3-mini-128k-instruct:free",
        "timeout": 
    },
    {
        "name": "OpenRouter-Gemma",
        "url": "https://openrouter.ai/api/v1/chat/completions", 
        "key": "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",
        "model": "google/gemma-2-9b-it:free",
        "timeout": 5
    }
]

def speak_fast_powershell(text):
    """Optimized PowerShell TTS - non-blocking"""
    if not text or not text.strip():
        return
        
    def tts_worker():
        try:
            clean_text = str(text).strip().replace('\n', ' ').replace('"', '').replace("'", '')
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
                f.write(clean_text)
                temp_file = f.name
            
            # Optimized PowerShell command
            powershell_cmd = f'''
            Add-Type -AssemblyName System.Speech
            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
            $synth.Rate = 3
            $synth.Volume = 100
            $synth.SetOutputToDefaultAudioDevice()
            $text = Get-Content -Path "{temp_file}" -Raw
            $synth.Speak($text)
            $synth.Dispose()
            '''
            
            # Run with proper flags for Windows
            result = subprocess.run(
                ['powershell', '-ExecutionPolicy', 'Bypass', '-Command', powershell_cmd], 
                timeout=8, 
                creationflags=subprocess.CREATE_NO_WINDOW,
                capture_output=True,
                text=True
            )
            
            os.unlink(temp_file)
            
        except Exception as e:
            print(f"TTS Error: {e}")
    
    # Run TTS in background thread
    threading.Thread(target=tts_worker, daemon=True).start()

def get_fastest_ai_response(user_message):
    """Try multiple APIs simultaneously for fastest response"""
    if not user_message.strip():
        return "I didn't catch that."
    
    def try_api(api_config, result_container):
        """Try a single API"""
        try:
            headers = {
                "Authorization": f"Bearer {api_config['key']}", 
                "Content-Type": "application/json"
            }
            
            # Optimized payload for speed
            data = {
                "model": api_config['model'],
                "messages": [
                    {"role": "system", "content": "Be brief and helpful. Max 2 sentences."},
                    {"role": "user", "content": user_message}
                ],
                "max_tokens": 40,  # Very short for speed
                "temperature": 0.1,  # Low for faster generation
                "top_p": 0.9
            }
            
            response = requests.post(
                api_config['url'], 
                headers=headers, 
                json=data, 
                timeout=api_config['timeout']
            )
            
            if response.status_code == 200:
                content = response.json()['choices'][0]['message']['content'].strip()
                if content and len(content) > 5:  # Valid response
                    result_container[0] = content
                    result_container[1] = api_config['name']
                    
        except Exception as e:
            print(f"API {api_config['name']} failed: {e}")
    
    # Try APIs in parallel
    result_container = [None, None]  # [response, api_name]
    threads = []
    
    for api in APIS:
        thread = threading.Thread(target=try_api, args=(api, result_container))
        thread.daemon = True
        thread.start()
        threads.append(thread)
    
    # Wait for first successful response (max 6 seconds total)
    start_time = time.time()
    while result_container[0] is None and time.time() - start_time < 6:
        time.sleep(0.1)
        
        # Clean up finished threads
        threads = [t for t in threads if t.is_alive()]
        if not threads:  # All threads finished
            break
    
    if result_container[0]:
        print(f"[{result_container[1]}]", end=" ")
        return result_container[0]
    else:
        return "I'm having trouble connecting right now."

def record_quick(device_id):
    """Optimized recording with better speech detection"""
    chunks = []
    silence_count = 0
    speech_detected = False
    chunk_size = int(0.1 * SAMPLE_RATE)
    max_chunks = int(MAX_RECORD_SECONDS / 0.1)
    silence_needed = int(SILENCE_DURATION / 0.1)
    
    for i in range(max_chunks):
        chunk = sd.rec(chunk_size, samplerate=SAMPLE_RATE, channels=1, dtype='float32', device=device_id)
        sd.wait()
        chunks.append(chunk.flatten())
        
        # Calculate volume
        volume = np.sqrt(np.mean(chunk**2))
        
        # Check for speech
        if volume > SILENCE_THRESHOLD:
            speech_detected = True
            silence_count = 0
            print("🔊", end="", flush=True)  # Show speech detected
        else:
            if speech_detected:  # Only count silence after we've detected speech
                silence_count += 1
                print(".", end="", flush=True)
            else:
                print("_", end="", flush=True)  # Waiting for speech
        
        # Stop only after we've detected speech AND then silence
        if speech_detected and silence_count >= silence_needed:
            print(f" ({(i+1)*0.1:.1f}s)", end="")
            break
    
    # Only return audio if we detected actual speech
    if speech_detected:
        return np.concatenate(chunks)
    else:
        return np.array([])  # Return empty array if no speech

def main():
    try:
        # Audio setup
        input_id = None
        try:
            devices = sd.query_devices()
            for i, dev in enumerate(devices):
                if "CABLE Output" in dev['name'] and dev['max_input_channels'] > 0:
                    input_id = i
                    print(f"✅ Using: {dev['name']}")
                    break
        except:
            print("⚠️ Using default microphone")
        
        print("Loading Whisper...")
        # Use tiny model for maximum speed
        model = whisper.load_model("tiny", device="cpu")
        
        print("🚀 FAST AI Ready! Target: <3 seconds response")
        print("=" * 50)
        
        while True:
            print("🎙️ ", end="", flush=True)
            
            # Start timing
            total_start = time.time()
            
            # Record audio
            audio = record_quick(input_id)
            record_time = time.time() - total_start
            
            # Skip processing if no speech detected
            if len(audio) == 0:
                print(" (no speech)")
                continue
            
            if np.max(np.abs(audio)) > 0:
                audio = audio / np.max(np.abs(audio))
            else:
                print(" (silent)")
                continue
            
            # Transcribe
            transcribe_start = time.time()
            try:
                result = model.transcribe(
                    audio, 
                    fp16=False, 
                    language='en',
                    condition_on_previous_text=False,
                    no_speech_threshold=0.6,
                    logprob_threshold=-1.0,
                    compression_ratio_threshold=2.4
                )
                
                user_text = result['text'].strip()
                transcribe_time = time.time() - transcribe_start
                
                if len(user_text) > 2:
                    print(f"\n👤 You: {user_text}")
                    print(f"⏱️ Record: {record_time:.1f}s | Transcribe: {transcribe_time:.1f}s", end=" | ")
                    
                    # Get AI response
                    ai_start = time.time()
                    ai_response = get_fastest_ai_response(user_text)
                    ai_time = time.time() - ai_start
                    
                    total_time = time.time() - total_start
                    
                    print(f"AI: {ai_time:.1f}s | Total: {total_time:.1f}s")
                    print(f"🤖 AI: {ai_response}")
                    
                    # Speak (non-blocking)
                    speak_fast_powershell(ai_response)
                    
                    # Status indicator
                    if total_time < 3:
                        print("✅ FAST!")
                    elif total_time < 5:
                        print("⚡ Good")
                    else:
                        print("🐌 Slow")
                    
                    print("-" * 50)
                else:
                    print(".", end="", flush=True)
                    
            except Exception as e:
                print(f"\nTranscription error: {e}")
            
    except KeyboardInterrupt:
        print("\n🛑 Stopped.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()