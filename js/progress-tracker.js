export class ProgressTracker {
    constructor() {
        this.progressData = {
            signsLearned: new Set(),
            practiceAttempts: [],
            testResults: [],
            practiceTime: 0,
            startTime: null,
            dailyProgress: {},
            accuracy: {
                overall: 0,
                bySign: {}
            }
        };
        this.loadProgress();
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('asl-tutor-progress');
            if (saved) {
                const data = JSON.parse(saved);
                this.progressData = {
                    ...this.progressData,
                    ...data,
                    signsLearned: new Set(data.signsLearned || [])
                };
            }
        } catch (error) {
            console.warn('Could not load progress data:', error);
        }
    }

    saveProgress() {
        try {
            const dataToSave = {
                ...this.progressData,
                signsLearned: Array.from(this.progressData.signsLearned)
            };
            localStorage.setItem('asl-tutor-progress', JSON.stringify(dataToSave));
        } catch (error) {
            console.warn('Could not save progress data:', error);
        }
    }

    recordPracticeAttempt(prediction) {
        const attempt = {
            timestamp: Date.now(),
            predictedSign: prediction.class,
            confidence: prediction.confidence,
            targetSign: this.getCurrentTargetSign(),
            isCorrect: this.isCorrectPrediction(prediction)
        };

        this.progressData.practiceAttempts.push(attempt);
        
        // Mark sign as learned if consistently correct
        if (attempt.isCorrect && prediction.confidence > 0.8) {
            this.progressData.signsLearned.add(attempt.targetSign);
        }

        // Update accuracy
        this.updateAccuracy();
        
        // Save progress
        this.saveProgress();
    }

    recordTestResult(questionSign, prediction, timeSpent) {
        const result = {
            timestamp: Date.now(),
            questionSign: questionSign,
            userAnswer: prediction.class,
            confidence: prediction.confidence,
            isCorrect: questionSign === prediction.class && prediction.confidence > 0.7,
            timeSpent: timeSpent
        };

        this.progressData.testResults.push(result);
        this.updateAccuracy();
        this.saveProgress();
        
        return result;
    }

    startPracticeSession() {
        this.startTime = Date.now();
    }

    endPracticeSession() {
        if (this.startTime) {
            const sessionTime = Date.now() - this.startTime;
            this.progressData.practiceTime += Math.round(sessionTime / 1000 / 60); // Convert to minutes
            this.startTime = null;
            this.saveProgress();
        }
    }

    updateAccuracy() {
        // Overall accuracy from recent attempts
        const recentAttempts = this.progressData.practiceAttempts.slice(-50);
        const correctAttempts = recentAttempts.filter(attempt => attempt.isCorrect);
        
        this.progressData.accuracy.overall = recentAttempts.length > 0 
            ? correctAttempts.length / recentAttempts.length 
            : 0;

        // Accuracy by sign
        const signGroups = {};
        recentAttempts.forEach(attempt => {
            if (!signGroups[attempt.targetSign]) {
                signGroups[attempt.targetSign] = { total: 0, correct: 0 };
            }
            signGroups[attempt.targetSign].total++;
            if (attempt.isCorrect) {
                signGroups[attempt.targetSign].correct++;
            }
        });

        this.progressData.accuracy.bySign = {};
        Object.keys(signGroups).forEach(sign => {
            const group = signGroups[sign];
            this.progressData.accuracy.bySign[sign] = group.correct / group.total;
        });
    }

    getCurrentTargetSign() {
        // Get current target from UI or lesson manager
        const targetElement = document.getElementById('target-sign');
        return targetElement ? targetElement.textContent : 'UNKNOWN';
    }

    isCorrectPrediction(prediction) {
        const targetSign = this.getCurrentTargetSign();
        return prediction.class === targetSign && prediction.confidence > 0.6;
    }

    updateDisplay() {
        // Update signs learned
        const signsLearnedElement = document.getElementById('signs-learned');
        if (signsLearnedElement) {
            signsLearnedElement.textContent = this.progressData.signsLearned.size;
        }

        // Update overall accuracy
        const accuracyElement = document.getElementById('overall-accuracy');
        if (accuracyElement) {
            const percentage = Math.round(this.progressData.accuracy.overall * 100);
            accuracyElement.textContent = `${percentage}%`;
        }

        // Update practice time
        const practiceTimeElement = document.getElementById('practice-time');
        if (practiceTimeElement) {
            practiceTimeElement.textContent = `${this.progressData.practiceTime} min`;
        }

        // Update progress chart if element exists
        this.updateProgressChart();
    }

    updateProgressChart() {
        const chartCanvas = document.getElementById('progress-chart');
        if (!chartCanvas) return;

        const ctx = chartCanvas.getContext('2d');
        const width = chartCanvas.width = chartCanvas.offsetWidth;
        const height = chartCanvas.height = 200;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Simple line chart showing accuracy over time
        const recent = this.progressData.practiceAttempts.slice(-20);
        if (recent.length < 2) return;

        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const stepX = width / (recent.length - 1);
        const stepY = height - 40;

        recent.forEach((attempt, index) => {
            const x = index * stepX;
            const y = height - 20 - (attempt.confidence * stepY);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Add labels
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.fillText('Confidence over time', 10, 20);
        ctx.fillText('0%', 5, height - 5);
        ctx.fillText('100%', 5, 25);
    }

    getWeeklyProgress() {
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const weeklyAttempts = this.progressData.practiceAttempts.filter(
            attempt => attempt.timestamp > weekAgo
        );
        
        return {
            totalAttempts: weeklyAttempts.length,
            correctAttempts: weeklyAttempts.filter(a => a.isCorrect).length,
            uniqueSigns: new Set(weeklyAttempts.map(a => a.targetSign)).size,
            averageConfidence: weeklyAttempts.reduce((sum, a) => sum + a.confidence, 0) / weeklyAttempts.length || 0
        };
    }

    exportProgress() {
        return {
            ...this.progressData,
            signsLearned: Array.from(this.progressData.signsLearned),
            exportDate: new Date().toISOString()
        };
    }

    reset() {
        this.progressData = {
            signsLearned: new Set(),
            practiceAttempts: [],
            testResults: [],
            practiceTime: 0,
            startTime: null,
            dailyProgress: {},
            accuracy: { overall: 0, bySign: {} }
        };
        this.saveProgress();
    }
}
