export class SignRecognizer {
    constructor() {
        this.model = null;
        this.staticModel = null;
        this.sequenceLength = 15;
        this.predictionBuffer = [];
        this.smoothingFactor = 0.7;
        this.signClasses = [
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
            'HELLO', 'PLEASE', 'THANK_YOU', 'SORRY', 'YES', 'NO'
        ];
        this.isReady = false;
    }

    async init() {
        try {
            // Load pre-trained models
            console.log('Loading LSTM model for dynamic gestures...');
            this.model = await tf.loadLayersModel('./models/asl_lstm_model.json');
            
            console.log('Loading CNN model for static signs...');
            this.staticModel = await tf.loadLayersModel('./models/asl_static_model.json');
            
            // Warm up models
            await this.warmUp();
            
            this.isReady = true;
            console.log('Sign recognition models loaded successfully');
        } catch (error) {
            console.error('Failed to load models:', error);
            // Fallback to dummy model for development
            this.createDummyModel();
        }
    }

    async warmUp() {
        // Run dummy predictions to initialize GPU kernels
        const dummySequence = tf.zeros([1, this.sequenceLength, 63]);
        const dummyStatic = tf.zeros([1, 63]);
        
        await this.model.predict(dummySequence).data();
        await this.staticModel.predict(dummyStatic).data();
        
        dummySequence.dispose();
        dummyStatic.dispose();
    }

    createDummyModel() {
        // Create a simple dummy model for development/testing
        this.model = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [this.sequenceLength, 63], units: 64, activation: 'relu' }),
                tf.layers.dense({ units: this.signClasses.length, activation: 'softmax' })
            ]
        });
        
        this.staticModel = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [63], units: 64, activation: 'relu' }),
                tf.layers.dense({ units: this.signClasses.length, activation: 'softmax' })
            ]
        });
        
        this.isReady = true;
        console.log('Using dummy models for development');
    }

    predict(landmarks, frameBuffer = null) {
        if (!this.isReady || !landmarks) {
            return { class: 'NO_HAND', confidence: 0, corrections: [] };
        }

        try {
            let prediction;
            
            if (frameBuffer && frameBuffer.length >= this.sequenceLength) {
                // Dynamic gesture recognition
                prediction = this.predictDynamic(frameBuffer);
            } else {
                // Static sign recognition
                prediction = this.predictStatic(landmarks);
            }

            // Apply temporal smoothing
            return this.smoothPrediction(prediction);
        } catch (error) {
            console.error('Prediction error:', error);
            return { class: 'ERROR', confidence: 0, corrections: [] };
        }
    }

    predictStatic(landmarks) {
        const features = this.extractStaticFeatures(landmarks);
        const tensorInput = tf.tensor2d([features]);
        
        const predictions = this.staticModel.predict(tensorInput);
        const probabilities = predictions.dataSync();
        
        tensorInput.dispose();
        predictions.dispose();
        
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const confidence = probabilities[maxIndex];
        
        return {
            class: this.signClasses[maxIndex],
            confidence: confidence,
            probabilities: Array.from(probabilities),
            corrections: this.generateCorrections(features, maxIndex, confidence)
        };
    }

    predictDynamic(frameBuffer) {
        const sequence = this.prepareSequence(frameBuffer);
        const tensorInput = tf.tensor3d([sequence]);
        
        const predictions = this.model.predict(tensorInput);
        const probabilities = predictions.dataSync();
        
        tensorInput.dispose();
        predictions.dispose();
        
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const confidence = probabilities[maxIndex];
        
        return {
            class: this.signClasses[maxIndex],
            confidence: confidence,
            probabilities: Array.from(probabilities),
            corrections: this.generateCorrections(sequence, maxIndex, confidence)
        };
    }

    extractStaticFeatures(landmarks) {
        if (!landmarks || landmarks.length !== 21) {
            return new Array(63).fill(0);
        }
        
        const features = [];
        
        // Basic landmark positions
        landmarks.forEach(point => {
            features.push(point.x, point.y, point.z);
        });
        
        return features;
    }

    prepareSequence(frameBuffer) {
        const sequence = [];
        const step = Math.max(1, Math.floor(frameBuffer.length / this.sequenceLength));
        
        for (let i = 0; i < this.sequenceLength; i++) {
            const frameIndex = Math.min(i * step, frameBuffer.length - 1);
            const frame = frameBuffer[frameIndex];
            
            if (frame && frame.landmarks) {
                sequence.push(this.extractStaticFeatures(frame.landmarks));
            } else {
                sequence.push(new Array(63).fill(0));
            }
        }
        
        return sequence;
    }

    smoothPrediction(prediction) {
        this.predictionBuffer.push(prediction);
        
        if (this.predictionBuffer.length > 5) {
            this.predictionBuffer.shift();
        }
        
        // Weighted average of recent predictions
        const weights = [0.4, 0.3, 0.2, 0.1];
        let weightedConfidence = 0;
        let dominantClass = prediction.class;
        
        for (let i = 0; i < Math.min(this.predictionBuffer.length, weights.length); i++) {
            const pred = this.predictionBuffer[this.predictionBuffer.length - 1 - i];
            weightedConfidence += pred.confidence * weights[i];
        }
        
        return {
            ...prediction,
            confidence: weightedConfidence,
            smoothed: true
        };
    }

    generateCorrections(features, predictedIndex, confidence) {
        const corrections = [];
        
        if (confidence < 0.6) {
            corrections.push('Hold your hand steady and ensure good lighting');
        }
        
        if (confidence < 0.4) {
            corrections.push('Make sure your hand is fully visible to the camera');
            corrections.push('Check that your hand shape matches the target sign');
        }
        
        // Add specific corrections based on the predicted sign
        const predictedSign = this.signClasses[predictedIndex];
        corrections.push(...this.getSignSpecificCorrections(predictedSign, features));
        
        return corrections;
    }

    getSignSpecificCorrections(sign, features) {
        const corrections = [];
        
        // Example corrections for common signs
        switch (sign) {
            case 'A':
                corrections.push('Make a fist with thumb beside your fingers');
                break;
            case 'B':
                corrections.push('Keep fingers straight up, thumb tucked in');
                break;
            case 'C':
                corrections.push('Curve your hand like holding a cup');
                break;
            // Add more sign-specific corrections
        }
        
        return corrections;
    }

    dispose() {
        if (this.model) {
            this.model.dispose();
        }
        if (this.staticModel) {
            this.staticModel.dispose();
        }
    }
}
