import { HandTracker } from './hand-tracker.js';
import { SignRecognizer } from './sign-recognizer.js';
import { LessonManager } from './lesson-manager.js';
import { UIController } from './ui-controller.js';
import { ProgressTracker } from './progress-tracker.js';

class ASLTutorApp {
    constructor() {
        this.handTracker = null;
        this.signRecognizer = null;
        this.lessonManager = null;
        this.uiController = null;
        this.progressTracker = null;
        this.currentMode = 'learn';
        this.isInitialized = false;
    }

    async init() {
        try {
            this.showLoading('Initializing AI models...');
            
            // Initialize components
            this.uiController = new UIController();
            this.progressTracker = new ProgressTracker();
            this.lessonManager = new LessonManager();
            
            // Load AI models
            this.showLoading('Loading hand tracking model...');
            this.handTracker = new HandTracker();
            await this.handTracker.init();
            
            this.showLoading('Loading sign recognition model...');
            this.signRecognizer = new SignRecognizer();
            await this.signRecognizer.init();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI
            await this.lessonManager.init();
            this.uiController.init();
            
            this.hideLoading();
            this.isInitialized = true;
            
            console.log('ASL Tutor initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ASL Tutor:', error);
            this.showError('Failed to load application. Please refresh and try again.');
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.view);
            });
        });

        // Learn mode controls
        document.getElementById('prev-sign').addEventListener('click', () => {
            this.lessonManager.previousSign();
        });
        
        document.getElementById('next-sign').addEventListener('click', () => {
            this.lessonManager.nextSign();
        });
        
        document.getElementById('practice-sign').addEventListener('click', () => {
            this.switchMode('practice');
        });
    }

    async switchMode(mode) {
        if (!this.isInitialized) return;
        
        this.currentMode = mode;
        this.uiController.showView(mode);
        
        // Stop any running processes
        this.stopAllTracking();
        
        switch (mode) {
            case 'learn':
                this.lessonManager.updateDisplay();
                break;
            case 'practice':
                await this.startPracticeMode();
                break;
            case 'test':
                await this.startTestMode();
                break;
            case 'progress':
                this.progressTracker.updateDisplay();
                break;
        }
    }

    async startPracticeMode() {
        const webcam = document.getElementById('webcam');
        const canvas = document.getElementById('output-canvas');
        
        try {
            await this.handTracker.startCamera(webcam, canvas);
            this.handTracker.onResults = (results) => {
                this.handlePracticeResults(results);
            };
        } catch (error) {
            console.error('Failed to start practice mode:', error);
            this.uiController.showFeedback('Camera access denied. Please allow camera access.', 'error');
        }
    }

    async startTestMode() {
        const webcam = document.getElementById('test-webcam');
        const canvas = document.getElementById('test-canvas');
        
        try {
            await this.handTracker.startCamera(webcam, canvas);
            this.handTracker.onResults = (results) => {
                this.handleTestResults(results);
            };
        } catch (error) {
            console.error('Failed to start test mode:', error);
        }
    }

    handlePracticeResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const prediction = this.signRecognizer.predict(landmarks);
            
            this.uiController.updatePracticeFeedback(prediction);
            this.progressTracker.recordPracticeAttempt(prediction);
        }
    }

    handleTestResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const prediction = this.signRecognizer.predict(landmarks);
            
            this.uiController.updateTestFeedback(prediction);
        }
    }

    stopAllTracking() {
        if (this.handTracker) {
            this.handTracker.stop();
        }
    }

    showLoading(message) {
        document.getElementById('loading-text').textContent = message;
        document.getElementById('loading-screen').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-screen').style.display = 'none';
    }

    showError(message) {
        this.hideLoading();
        alert(message); // Replace with better error UI
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ASLTutorApp();
    app.init();
});
