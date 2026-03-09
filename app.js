const spreadsheetId = "1CcctQMc7i0PoVJCemHI2WfkgJ_im8SyZn5jAx7JT7Ps";
const sheetName = "devices";
const apiURL = `https://opensheet.elk.sh/${spreadsheetId}/${encodeURIComponent(sheetName)}`;

let qrCameraActive = false;

// ========== TAB MANAGEMENT ==========
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tabElement = document.getElementById(tabName === 'qrcode' ? 'qrcode-tab' : tabName);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    // Activate button
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

// ========== OCR PROCESSING ==========
function processOCR() {
    const fileInput = document.getElementById('ocrInput');
    if (!fileInput.files[0]) {
        alert('กรุณาเลือกรูปภาพ');
        return;
    }
    
    const file = fileInput.files[0];
    const preview = document.getElementById('ocrPreview');
    const result = document.getElementById('ocrResult');
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" alt="preview">`;
    };
    reader.readAsDataURL(file);
    
    // Process with Tesseract
    result.textContent = 'กำลังประมวลผล...';
    
    Tesseract.recognize(file, 'th+eng', {
        logger: m => console.log(m)
    }).then(({ data: { text } }) => {
        console.log('OCR Text:', text);
        
        // Extract serial number
        const serialRegex = /[0-9]{4}\s?[0-9]{4}\s?[0-9]{8}/g;
        const matches = text.match(serialRegex);
        
        if (matches && matches.length > 0) {
            const serial = matches[0].replace(/\s/g, '');
            result.innerHTML = `✅ พบเลขซีเรียล: <strong>${matches[0]}</strong>`;
            
            // Auto fetch device
            setTimeout(() => {
                fetchAndDisplayDevice(serial);
            }, 500);
        } else {
            result.innerHTML = `⚠️ ไม่พบเลขซีเรียล<br><pre>${text.substring(0, 200)}</pre>`;
        }
    }).catch(err => {
        console.error('OCR Error:', err);
        result.textContent = '❌ เกิดข้อผิดพลาดในการประมวลผล';
    });
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