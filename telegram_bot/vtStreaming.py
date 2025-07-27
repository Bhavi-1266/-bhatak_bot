import sounddevice as sd
import numpy as np
import whisper
import requests
import os
import time
import tempfile
import subprocess
import threading

# Audio Configuration
SAMPLE_RATE = 16000
MAX_RECORD_SECONDS = 15
SILENCE_THRESHOLD = 0.01  # Adjust this value - lower = more sensitive to silence
SILENCE_DURATION = 2.0    # Stop recording after 2 seconds of silence
INTERRUPT_THRESHOLD = 0.02  # Volume threshold to interrupt AI speech

# Global variables for speech interruption
speech_process = None
should_stop_speech = False
interrupt_lock = threading.Lock()

# OpenRouter API Configuration
OPENROUTER_API_KEY ="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"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

def speak_windows_sapi(text):
    """Use Windows SAPI to generate speech with female voice"""
    # Clean the text and properly escape for PowerShell
    clean_text = str(text).strip().replace('\n', ' ')
    # Remove problematic characters and escape quotes properly
    clean_text = clean_text.replace('"', '').replace("'", "").replace('`', '')
    print(f"[DEBUG] AI Speaking: {clean_text!r}")
    
    try:
        # Use a different approach - save text to temp file to avoid quote issues
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write(clean_text)
            temp_file = f.name
        
        powershell_cmd = f'''
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        
        # Try to find a female voice
        $voices = $synth.GetInstalledVoices()
        $femaleVoice = $null
        
        # Look for common female voice names
        foreach ($voice in $voices) {{
            $voiceName = $voice.VoiceInfo.Name
            if ($voiceName -like "*Zira*" -or $voiceName -like "*Hazel*" -or $voiceName -like "*Susan*" -or 
                $voiceName -like "*Female*" -or $voice.VoiceInfo.Gender -eq "Female") {{
                $femaleVoice = $voice.VoiceInfo.Name
                break
            }}
        }}
        
        # Set female voice if found
        if ($femaleVoice) {{
            $synth.SelectVoice($femaleVoice)
        }}
        
        # Set voice properties
        $synth.Rate = 0      # Normal speed
        $synth.Volume = 100  # Full volume
        
        $synth.SetOutputToDefaultAudioDevice()
        
        # Read text from file to avoid quote issues
        $textToSpeak = Get-Content -Path "{temp_file}" -Raw
        $synth.Speak($textToSpeak)
        '''
        
        result = subprocess.run(['powershell', '-Command', powershell_cmd], 
                              capture_output=True, text=True, timeout=30)
        
        # Clean up temp file
        try:
            os.unlink(temp_file)
        except:
            pass
        
        if result.returncode == 0:
            print("[DEBUG] AI speech completed")
        else:
            print(f"[DEBUG] Speech error: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Speech Error: {e}")

def select_device(partial_name, is_input=True):
    devices = sd.query_devices()
    for i, dev in enumerate(devices):
        if partial_name in dev['name']:
            if is_input and dev['max_input_channels'] > 0:
                return i
            elif not is_input and dev['max_output_channels'] > 0:
                return i
    raise ValueError(f"No suitable {partial_name} device found")

def get_ai_response(user_message):
    try:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "BhatakBot"
        }
        
        # Try a more reliable free model
        data = {
            "model": "mistralai/mistral-7b-instruct:free",  # More reliable free model
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful AI assistant. Respond in English only."
                },
                {
                    "role": "user",
                    "content": user_message  # Removed the instruction suffix for cleaner response
                }
            ],
            "max_tokens": 150,
            "temperature": 0.7
        }

        print("[DEBUG] Sending request to OpenRouter...")  # Debug output
        response = requests.post(OPENROUTER_API_URL, headers=headers, json=data, timeout=20)
        
        print(f"[DEBUG] Status Code: {response.status_code}")  # Debug output
        print(f"[DEBUG] Response: {response.text}")  # Debug output

        if response.status_code == 200:
            result = response.json()
            try:
                ai_response = result['choices'][0]['message']['content']
                return ai_response.strip()
            except (KeyError, IndexError) as e:
                print(f"[DEBUG] Parsing error: {e}")  # Debug output
                return "Sorry, I couldn't process the response."
        
        # More specific error messages
        elif response.status_code == 401:
            return "Sorry, authentication failed. Please check the API key."
        elif response.status_code == 404:
            return "Sorry, the requested model was not found."
        elif response.status_code == 429:
            return "Sorry, too many requests. Please wait a moment."
        else:
            return f"Sorry, API returned error: {response.status_code}"

    except requests.exceptions.Timeout:
        return "Sorry, the request timed out."
    except requests.exceptions.RequestException as e:
        print(f"[DEBUG] Request error: {str(e)}")  # Debug output
        return "Sorry, there was a connection error."
    except Exception as e:
        print(f"[DEBUG] Unexpected error: {str(e)}")  # Debug output
        return "Sorry, an unexpected error occurred."
def record_audio_with_silence_detection(device_id):
    """Record audio until silence is detected or max time reached"""
    print("🎙️ Listening... (speak now, will stop when you're quiet)")
    
    chunk_duration = 0.1  # Process audio in 100ms chunks
    chunk_samples = int(SAMPLE_RATE * chunk_duration)
    max_chunks = int(MAX_RECORD_SECONDS / chunk_duration)
    silence_chunks_needed = int(SILENCE_DURATION / chunk_duration)
    
    audio_data = []
    silence_chunk_count = 0
    
    for i in range(max_chunks):
        # Record a small chunk
        chunk = sd.rec(chunk_samples, samplerate=SAMPLE_RATE, channels=1, dtype='float32', device=device_id)
        sd.wait()
        
        audio_data.append(chunk.flatten())
        
        # Check if this chunk is silent
        chunk_volume = np.sqrt(np.mean(chunk**2))  # RMS volume
        
        if chunk_volume < SILENCE_THRESHOLD:
            silence_chunk_count += 1
            print(".", end="", flush=True)  # Show silence detection
        else:
            silence_chunk_count = 0  # Reset silence counter if sound detected
            print("🔊", end="", flush=True)  # Show sound detection
        
        # Stop if we've had enough silence
        if silence_chunk_count >= silence_chunks_needed:
            print(f"\n⏹️ Stopped after {(i+1)*chunk_duration:.1f} seconds (silence detected)")
            break
    else:
        print(f"\n⏹️ Stopped after maximum time ({MAX_RECORD_SECONDS} seconds)")
    
    # Combine all chunks
    full_audio = np.concatenate(audio_data)
    return full_audio

def main():
    try:
        # Set up input device (for recording from call)
        try:
            input_id = select_device("CABLE Output", is_input=True)
            print(f"✅ Using VB-Cable: {sd.query_devices(input_id)['name']}")
        except ValueError:
            print("⚠️  VB-Cable not found, using default microphone")
            input_id = None
        
        model = whisper.load_model("medium")
        print("🤖 AI Voice Assistant Ready!")
        
        while True:
            # Record audio with silence detection
            audio = record_audio_with_silence_detection(input_id)
            
            # Normalize audio
            if np.max(np.abs(audio)) > 0:
                audio = audio / np.max(np.abs(audio))
            
            try:
                result = model.transcribe(audio, fp16=False)
                user_text = result['text'].strip()
                print(f"👤 You: {user_text}")
            except Exception as e:
                print(f"❌ Transcription error: {e}")
                user_text = ""
            
            if user_text:
                ai_response = get_ai_response(user_text)
                print(f"🤖 AI: {ai_response}")
                speak_windows_sapi(ai_response)
            
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopped.")
    except Exception as e:
        print(f"🚨 Error: {e}")
    finally:
        sd.stop()

if __name__ == "__main__":
    main()