export class UIController {
    constructor() {
        this.currentView = 'learn';
        this.feedbackTimeout = null;
    }

    init() {
        this.showView('learn');
        this.setupViewNavigation();
    }

    setupViewNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.updateNavigation(btn.dataset.view);
            });
        });
    }

    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(view => {
            view.classList.remove('active');
        });

        // Show target view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
        }

        this.updateNavigation(viewName);
    }

    updateNavigation(activeView) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === activeView) {
                btn.classList.add('active');
            }
        });
    }

    updatePracticeFeedback(prediction) {
        if (!prediction) return;

        // Update confidence meter
        const confidenceFill = document.getElementById('confidence-fill');
        const confidenceText = document.getElementById('confidence-text');
        
        if (confidenceFill && confidenceText) {
            const percentage = Math.round(prediction.confidence * 100);
            confidenceFill.style.width = `${percentage}%`;
            confidenceText.textContent = `${percentage}%`;
        }

        // Update predicted sign
        const predictedSign = document.getElementById('predicted-sign');
        if (predictedSign) {
            predictedSign.textContent = prediction.class;
            
            // Color code based on confidence
            if (prediction.confidence > 0.8) {
                predictedSign.style.color = 'var(--success-color)';
            } else if (prediction.confidence > 0.5) {
                predictedSign.style.color = 'var(--warning-color)';
            } else {
                predictedSign.style.color = 'var(--error-color)';
            }
        }

        // Update feedback message
        this.updateFeedbackMessage(prediction);

        // Update correction hints
        this.updateCorrectionHints(prediction.corrections || []);
    }

    updateFeedbackMessage(prediction) {
        const feedbackMessage = document.getElementById('feedback-message');
        if (!feedbackMessage) return;

        let message = '';
        let messageClass = '';

        if (prediction.confidence > 0.8) {
            message = 'Great job! ✓';
            messageClass = 'success';
        } else if (prediction.confidence > 0.6) {
            message = 'Good! Try to hold the sign steadier';
            messageClass = 'warning';
        } else if (prediction.confidence > 0.3) {
            message = 'Keep trying! Check your hand position';
            messageClass = 'warning';
        } else {
            message = 'Make sure your hand is visible and in position';
            messageClass = 'error';
        }

        feedbackMessage.textContent = message;
        feedbackMessage.className = `feedback-message ${messageClass}`;
    }

    updateCorrectionHints(corrections) {
        const hintsElement = document.getElementById('correction-hints');
        if (!hintsElement || !corrections.length) {
            if (hintsElement) hintsElement.style.display = 'none';
            return;
        }

        hintsElement.style.display = 'block';
        hintsElement.innerHTML = `
            <h4>💡 Tips for improvement:</h4>
            <ul>
                ${corrections.map(hint => `<li>${hint}</li>`).join('')}
            </ul>
        `;
    }

    updateTestFeedback(prediction) {
        const testResult = document.getElementById('test-result');
        if (!testResult) return;

        // Implementation for test mode feedback
        if (prediction.confidence > 0.7) {
            testResult.innerHTML = `
                <div class="test-success">
                    <h3>✓ Correct!</h3>
                    <p>You signed: ${prediction.class}</p>
                </div>
            `;
        } else {
            testResult.innerHTML = `
                <div class="test-partial">
                    <h3>🤔 Try again</h3>
                    <p>Detected: ${prediction.class} (${Math.round(prediction.confidence * 100)}% confidence)</p>
                </div>
            `;
        }
    }

    showFeedback(message, type = 'info', duration = 3000) {
        // Clear existing timeout
        if (this.feedbackTimeout) {
            clearTimeout(this.feedbackTimeout);
        }

        // Create or update feedback element
        let feedbackElement = document.getElementById('global-feedback');
        if (!feedbackElement) {
            feedbackElement = document.createElement('div');
            feedbackElement.id = 'global-feedback';
            feedbackElement.className = 'global-feedback';
            document.body.appendChild(feedbackElement);
        }

        feedbackElement.textContent = message;
        feedbackElement.className = `global-feedback ${type} show`;

        // Auto-hide after duration
        this.feedbackTimeout = setTimeout(() => {
            feedbackElement.classList.remove('show');
        }, duration);
    }

    updateProgress(current, total) {
        const progressFill = document.getElementById('progress-fill');
        const questionCounter = document.getElementById('question-counter');
        
        if (progressFill) {
            const percentage = (current / total) * 100;
            progressFill.style.width = `${percentage}%`;
        }
        
        if (questionCounter) {
            questionCounter.textContent = `${current} / ${total}`;
        }
    }

    showLoadingState(element, isLoading) {
        if (isLoading) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }

    createErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
                <button class="error-dismiss" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        return errorDiv;
    }
}
