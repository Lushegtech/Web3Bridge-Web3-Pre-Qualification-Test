class QuizAPI {
    constructor() {
        this.cache = new Map();
        this.baseUrl = 'https://opentdb.com/api.php';
        this.categoryMap = {
            'mixed': { id: null, name: 'Mixed Knowledge' },
            'general': { id: 9, name: 'General Knowledge' },
            'science': { id: 17, name: 'Science & Nature' },
            'history': { id: 23, name: 'History' },
            'geography': { id: 22, name: 'Geography' },
            'sports': { id: 21, name: 'Sports' },
            'entertainment': { id: 11, name: 'Entertainment' }
        };
    }

    async loadQuestions(topic = 'mixed', amount = 10) {
        try {
            const cacheKey = `${topic}_${amount}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            let apiUrl = `${this.baseUrl}?amount=${amount}&type=multiple`;
            
            if (topic !== 'mixed' && this.categoryMap[topic]) {
                apiUrl += `&category=${this.categoryMap[topic].id}`;
            }

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.response_code !== 0) {
                throw new Error('No questions available for this category');
            }

            const transformedData = this.transformApiData(data.results, topic);
            
            this.cache.set(cacheKey, transformedData);

            return transformedData;
        } catch (error) {
            console.error('Error loading questions:', error);
            throw new Error('Unable to load quiz questions. Please check your connection and try again.');
        }
    }

    transformApiData(apiResults, topic) {
        return {
            name: this.categoryMap[topic]?.name || 'Mixed Knowledge',
            description: 'Questions from Open Trivia Database',
            questions: apiResults.map((item, index) => {
                const correctAnswer = this.decodeHtml(item.correct_answer);
                const allOptions = [
                    correctAnswer,
                    ...item.incorrect_answers.map(ans => this.decodeHtml(ans))
                ];
                
                const shuffledOptions = this.shuffleArray(allOptions);
                const correctIndex = shuffledOptions.indexOf(correctAnswer);
                
                return {
                    id: index + 1,
                    question: this.decodeHtml(item.question),
                    options: shuffledOptions,
                    correct: correctIndex,
                    explanation: `The correct answer is: ${correctAnswer}. ${this.generateExplanation(item)}`,
                    metadata: {
                        category: this.decodeHtml(item.category),
                        difficulty: this.mapDifficulty(item.difficulty),
                        format: 'multiple_choice',
                        timeToRead: 3,
                        contentLane: 'external',
                        region: 'global'
                    }
                };
            })
        };
    }

    generateExplanation(item) {
        const category = item.category.toLowerCase();
        if (category.includes('history')) {
            return 'This is an important historical fact worth remembering!';
        } else if (category.includes('science')) {
            return 'Science is all about understanding how our world works!';
        } else if (category.includes('geography')) {
            return 'Geography helps us understand our amazing planet!';
        } else if (category.includes('sport')) {
            return 'Sports trivia is always fun to know!';
        } else {
            return 'Every question teaches us something new!';
        }
    }

    mapDifficulty(apiDifficulty) {
        const difficultyMap = {
            'easy': 1,
            'medium': 3,
            'hard': 5
        };
        return difficultyMap[apiDifficulty] || 3;
    }

    decodeHtml(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }

    getTopics() {
        return Object.keys(this.categoryMap).map(key => ({
            id: key,
            name: this.categoryMap[key].name,
            description: key === 'mixed' ? 'Random questions from all categories' : 'Curated questions'
        }));
    }

    async getQuestions(topic) {
        try {
            const topicData = await this.loadQuestions(topic, 10);
            if (!topicData || !topicData.questions) {
                throw new Error(`Topic "${topic}" not found`);
            }
            
            return [...topicData.questions];
        } catch (error) {
            throw error;
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async getAdaptiveQuestionSet(topic, count = 6) {
        try {
            const questions = await this.getQuestions(topic);
            
            if (topic === 'mixed') {
                return this.buildMixedSet(questions, count);
            }
            
            return this.shuffleArray(questions).slice(0, count);
        } catch (error) {
            throw error;
        }
    }

    buildMixedSet(allQuestions, count) {
        const easyQuestions = allQuestions.filter(q => q.metadata?.difficulty <= 2);
        const mediumQuestions = allQuestions.filter(q => q.metadata?.difficulty === 3);
        const hardQuestions = allQuestions.filter(q => q.metadata?.difficulty >= 4);
        
        const selectedQuestions = [];
        
        selectedQuestions.push(...this.shuffleArray(easyQuestions).slice(0, 2));
        
        selectedQuestions.push(...this.shuffleArray(mediumQuestions).slice(0, 3));
        
        if (hardQuestions.length > 0) {
            selectedQuestions.push(...this.shuffleArray(hardQuestions).slice(0, 1));
        }
        
        return selectedQuestions.slice(0, count);
    }
}

class DifficultyManager {
    constructor() {
        this.playerRating = 1200;
        this.recentPerformance = [];
    }
    
    updateRating(correct, questionDifficulty, timeSpent, timeLimit) {
        const speedBonus = timeSpent < (timeLimit * 0.5) ? 1.2 : 1.0;
        const expectedScore = this.getExpectedScore(questionDifficulty);
        const actualScore = correct ? 1 : 0;
        
        const kFactor = 32;
        const ratingChange = kFactor * (actualScore - expectedScore) * speedBonus;
        
        this.playerRating += ratingChange;
        this.playerRating = Math.max(800, Math.min(2400, this.playerRating));
        
        this.recentPerformance.push({ correct, difficulty: questionDifficulty, timeSpent });
        if (this.recentPerformance.length > 10) {
            this.recentPerformance.shift();
        }
    }
    
    getExpectedScore(questionDifficulty) {
        const difficultyRating = 800 + (questionDifficulty * 300);
        const ratingDiff = difficultyRating - this.playerRating;
        return 1 / (1 + Math.pow(10, ratingDiff / 400));
    }
    
    getRating() {
        return Math.round(this.playerRating);
    }
}

const QuizDataManager = {
    api: new QuizAPI(),
    difficultyManager: new DifficultyManager(),
    
    getTopics() {
        return this.api.getTopics();
    },

    async getQuestions(topic) {
        return await this.api.getQuestions(topic);
    },
    
    async getAdaptiveQuestionSet(topic, count = 6) {
        try {
            const questions = await this.getQuestions(topic);
            
            if (topic === 'mixed') {
                return this.buildMixedSet(questions, count);
            }
            
            return this.api.shuffleArray(questions).slice(0, count);
        } catch (error) {
            throw error;
        }
    },
    
    buildMixedSet(allQuestions, count) {
        return this.api.shuffleArray(allQuestions).slice(0, count);
    },
    
    shuffleQuestions(questions) {
        return this.api.shuffleArray(questions);
    },
    
    updatePlayerPerformance(correct, question, timeSpent, timeLimit) {
        if (question.metadata) {
            this.difficultyManager.updateRating(
                correct, 
                question.metadata.difficulty, 
                timeSpent, 
                timeLimit
            );
        }
    },
    
    getPlayerRating() {
        return this.difficultyManager.getRating();
    }
};