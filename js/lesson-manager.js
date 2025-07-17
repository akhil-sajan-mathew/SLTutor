export class LessonManager {
    constructor() {
        this.signs = [];
        this.currentSignIndex = 0;
        this.currentSign = null;
    }

    async init() {
        // Load sign data
        this.signs = await this.loadSignData();
        this.currentSignIndex = 0;
        this.updateCurrentSign();
    }

    async loadSignData() {
        // Load from JSON file or return default data
        try {
            const response = await fetch('./data/asl-signs.json');
            return await response.json();
        } catch (error) {
            console.warn('Could not load sign data, using defaults');
            return this.getDefaultSigns();
        }
    }

    getDefaultSigns() {
        return [
            {
                id: 'A',
                name: 'Letter A',
                category: 'alphabet',
                description: 'Make a fist with your thumb beside your fingers',
                imageUrl: './assets/signs/A.jpg',
                videoUrl: './assets/signs/A.mp4',
                difficulty: 1,
                keyPoints: [
                    'Close your fingers into a fist',
                    'Place thumb against the side of your index finger',
                    'Keep hand upright'
                ]
            },
            {
                id: 'B',
                name: 'Letter B',
                category: 'alphabet',
                description: 'Hold four fingers straight up, thumb tucked in',
                imageUrl: './assets/signs/B.jpg',
                videoUrl: './assets/signs/B.mp4',
                difficulty: 1,
                keyPoints: [
                    'Extend four fingers straight up',
                    'Keep fingers together',
                    'Tuck thumb against palm'
                ]
            },
            {
                id: 'C',
                name: 'Letter C',
                category: 'alphabet',
                description: 'Curve your hand like holding a cup',
                imageUrl: './assets/signs/C.jpg',
                videoUrl: './assets/signs/C.mp4',
                difficulty: 1,
                keyPoints: [
                    'Curve fingers and thumb',
                    'Form a C shape',
                    'Keep consistent curve'
                ]
            },
            {
                id: 'HELLO',
                name: 'Hello',
                category: 'greetings',
                description: 'Wave your hand side to side',
                imageUrl: './assets/signs/HELLO.jpg',
                videoUrl: './assets/signs/HELLO.mp4',
                difficulty: 2,
                keyPoints: [
                    'Raise hand to shoulder level',
                    'Wave side to side',
                    'Keep fingers together'
                ],
                isDynamic: true
            },
            {
                id: 'THANK_YOU',
                name: 'Thank You',
                category: 'common',
                description: 'Touch chin and move hand forward',
                imageUrl: './assets/signs/THANK_YOU.jpg',
                videoUrl: './assets/signs/THANK_YOU.mp4',
                difficulty: 2,
                keyPoints: [
                    'Touch fingertips to chin',
                    'Move hand forward and down',
                    'Keep palm facing up at end'
                ],
                isDynamic: true
            }
        ];
    }

    updateCurrentSign() {
        if (this.signs.length > 0) {
            this.currentSign = this.signs[this.currentSignIndex];
            this.updateDisplay();
        }
    }

    updateDisplay() {
        if (!this.currentSign) return;

        document.getElementById('current-sign').textContent = this.currentSign.name;
        document.getElementById('sign-description').textContent = this.currentSign.description;
        
        const signImage = document.getElementById('sign-image');
        const signVideo = document.getElementById('sign-video');
        
        if (this.currentSign.isDynamic && this.currentSign.videoUrl) {
            signImage.style.display = 'none';
            signVideo.style.display = 'block';
            signVideo.src = this.currentSign.videoUrl;
            signVideo.loop = true;
            signVideo.play();
        } else {
            signVideo.style.display = 'none';
            signImage.style.display = 'block';
            signImage.src = this.currentSign.imageUrl;
            signImage.alt = `ASL sign for ${this.currentSign.name}`;
        }

        // Update practice mode target if in practice mode
        this.updatePracticeTarget();
    }

    updatePracticeTarget() {
        const targetSign = document.getElementById('target-sign');
        const targetImage = document.getElementById('target-sign-image');
        
        if (targetSign && targetImage && this.currentSign) {
            targetSign.textContent = this.currentSign.name;
            targetImage.src = this.currentSign.imageUrl;
            targetImage.alt = `Target: ${this.currentSign.name}`;
        }
    }

    nextSign() {
        if (this.currentSignIndex < this.signs.length - 1) {
            this.currentSignIndex++;
            this.updateCurrentSign();
        }
    }

    previousSign() {
        if (this.currentSignIndex > 0) {
            this.currentSignIndex--;
            this.updateCurrentSign();
        }
    }

    getCurrentSign() {
        return this.currentSign;
    }

    getSignById(id) {
        return this.signs.find(sign => sign.id === id);
    }

    getSignsByCategory(category) {
        return this.signs.filter(sign => sign.category === category);
    }

    getRandomSign() {
        const randomIndex = Math.floor(Math.random() * this.signs.length);
        return this.signs[randomIndex];
    }
}
