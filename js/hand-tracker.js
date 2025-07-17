export class HandTracker {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.canvasCtx = null;
        this.onResults = null;
        this.isRunning = false;
        this.frameBuffer = [];
        this.maxBufferSize = 30; // For dynamic gesture recognition
    }

    async init() {
        // Initialize MediaPipe Hands
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1, // Balance between accuracy and speed
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => this.processResults(results));
    }

    async startCamera(videoElement, canvasElement) {
        this.canvasCtx = canvasElement.getContext('2d');
        
        // Setup camera
        this.camera = new Camera(videoElement, {
            onFrame: async () => {
                if (this.isRunning) {
                    await this.hands.send({ image: videoElement });
                }
            },
            width: 640,
            height: 480
        });

        await this.camera.start();
        this.isRunning = true;
    }

    processResults(results) {
        // Clear canvas
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasCtx.canvas.width, this.canvasCtx.canvas.height);
        
        // Draw camera feed
        this.canvasCtx.drawImage(results.image, 0, 0, this.canvasCtx.canvas.width, this.canvasCtx.canvas.height);

        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                // Draw hand landmarks
                this.drawLandmarks(landmarks);
                
                // Add to frame buffer for dynamic gestures
                this.addToFrameBuffer(landmarks);
            }
        }

        this.canvasCtx.restore();

        // Call external callback with processed results
        if (this.onResults) {
            const processedResults = {
                ...results,
                frameBuffer: this.frameBuffer,
                normalizedLandmarks: this.normalizeLandmarks(results.multiHandLandmarks)
            };
            this.onResults(processedResults);
        }
    }

    drawLandmarks(landmarks) {
        // Draw connections
        drawConnectors(this.canvasCtx, landmarks, HAND_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 2
        });
        
        // Draw landmarks
        drawLandmarks(this.canvasCtx, landmarks, {
            color: '#FF0000',
            lineWidth: 1,
            radius: 3
        });
    }

    addToFrameBuffer(landmarks) {
        const normalizedLandmarks = this.normalizeLandmarks([landmarks])[0];
        this.frameBuffer.push({
            landmarks: normalizedLandmarks,
            timestamp: Date.now()
        });

        // Maintain buffer size
        if (this.frameBuffer.length > this.maxBufferSize) {
            this.frameBuffer.shift();
        }
    }

    normalizeLandmarks(multiHandLandmarks) {
        if (!multiHandLandmarks) return [];
        
        return multiHandLandmarks.map(landmarks => {
            // Find bounding box
            let minX = 1, minY = 1, maxX = 0, maxY = 0;
            landmarks.forEach(point => {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            });

            const width = maxX - minX;
            const height = maxY - minY;
            const size = Math.max(width, height);

            // Normalize to unit square centered at origin
            return landmarks.map(point => ({
                x: (point.x - minX - width / 2) / size,
                y: (point.y - minY - height / 2) / size,
                z: point.z || 0
            }));
        });
    }

    getSequenceFeatures() {
        if (this.frameBuffer.length < 10) return null;
        
        // Extract features for sequence analysis
        const features = this.frameBuffer.slice(-15).map(frame => {
            return this.extractHandFeatures(frame.landmarks);
        });

        return features;
    }

    extractHandFeatures(landmarks) {
        if (!landmarks || landmarks.length !== 21) return new Array(63).fill(0);
        
        // Convert landmarks to feature vector
        const features = [];
        landmarks.forEach(point => {
            features.push(point.x, point.y, point.z);
        });
        
        return features;
    }

    stop() {
        this.isRunning = false;
        if (this.camera) {
            this.camera.stop();
        }
        this.frameBuffer = [];
    }
}
