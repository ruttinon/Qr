"""
OCR Backend for Device Lookup System
Uses Google Vision API and Tesseract for OCR processing
Deploy to: Heroku, Railway, or Vercel
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import re
import base64
import json
from io import BytesIO
from PIL import Image
import pytesseract
from google.cloud import vision

app = Flask(__name__)
CORS(app)

# Configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_FOLDER = '/tmp'

app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize Google Vision API client (if credentials available)
vision_client = None
try:
    vision_client = vision.ImageAnnotatorClient()
except Exception as e:
    print(f"Google Vision API not available: {e}")


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_serial_from_text(text):
    """Extract serial numbers from OCR text"""
    # Pattern: XXXX XXXX XXXXXXXX
    pattern = r'[0-9]{4}\s?[0-9]{4}\s?[0-9]{8}'
    matches = re.findall(pattern, text)
    return matches


def normalize_serial(serial):
    """Remove spaces from serial number"""
    return serial.replace(' ', '')


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'version': '2.0'}), 200


@app.route('/ocr', methods=['POST'])
def ocr_process():
    \"\"\"\n    Process image and extract text\n    Accepts: image file or base64 string\n    \"\"\"\n    try:\n        if 'image' not in request.files and 'image_base64' not in request.form:\n            return jsonify({'error': 'No image provided'}), 400\n        \n        # Get image from either file upload or base64\n        if 'image' in request.files:\n            file = request.files['image']\n            if file.filename == '':\n                return jsonify({'error': 'No selected file'}), 400\n            if not allowed_file(file.filename):\n                return jsonify({'error': 'Invalid file type'}), 400\n            image_bytes = file.read()\n        else:\n            image_base64 = request.form.get('image_base64')\n            image_bytes = base64.b64decode(image_base64)\n        \n        # Process with Tesseract (always available)\n        image = Image.open(BytesIO(image_bytes))\n        text_tesseract = pytesseract.image_to_string(image, lang='tha+eng')\n        \n        extracted_serials = extract_serial_from_text(text_tesseract)\n        \n        result = {\n            'method': 'tesseract',\n            'text': text_tesseract,\n            'serials': [normalize_serial(s) for s in extracted_serials],\n            'raw_serials': extracted_serials\n        }\n        \n        # Try Google Vision API if available\n        if vision_client:\n            try:\n                response = vision_client.text_detection(\n                    image=vision.Image(content=image_bytes)\n                )\n                text_vision = response.text_annotations[0].description if response.text_annotations else \"\"\n                serials_vision = extract_serial_from_text(text_vision)\n                \n                result['method'] = 'google_vision+tesseract'\n                result['text_google'] = text_vision\n                result['serials_google'] = [normalize_serial(s) for s in serials_vision]\n            except Exception as e:\n                print(f\"Google Vision API error: {e}\")\n        \n        return jsonify(result), 200\n    \n    except Exception as e:\n        print(f\"Error: {e}\")\n        return jsonify({'error': str(e)}), 500\n\n\n@app.route('/extract-serial', methods=['POST'])\ndef extract_serial():\n    \"\"\"\n    Quick endpoint to just extract serial numbers from OCR text\n    \"\"\"\n    try:\n        text = request.json.get('text', '')\n        if not text:\n            return jsonify({'error': 'No text provided'}), 400\n        \n        serials = extract_serial_from_text(text)\n        return jsonify({\n            'serials': [normalize_serial(s) for s in serials],\n            'raw_serials': serials,\n            'count': len(serials)\n        }), 200\n    \n    except Exception as e:\n        return jsonify({'error': str(e)}), 500\n\n\n@app.route('/info', methods=['GET'])\ndef info():\n    \"\"\"\n    Get backend info\n    \"\"\"\n    info = {\n        'name': 'Device Lookup OCR Backend',\n        'version': '2.0',\n        'features': ['ocr', 'tesseract', 'serial_extraction'],\n        'has_google_vision': vision_client is not None\n    }\n    return jsonify(info), 200\n\n\nif __name__ == '__main__':\n    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))\n