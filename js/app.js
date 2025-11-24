// Configuration
const CONFIG = {
    modelURL: './model/model.json',
    metadataURL: './model/metadata.json',
    maxPredictions: null
};

// DOM Elements
const elements = {
    status: document.getElementById('status'),
    imageUpload: document.getElementById('imageUpload'),
    webcamButton: document.getElementById('webcamButton'),
    webcamContainer: document.getElementById('webcamContainer'),
    webcam: document.getElementById('webcam'),
    snapshotCanvas: document.getElementById('snapshotCanvas'),
    captureButton: document.getElementById('captureButton'),
    closeWebcamButton: document.getElementById('closeWebcamButton'),
    imagePreview: document.getElementById('imagePreview'),
    previewImg: document.getElementById('previewImg'),
    results: document.getElementById('results'),
    predictionList: document.getElementById('predictionList'),
    clearButton: document.getElementById('clearButton')
};

// Global Variables
let model = null;
let webcamStream = null;

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await loadModel();
    setupEventListeners();
});

// Load Teachable Machine Model
async function loadModel() {
    try {
        updateStatus('Loading AI model...', 'loading');
        
        model = await tmImage.load(CONFIG.modelURL, CONFIG.metadataURL);
        CONFIG.maxPredictions = model.getTotalClasses();
        
        updateStatus('Model ready! 🎉', 'ready');
        console.log('Model loaded successfully:', model);
    } catch (error) {
        console.error('Error loading model:', error);
        updateStatus(`Failed to load model: ${error.message}`, 'error');
    }
}

// Update Status Message
function updateStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = `status ${type}`;
}

// Setup Event Listeners
function setupEventListeners() {
    // File upload
    elements.imageUpload.addEventListener('change', handleImageUpload);
    
    // Webcam controls
    elements.webcamButton.addEventListener('click', startWebcam);
    elements.captureButton.addEventListener('click', captureImage);
    elements.closeWebcamButton.addEventListener('click', stopWebcam);
    
    // Clear results
    elements.clearButton.addEventListener('click', clearResults);
}

// Handle Image Upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        elements.previewImg.src = e.target.result;
        elements.imagePreview.classList.remove('hidden');
        
        // Classify after image loads
        elements.previewImg.onload = () => {
            classifyImage(elements.previewImg);
        };
    };
    reader.readAsDataURL(file);
}

// Start Webcam
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false 
        });
        
        webcamStream = stream;
        elements.webcam.srcObject = stream;
        elements.webcamContainer.classList.remove('hidden');
        elements.webcamButton.classList.add('hidden');
        
        updateStatus('Webcam active', 'ready');
    } catch (error) {
        console.error('Webcam error:', error);
        updateStatus(`Camera access denied: ${error.message}`, 'error');
        alert('Please allow camera access to use this feature');
    }
}

// Capture Image from Webcam
function captureImage() {
    const canvas = elements.snapshotCanvas;
    const video = elements.webcam;
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Convert to image
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        elements.previewImg.src = url;
        elements.imagePreview.classList.remove('hidden');
        
        // Classify after image loads
        elements.previewImg.onload = () => {
            classifyImage(elements.previewImg);
            stopWebcam();
        };
    });
}

// Stop Webcam
function stopWebcam() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
    
    elements.webcamContainer.classList.add('hidden');
    elements.webcamButton.classList.remove('hidden');
    elements.webcam.srcObject = null;
}

// Classify Image
async function classifyImage(imageElement) {
    if (!model) {
        updateStatus('Model not loaded yet!', 'error');
        return;
    }
    
    try {
        updateStatus('Analyzing image...', 'loading');
        elements.results.classList.add('hidden');
        
        // Predict
        const predictions = await model.predict(imageElement, CONFIG.maxPredictions);
        
        // Sort by probability (highest first)
        predictions.sort((a, b) => b.probability - a.probability);
        
        // Display results
        displayResults(predictions);
        
        updateStatus('Analysis complete!', 'ready');
    } catch (error) {
        console.error('Classification error:', error);
        updateStatus(`Classification failed: ${error.message}`, 'error');
    }
}

// Display Prediction Results
function displayResults(predictions) {
    const predictionList = elements.predictionList;
    predictionList.innerHTML = '';
    
    predictions.forEach(prediction => {
        const confidence = Math.round(prediction.probability * 100);
        const confidenceClass = getConfidenceClass(confidence);
        
        const predictionItem = document.createElement('div');
        predictionItem.className = 'prediction-item';
        predictionItem.innerHTML = `
            <div class="prediction-info">
                <div class="prediction-label">${prediction.className}</div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidence}%"></div>
                </div>
            </div>
            <div class="prediction-confidence ${confidenceClass}">
                ${confidence}%
            </div>
        `;
        
        predictionList.appendChild(predictionItem);
    });
    
    elements.results.classList.remove('hidden');
}

// Get Confidence Level Class
function getConfidenceClass(confidence) {
    if (confidence >= 70) return 'high';
    if (confidence >= 40) return 'medium';
    return 'low';
}

// Clear Results
function clearResults() {
    elements.results.classList.add('hidden');
    elements.imagePreview.classList.add('hidden');
    elements.previewImg.src = '';
    elements.imageUpload.value = '';
    elements.predictionList.innerHTML = '';
    updateStatus('Ready for next image', 'ready');
}

// Handle Window Close (cleanup webcam)
window.addEventListener('beforeunload', () => {
    stopWebcam();
});