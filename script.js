const params = new URLSearchParams(window.location.search);
const serial = params.get("serial");

const sheetURL = "https://opensheet.elk.sh/1rnWYCwn5Hl33NnITukkoFv5iI0_EXspEG34UdyRFqdw/Item%20Ledger%20Entries";

async function loadDevice() {
    const container = document.getElementById("device");
    if (!serial) {
        container.innerHTML = "No serial number provided.";
        return;
    }

    try {
        const res = await fetch(sheetURL);
        if (!res.ok) {
            throw new Error("Failed to fetch data");
        }
        const data = await res.json();
        const device = data.find(d => d["Serial No."] === serial);

        if (device) {
            container.innerHTML = `
                <div class="device-card">
                    <h2>${device["Description"] || "N/A"}</h2>
                    <p><strong>Serial No.:</strong> ${device["Serial No."] || "N/A"}</p>
                    <p><strong>Item Category Code:</strong> ${device["Item Category Code"] || "N/A"}</p>
                    <p><strong>Invoice No.:</strong> ${device["Invoice No."] || "N/A"}</p>
                    <p><strong>Warranty Date:</strong> ${device["Warranty Date"] || "N/A"}</p>
                </div>
            `;
        } else {
            container.innerHTML = "<p>Device not found.</p>";
        }
    } catch (error) {
        container.innerHTML = "<p>Error loading device information. Please try again later.</p>";
        console.error(error);
    }
}

loadDevice();