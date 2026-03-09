async function processImage() {
    const fileInput = document.getElementById('imageInput');
    const resultDiv = document.getElementById('result');
    const detectedTextEl = document.getElementById('detectedText');
    const extractedSerialEl = document.getElementById('extractedSerial');

    if (!fileInput.files[0]) {
        alert('Please select an image file.');
        return;
    }

    const image = fileInput.files[0];

    try {
        const { data: { text } } = await Tesseract.recognize(image, 'eng', {
            logger: m => console.log(m)
        });

        detectedTextEl.textContent = text;

        // Extract serial number using regex
        const serialRegex = /[0-9]{4}\s?[0-9]{4}\s?[0-9]{8}/g;
        const matches = text.match(serialRegex);

        if (matches && matches.length > 0) {
            const serial = matches[0].replace(/\s/g, ''); // Remove spaces for matching
            extractedSerialEl.textContent = `Extracted Serial: ${matches[0]}`;
            // Redirect to device page
            setTimeout(() => {
                window.location.href = `device.html?serial=${encodeURIComponent(serial)}`;
            }, 2000); // Delay to show the result
        } else {
            extractedSerialEl.textContent = 'No serial number detected.';
        }

        resultDiv.style.display = 'block';
    } catch (error) {
        console.error('OCR Error:', error);
        alert('Error processing image. Please try again.');
    }
}