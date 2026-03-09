# Device Lookup System v2.0

A modern lightweight QR + OCR Device Lookup Web Application with Python backend support.

## Features

### Frontend
- **Manual Search**: Enter serial number to search device database
- **OCR Scan**: Take a photo to automatically extract and recognize serial numbers
- **QR Code Scan**: Scan QR codes containing device links
- **Modern Dark UI**: Cyan-themed responsive design
- **Real-time Display**: Instant device information lookup

### Backend (Optional Python)
- **Better OCR Processing**: Uses both Tesseract and Google Vision API
- **Serial Number Extraction**: Automatically extracts serial numbers using regex
- **RESTful API**: Easy integration with frontend

## Technology Stack

### Frontend
- HTML5 / CSS3 / JavaScript (ES6+)
- Tesseract.js (Client-side OCR)
- jsQR (QR Code detection)
- Responsive Design

### Backend (Optional)
- Python 3.9+
- Flask
- Pytesseract
- Google Cloud Vision API
- Gunicorn

## Project Structure

```
qr-device-system/
├── index.html              # Main dashboard
├── app.js                  # Frontend logic
├── style.css              # Modern styling
├── scan.html              # OCR scan page
├── device.html            # Device info page
├── script.js              # Device lookup logic
├── ocr.js                 # OCR processing
├── backend/
│   ├── app.py             # Python Flask backend
│   ├── requirements.txt    # Python dependencies
│   ├── Procfile           # Heroku deployment config
│   └── .env.example       # Environment variables template
└── README.md              # This file
```

## Deployment

### Frontend Only (Easiest)

Deploy to GitHub Pages, Vercel, or Netlify:

1. **GitHub Pages**
   - Push to GitHub
   - Settings → Pages → Deploy from branch: master
   - URL: `https://username.github.io/repo-name`

2. **Vercel**
   - Connect GitHub repo
   - Auto-deploys on push

3. **Netlify**
   - Connect GitHub repo
   - Netlify automatically configures settings

### With Python Backend

#### Deploy to Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

heroku login
heroku create your-app-name
git push heroku main

# Set environment variables
heroku config:set GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
```

#### Deploy to Railway.app

```bash
# Railway automatically detects Procfile
# Connect GitHub & deploy with one click
# https://railway.app
```

#### Deploy to Vercel Functions

```bash
# Convert Flask to serverless functions
# See: https://vercel.com/docs/concepts/functions/python
```

## Setup & Installation

### Frontend Only

1. Clone repository
```bash
git clone https://github.com/yourusername/qr-device-system.git
cd qr-device-system
```

2. Update Google Sheets ID in `app.js`
```javascript
const spreadsheetId = "YOUR_SPREADSHEET_ID";
```

3. Open `index.html` in browser or deploy to static hosting

### With Python Backend

1. **Prerequisites**
   - Python 3.9+
   - Tesseract OCR (`apt install tesseract-ocr` or `brew install tesseract`)
   - (Optional) Google Cloud Vision API credentials

2. **Setup Backend**
```bash
cd backend
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your settings

# Run locally
python app.py
```

3. **Update Frontend**
In `app.js`, set the backend URL:
```javascript
const BACKEND_URL = process.env.NODE_ENV === 'production' 
    ? 'https://your-backend.herokuapp.com'
    : 'http://localhost:5000';
```

## Google Sheets Setup

1. Create a Google Sheet with columns:
   - Description
   - Serial No.
   - Item Category Code
   - Invoice No.
   - Warranty Date

2. Share the sheet as public (read-only)

3. Get the Spreadsheet ID from URL:
   ```
   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   ```

4. Update in `app.js`:
   ```javascript
   const spreadsheetId = "YOUR_SPREADSHEET_ID";
   ```

## API Endpoints (Backend)

### GET `/health`
Health check endpoint
```
Response: {"status": "ok", "version": "2.0"}
```

### POST `/ocr`
Process image and extract text
```
Body: 
  - image: (file upload) or
  - image_base64: (base64 string)

Response:
{
  "method": "tesseract",
  "text": "extracted text...",
  "serials": ["1599053267080010024"],
  "raw_serials": ["1599 0532 67080010024"]
}
```

### POST `/extract-serial`
Extract serial from OCR text
```
Body: {"text": "SOCOMEC ATyS 800A Serial: 1599 0532 67080010024"}

Response:
{
  "serials": ["1599053267080010024"],
  "raw_serials": ["1599 0532 67080010024"],
  "count": 1
}
```

### GET `/info`
Get backend info
```
Response:
{
  "name": "Device Lookup OCR Backend",
  "version": "2.0",
  "features": ["ocr", "tesseract", "serial_extraction"],
  "has_google_vision": true
}
```

## Usage

### Manual Search
1. Enter serial number in text field
2. Click "ค้นหาอุปกรณ์" (Search)
3. View device information

### OCR Scan
1. Click "📷 OCR SCAN" tab
2. Upload or take a photo of device label
3. AI automatically extracts serial number
4. Device information displays instantly

### QR Code Scan
1. Click "📊 QR CODE" tab
2. Click "📹 เปิดกล้อง" (Open Camera) or upload QR image
3. Scan QR containing link: `device.html?serial=XXXX`
4. Device information displays

## Customization

### Change API Key Display
Edit `index.html` to remove or modify:
```html
<input type="password" id="apiKey" placeholder="API KEY sk-ant-api03-...">
```

### Modify Serial Number Format
Edit regex in `app.js`:
```javascript
const serialRegex = /[0-9]{4}\s?[0-9]{4}\s?[0-9]{8}/g;
```

### Change Theme Colors
Edit `:root` in `style.css`:
```css
:root {
    --primary: #00d4ff;      /* Cyan */
    --bg: #0a0e27;           /* Dark blue */
    --card-bg: #1a1f3a;      /* Card background */
}
```

## Troubleshooting

### OCR Not Working
- Ensure image is clear and well-lit
- Try different image formats (JPG, PNG)
- Check browser console for errors
- Backend: Install tesseract: `apt install tesseract-ocr`

### Google Sheets Not Loading
- Verify Spreadsheet ID is correct
- Check sheet name (case-sensitive)
- Ensure sheet is publicly shared (read-only)
- Check network tab in DevTools

### QR Code Not Scanning
- Ensure good lighting
- QR code must contain full URL
- Check permissions for camera access
- Verify QR format: `device.html?serial=XXXX`

## Security Notes

⚠️ **Important:**
- API Key field is for UI/UX - currently not enforced
- Google Sheets must be publicly readable
- Never hardcode sensitive credentials in frontend
- Backend should validate all inputs
- Rate limiting recommended for production

## Performance Tips

- Cache Google Sheets data locally
- Compress images before OCR processing
- Use Service Workers for offline support
- Lazy load Tesseract.js and jsQR

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Improvements

- [ ] Barcode scanning (not just QR codes)
- [ ] Multi-language OCR support
- [ ] Advanced image preprocessing
- [ ] Device database caching
- [ ] Offline support with Service Workers
- [ ] Push notifications for inventory updates
- [ ] Export device data to CSV/PDF
- [ ] Admin dashboard for adding devices

## License

MIT License - Feel free to use and modify

## Support

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/qr-device-system/issues)
- 📖 Docs: Full documentation available

---

**Version**: 2.0  
**Last Updated**: March 2026  
**Status**: Production Ready ✅