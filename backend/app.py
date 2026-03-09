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

app = Flask(__name__)
CORS(app)

# Configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_FOLDER = '/tmp'

app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize Google Vision API client (optional)
vision_client = None
try:
    from google.cloud import vision
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
    """
    Process image and extract text
    Accepts: image file or base64 string
    """
    try:
        if 'image' not in request.files and 'image_base64' not in request.form:
            return jsonify({'error': 'No image provided'}), 400
        
        # Get image from either file upload or base64
        if 'image' in request.files:
            file = request.files['image']
            if file.filename == '':
                return jsonify({'error': 'No selected file'}), 400
            if not allowed_file(file.filename):
                return jsonify({'error': 'Invalid file type'}), 400
            image_bytes = file.read()
        else:
            image_base64 = request.form.get('image_base64')
            image_bytes = base64.b64decode(image_base64)
        
        # Process with Tesseract (always available)
        image = Image.open(BytesIO(image_bytes))
        text_tesseract = pytesseract.image_to_string(image, lang='tha+eng')
        
        extracted_serials = extract_serial_from_text(text_tesseract)
        
        result = {
            'method': 'tesseract',
            'text': text_tesseract,
            'serials': [normalize_serial(s) for s in extracted_serials],
            'raw_serials': extracted_serials
        }
        
        # Try Google Vision API if available
        if vision_client:
            try:
                response = vision_client.text_detection(
                    image=vision.Image(content=image_bytes)
                )
                text_vision = response.text_annotations[0].description if response.text_annotations else ""
                serials_vision = extract_serial_from_text(text_vision)
                
                result['method'] = 'google_vision+tesseract'
                result['text_google'] = text_vision
                result['serials_google'] = [normalize_serial(s) for s in serials_vision]
            except Exception as e:
                print(f"Google Vision API error: {e}")
        
        return jsonify(result), 200
    
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/extract-serial', methods=['POST'])
def extract_serial():
    """
    Quick endpoint to just extract serial numbers from OCR text
    """
    try:
        text = request.json.get('text', '')
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        serials = extract_serial_from_text(text)
        return jsonify({
            'serials': [normalize_serial(s) for s in serials],
            'raw_serials': serials,
            'count': len(serials)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/info', methods=['GET'])
def info():
    """
    Get backend info
    """
    info_dict = {
        'name': 'Device Lookup OCR Backend',
        'version': '2.0',
        'features': ['ocr', 'tesseract', 'serial_extraction'],
        'has_google_vision': vision_client is not None
    }
    return jsonify(info_dict), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))\n\n\n@app.route('/extract-serial', methods=['POST'])\ndef extract_serial():\n    \"\"\"\n    Quick endpoint to just extract serial numbers from OCR text\n    \"\"\"\n    try:\n        text = request.json.get('text', '')\n        if not text:\n            return jsonify({'error': 'No text provided'}), 400\n        \n        serials = extract_serial_from_text(text)\n        return jsonify({\n            'serials': [normalize_serial(s) for s in serials],\n            'raw_serials': serials,\ n            'count': len(serials)\ n        }), 200\n    \ n    except Exception as e:\ n        return jsonify({'error': str(e)}), 500\n\n\n@app.route('/info', methods=['GET'])\ndef info():\ n    \"\"\"\ n    Get backend info\n    \"\"\"\ n    info = {\ n        'name': 'Device Lookup OCR Backend',\ n        'version': '2.0',\ n        'features': ['ocr', 'tesseract', 'serial_extraction'],\ n        'has_google_vision': vision_client is not None\n    }\ n    return jsonify(info), 200\n\n\nif __name__ == '__main__':\ n    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))\ n