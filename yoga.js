document.addEventListener("DOMContentLoaded", function () {
    const accessButton = document.getElementById('accessButton');
    const stopButton = document.getElementById('stopButton');
    const video = document.getElementById('video');
    let stream = null;

    async function checkCameraAccess() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            accessButton.style.display = "none";
            stopButton.style.display = "inline-block";
            video.style.display = "block";
            video.srcObject = stream;
        } catch (error) {
            console.log("Camera access not granted or error:", error);
        }
    }

    accessButton.addEventListener("click", checkCameraAccess);

    stopButton.addEventListener("click", () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.style.display = "none";
            stopButton.style.display = "none";
            accessButton.style.display = "inline-block";
        }


    // Check on page load if the user already granted access
    navigator.mediaDevices.enumerateDevices().then(devices => {
        if (devices.some(device => device.kind === "videoinput")) {
            checkCameraAccess();
        }
    });
});
uploadButton.addEventListener("click", () => {
    imageInput.click(); // Trigger the file input click
});

imageInput.addEventListener("change", (event) => {
    const files = event.target.files;
    if (files.length > 10) {
        alert("You can only upload a maximum of 10 images.");
        imageInput.value = ""; // Clear the input
        return;
    }

    // Clear previous previews
    imagePreviewContainer.innerHTML = '';

    // Process the uploaded images
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = function (e) {
            // Create a preview element
            const previewDiv = document.createElement("div");
            previewDiv.classList.add("image-preview");

            const img = document.createElement("img");
            img.src = e.target.result;

            const deleteButton = document.createElement("button");
            deleteButton.classList.add("delete-button");
            deleteButton.innerHTML = "X"; // X mark for deletion
            deleteButton.onclick = function () {
                imagePreviewContainer.removeChild(previewDiv); // Remove the image preview
            };

            previewDiv.appendChild(img);
            previewDiv.appendChild(deleteButton);
            imagePreviewContainer.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
    }
});
});