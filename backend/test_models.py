"""Quick model check — writes results to test_output.txt"""
import sys, os, io
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
outfile = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_output.txt")
f = open(outfile, "w", encoding="utf-8")

def p(msg):
    f.write(msg + "\n")
    f.flush()

p("=" * 55)
p("  HealthMitra Scan - Model Verification")
p("=" * 55)

uploads = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(uploads, exist_ok=True)

# TEST 1: Tesseract OCR
p("\n--- TEST 1: Tesseract OCR ---")
try:
    import pytesseract
    from PIL import Image, ImageDraw
    from config import TESSERACT_CMD
    p(f"  pytesseract imported OK")
    if os.path.exists(TESSERACT_CMD):
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
        p(f"  Tesseract found: {TESSERACT_CMD}")
    v = pytesseract.get_tesseract_version()
    p(f"  Tesseract version: {v}")
    img = Image.new('RGB', (500, 100), 'white')
    ImageDraw.Draw(img).text((10, 30), "Hemoglobin: 14.2 g/dL Blood Sugar: 110", fill='black')
    text = pytesseract.image_to_string(img, lang="eng").strip()
    p(f"  OCR extracted: '{text}'")
    p(f"  >> OCR STATUS: REAL MODEL WORKING")
except Exception as e:
    p(f"  ERROR: {e}")
    p(f"  >> OCR STATUS: FALLBACK (simulated)")

# TEST 2: YOLOv8
p("\n--- TEST 2: YOLOv8 Food Detection ---")
try:
    from ultralytics import YOLO
    p("  ultralytics imported OK")
    model = YOLO("yolov8n.pt")
    p(f"  Model loaded: {len(model.names)} classes")
    food_cls = [n for n in model.names.values() if n in ["banana","apple","pizza","cake","sandwich","orange","broccoli","carrot","donut","hot dog","bowl","cup"]]
    p(f"  Food classes: {food_cls}")
    from PIL import Image as PI
    ti = os.path.join(uploads, "_ty.jpg")
    PI.new('RGB', (640, 480), (200, 150, 100)).save(ti)
    r = model(ti, conf=0.25, verbose=False)
    p(f"  Inference OK, detections on blank: {len(r[0].boxes)}")
    os.remove(ti)
    p(f"  >> YOLO STATUS: REAL MODEL WORKING")
except Exception as e:
    p(f"  ERROR: {e}")
    p(f"  >> YOLO STATUS: FALLBACK (simulated)")

# TEST 3: Whisper
p("\n--- TEST 3: Whisper Speech-to-Text ---")
try:
    import whisper
    p("  whisper imported OK")
    import subprocess
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5, check=True)
        p("  ffmpeg found OK")
    except Exception:
        p("  WARNING: ffmpeg not found (needed for real audio)")
    p("  Loading Whisper 'base' model...")
    wm = whisper.load_model("base")
    p("  Model loaded OK")
    import numpy as np, wave
    tw = os.path.join(uploads, "_tw.wav")
    s = np.zeros(32000, dtype=np.int16)
    with wave.open(tw, 'w') as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(16000); wf.writeframes(s.tobytes())
    res = wm.transcribe(tw, language="en", fp16=False)
    p(f"  Transcription (silent): '{res.get('text','').strip()}'")
    os.remove(tw)
    p(f"  >> WHISPER STATUS: REAL MODEL WORKING")
except Exception as e:
    p(f"  ERROR: {e}")
    p(f"  >> WHISPER STATUS: FALLBACK (simulated)")

# TEST 4: Ollama
p("\n--- TEST 4: Ollama LLM ---")
try:
    import ollama
    models = ollama.list()
    if models and hasattr(models, 'models') and len(models.models) > 0:
        names = [m.model for m in models.models]
        p(f"  Ollama models: {names}")
        p(f"  >> OLLAMA STATUS: REAL MODEL WORKING")
    else:
        p(f"  >> OLLAMA STATUS: No models. Run: ollama pull phi3")
except Exception as e:
    p(f"  ERROR: {e}")
    p(f"  >> OLLAMA STATUS: FALLBACK")

p("\n" + "=" * 55)
p("  DONE")
p("=" * 55)
f.close()
print(f"Results written to: {outfile}")
