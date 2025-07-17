export class ModelLoader {
    constructor() {
        this.models = new Map();
        this.loadingPromises = new Map();
    }

    async loadModel(modelPath, modelName) {
        // Return existing promise if already loading
        if (this.loadingPromises.has(modelName)) {
            return this.loadingPromises.get(modelName);
        }

        // Return cached model if already loaded
        if (this.models.has(modelName)) {
            return this.models.get(modelName);
        }

        const loadPromise = this.doLoadModel(modelPath, modelName);
        this.loadingPromises.set(modelName, loadPromise);
        
        try {
            const model = await loadPromise;
            this.models.set(modelName, model);
            return model;
        } finally {
            this.loadingPromises.delete(modelName);
        }
    }

    async doLoadModel(modelPath, modelName) {
        try {
            console.log(`Loading model: ${modelName} from ${modelPath}`);
            const model = await tf.loadLayersModel(modelPath);
            console.log(`Successfully loaded model: ${modelName}`);
            return model;
        } catch (error) {
            console.warn(`Failed to load model ${modelName}:`, error);
            // Return dummy model for development
            return this.createDummyModel(modelName);
        }
    }

    createDummyModel(modelName) {
        console.log(`Creating dummy model for: ${modelName}`);
        
        if (modelName.includes('lstm') || modelName.includes('dynamic')) {
            // LSTM model for dynamic gestures
            return tf.sequential({
                layers: [
                    tf.layers.lstm({ 
                        inputShape: [15, 63], 
                        units: 64, 
                        returnSequences: false 
                    }),
                    tf.layers.dropout({ rate: 0.3 }),
                    tf.layers.dense({ units: 32, activation: 'relu' }),
                    tf.layers.dense({ units: 32, activation: 'softmax' }) // 32 classes
                ]
            });
        } else {
            // Static model for static signs
            return tf.sequential({
                layers: [
                    tf.layers.dense({ 
                        inputShape: [63], 
                        units: 128, 
                        activation: 'relu' 
                    }),
                    tf.layers.dropout({ rate: 0.3 }),
                    tf.layers.dense({ units: 64, activation: 'relu' }),
                    tf.layers.dense({ units: 32, activation: 'softmax' }) // 32 classes
                ]
            });
        }
    }

    getModel(modelName) {
        return this.models.get(modelName);
    }

    disposeModel(modelName) {
        const model = this.models.get(modelName);
        if (model) {
            model.dispose();
            this.models.delete(modelName);
        }
    }

    disposeAll() {
        this.models.forEach((model, name) => {
            console.log(`Disposing model: ${name}`);
            model.dispose();
        });
        this.models.clear();
        this.loadingPromises.clear();
    }
}
