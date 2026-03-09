const params = new URLSearchParams(window.location.search);
const serial = params.get("serial");

const spreadsheetId = "1CcctQMc7i0PoVJCemHI2WfkgJ_im8SyZn5jAx7JT7Ps";
const sheetName = "devices";
const apiURL = `https://opensheet.elk.sh/${spreadsheetId}/${encodeURIComponent(sheetName)}`;

async function loadDevice() {
    const container = document.getElementById("device");
    if (!serial) {
        container.innerHTML = "<p>No serial number provided.</p>";
        return;
    }

    try {
        const res = await fetch(apiURL);
        if (!res.ok) {
            throw new Error("Failed to fetch data");
        }
        const data = await res.json();
        const device = data.find(d => d["Serial No."].replace(/\s/g, '') === serial.replace(/\s/g, ''));

        if (device) {
            container.innerHTML = `
                <h2>Device Details</h2>
                <p><strong>Description:</strong> ${device["Description"] || "N/A"}</p>
                <p><strong>Serial No.:</strong> ${device["Serial No."] || "N/A"}</p>
                <p><strong>Item Category Code:</strong> ${device["Item Category Code"] || "N/A"}</p>
                <p><strong>Invoice No.:</strong> ${device["Invoice No."] || "N/A"}</p>
                <p><strong>Warranty Date:</strong> ${device["Warranty Date"] || "N/A"}</p>
            `;
        } else {
            container.innerHTML = "<p>Device not found.</p>";
        }
    } catch (error) {
        console.error("Error:", error);
        container.innerHTML = "<p>Error loading device information. Please try again later.</p>";
    }
}

loadDevice();