const spreadsheetId = "1CcctQMc7i0PoVJCemHI2WfkgJ_im8SyZn5jAx7JT7Ps";
const sheetName = "devices";
const apiURL = `https://opensheet.elk.sh/${spreadsheetId}/${encodeURIComponent(sheetName)}`;

// Optional: Backend OCR for faster processing (set your backend URL here)
const BACKEND_URL = ''; // e.g., 'https://your-backend.herokuapp.com'

let qrCameraActive = false;
let tesseractWorker = null;

// Initialize Tesseract worker once for reuse
async function initTesseract() {
    if (tesseractWorker) return tesseractWorker;
    
    tesseractWorker = await Tesseract.createWorker({
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@4.0.4/tesseract-core.wasm.js',
        logger: m => {
            if (m.status === 'recognizing' && m.progress) {
                console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
        }
    });
    
    await tesseractWorker.load();
    await tesseractWorker.loadLanguage('tha+eng');
    await tesseractWorker.initialize('tha+eng');
    
    return tesseractWorker;
}

// Compress image for faster processing
function compressImage(file, callback, maxWidth = 800, quality = 0.8) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxWidth) {
                    width *= maxWidth / height;
                    height = maxWidth;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(callback, 'image/jpeg', quality);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// OCR using Python backend (faster at scale)
async function processOCRWithBackend(imageBlob) {
    const formData = new FormData();
    formData.append('image', imageBlob);
    
    const response = await fetch(`${BACKEND_URL}/ocr`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) throw new Error('Backend OCR failed');
    return await response.json();
}

// ========== TAB MANAGEMENT ==========
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const tabElement = document.getElementById(tabName === 'qrcode' ? 'qrcode-tab' : tabName);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    event.target.classList.add('active');
}

// ========== MANUAL SEARCH ==========
function searchDevice() {
    const serial = document.getElementById('serialInput').value.trim();
    if (!serial) {
        alert('กรุณาป้อนเลขซีเรียล');
        return;
    }
    fetchAndDisplayDevice(serial);
}

// ========== OCR PROCESSING (OPTIMIZED) ==========
function processOCR() {
    const fileInput = document.getElementById('ocrInput');
    if (!fileInput.files[0]) {
        alert('กรุณาเลือกรูปภาพ');
        return;
    }
    
    const file = fileInput.files[0];
    const preview = document.getElementById('ocrPreview');
    const result = document.getElementById('ocrResult');
    const btn = event.target;
    
    btn.disabled = true;
    btn.textContent = '⏳ กำลังประมวลผล...';
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" alt="preview">`;
    };
    reader.readAsDataURL(file);
    
    // Compress image first for faster processing
    result.textContent = '🖼️ กำลังบีบอัดรูปภาพ...';
    
    compressImage(file, async (compressedBlob) => {
        try {
            result.textContent = '🤖 กำลังอ่านข้อความ...';
            
            // Try backend first if configured
            let ocrResult = null;
            if (BACKEND_URL) {
                try {
                    ocrResult = await processOCRWithBackend(compressedBlob);
                } catch (e) {
                    console.warn('Backend OCR failed, falling back to client-side');
                }
            }
            
            // Fallback to client-side Tesseract
            if (!ocrResult) {
                const worker = await initTesseract();
                const { data: { text } } = await worker.recognize(compressedBlob);
                ocrResult = { text, serials: extractSerialNumbers(text) };
            }
            
            const serialRegex = /[0-9]{4}\s?[0-9]{4}\s?[0-9]{8}/g;
            const matches = ocrResult.text.match(serialRegex);
            
            if (matches && matches.length > 0) {
                const serial = matches[0].replace(/\s/g, '');
                result.innerHTML = `✅ พบเลขซีเรียล: <strong>${matches[0]}</strong>`;
                
                setTimeout(() => {
                    fetchAndDisplayDevice(serial);
                }, 500);
            } else {
                result.innerHTML = `⚠️ ไม่พบเลขซีเรียล<br><pre style="font-size:12px; max-height:150px; overflow:auto;">${ocrResult.text.substring(0, 300)}</pre>`;
            }
        } catch (err) {
            console.error('OCR Error:', err);
            result.innerHTML = `❌ เกิดข้อผิดพลาด: ${err.message}`;
        } finally {
            btn.disabled = false;
            btn.textContent = '🤖 วิเคราะห์หรือดึง AI';
        }
    }, 600); // Smaller max width for faster processing
}

function extractSerialNumbers(text) {
    const serialRegex = /[0-9]{4}\s?[0-9]{4}\s?[0-9]{8}/g;
    return text.match(serialRegex) || [];
}

// ========== QR CODE PROCESSING ==========
function toggleQRCamera() {
    const qrVideo = document.getElementById('qrVideo');
    const videoElement = document.getElementById('qrVideoElement');
    
    if (!qrCameraActive) {
        qrCameraActive = true;
        qrVideo.style.display = 'block';
        
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                videoElement.srcObject = stream;
                videoElement.play();
                scanQRCode(videoElement);
            })
            .catch(err => {
                document.getElementById('qrError').style.display = 'block';
                document.getElementById('qrError').textContent = '❌ ไม่สามารถเข้าถึงกล้อง: ' + err.message;
                qrCameraActive = false;
            });
    } else {
        qrCameraActive = false;
        qrVideo.style.display = 'none';
        const stream = videoElement.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }
}

function scanQRCode(videoElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    function scan() {
        if (!qrCameraActive) return;
        
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        
        if (code) {
            console.log('QR Code found:', code.data);
            const url = new URL(code.data);
            const serial = url.searchParams.get('serial');
            
            if (serial) {
                document.getElementById('qrResultText').innerHTML = `✅ ค้นหาเลขซีเรียล: <strong>${serial}</strong>`;
                qrCameraActive = false;
                videoElement.srcObject.getTracks().forEach(track => track.stop());
                document.getElementById('qrVideo').style.display = 'none';
                fetchAndDisplayDevice(serial);
            }
        }
        
        if (qrCameraActive) {
            requestAnimationFrame(scan);
        }
    }
    
    scan();
}

function processQRImage() {
    const fileInput = document.getElementById('qrInput');
    if (!fileInput.files[0]) return;
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, canvas.width, canvas.height);
            
            if (code) {
                const url = new URL(code.data);
                const serial = url.searchParams.get('serial');
                if (serial) {
                    document.getElementById('qrResultText').innerHTML = `✅ ค้นหาเลขซีเรียล: <strong>${serial}</strong>`;
                    fetchAndDisplayDevice(serial);
                }
            } else {
                document.getElementById('qrResultText').innerHTML = '❌ ไม่พบ QR Code ในรูปภาพ';
            }
        };
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// ========== FETCH AND DISPLAY DEVICE ==========
async function fetchAndDisplayDevice(serial) {
    try {
        const res = await fetch(apiURL);
        if (!res.ok) throw new Error('Failed to fetch');
        
        const data = await res.json();
        console.log('Fetched data:', data);
        
        // Search for device with flexible serial matching
        const device = data.find(d => 
            d["Serial No."] && 
            d["Serial No."].replace(/\s/g, '') === serial.replace(/\s/g, '')
        );
        
        const infoDiv = document.getElementById('deviceInfo');
        
        if (device) {
            infoDiv.innerHTML = `
                <h2>✅ ${device["Description"] || "ไม่พบ"}</h2>
                <p><strong>เลขซีเรียล:</strong> ${device["Serial No."] || "N/A"}</p>
                <p><strong>รหัสประเภท:</strong> ${device["Item Category Code"] || "N/A"}</p>
                <p><strong>เลขใบแจ้ง:</strong> ${device["Invoice No."] || "N/A"}</p>
                <p><strong>วันหมดประกัน:</strong> ${device["Warranty Date"] || "N/A"}</p>
            `;
            infoDiv.style.display = 'block';
        } else {
            infoDiv.innerHTML = `<h2>❌ ไม่พบอุปกรณ์ที่ค้นหา</h2><p>เลขซีเรียล: ${serial}</p>`;
            infoDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('deviceInfo').innerHTML = `<h2>❌ เกิดข้อผิดพลาด</h2><p>${error.message}</p>`;
        document.getElementById('deviceInfo').style.display = 'block';
    }
}

// ========== CHECK QR PARAMETER ON LOAD ==========
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const serial = params.get('serial');
    if (serial) {
        fetchAndDisplayDevice(serial);
    }
});