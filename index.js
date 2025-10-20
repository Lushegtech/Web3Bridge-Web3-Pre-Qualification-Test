class QuizGame {
    constructor() {
        this.currentTopic = 'mixed';
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.timeLeft = 30;
        this.timerInterval = null;
        this.selectedAnswer = null;
        this.gameStartTime = null;
        this.gameEndTime = null;
        this.questionStartTime = null;
        this.adaptiveDifficulty = true;
        this.speedBonus = 0;
        
        this.elements = {
            startScreen: document.getElementById('startScreen'),
            quizScreen: document.getElementById('quizScreen'),
            resultsScreen: document.getElementById('resultsScreen'),
            leaderboardScreen: document.getElementById('leaderboardScreen'),
            
                topicSelect: document.getElementById('topicSelect'),
            startBtn: document.getElementById('startBtn'),
            leaderboardBtn: document.getElementById('leaderboardBtn'),
            
            currentQuestion: document.getElementById('currentQuestion'),
            totalQuestions: document.getElementById('totalQuestions'),
            progressFill: document.getElementById('progressFill'),
            timerValue: document.getElementById('timerValue'),
            scoreValue: document.getElementById('scoreValue'),
            questionTitle: document.getElementById('quiz-title'),
            answersContainer: document.getElementById('answersContainer'),
            skipBtn: document.getElementById('skipBtn'),
            submitBtn: document.getElementById('submitBtn'),
            feedback: document.getElementById('feedback'),
            feedbackMessage: document.getElementById('feedbackMessage'),
            nextBtn: document.getElementById('nextBtn'),
            
            finalScore: document.getElementById('finalScore'),
            finalTotal: document.getElementById('finalTotal'),
            percentageScore: document.getElementById('percentageScore'),
            performanceMessage: document.getElementById('performanceMessage'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            viewLeaderboardBtn: document.getElementById('viewLeaderboardBtn'),
            homeBtn: document.getElementById('homeBtn'),

            leaderboardTopic: document.getElementById('leaderboardTopic'),
            leaderboardList: document.getElementById('leaderboardList'),
            backToHomeBtn: document.getElementById('backToHomeBtn'),
            
            errorToast: document.getElementById('errorToast'),
            errorMessage: document.getElementById('errorMessage'),
            closeToast: document.getElementById('closeToast')
        };
        
        this.init();
    }
    
    init() {
        try {
            this.bindEvents();
            this.showScreen('start');
            this.loadTopics();
            this.loadLeaderboard();
        } catch (error) {
            this.showError('Failed to initialize game: ' + error.message);
        }
    }
    
    loadTopics() {
        try {
            const topics = QuizDataManager.getTopics();
            const select = this.elements.topicSelect;
            
            select.innerHTML = '';
            
            topics.forEach(topic => {
                const option = document.createElement('option');
                option.value = topic.id;
                
                let displayName = topic.name;
                if (topic.id === 'mixed') {
                    displayName = 'Surprise Me! (Perfect for first-timers)';
                } else if (topic.id === 'general') {
                    displayName = 'The Classics (Timeless brain food)';
                } else if (topic.id === 'science') {
                    displayName = 'Science & Nature (Mind-expanding)';
                } else if (topic.id === 'history') {
                    displayName = 'History (Time travel edition)';
                } else if (topic.id === 'geography') {
                    displayName = 'Geography (World explorer mode)';
                } else if (topic.id === 'sports') {
                    displayName = 'Sports (Athletic brain workout)';
                } else if (topic.id === 'entertainment') {
                    displayName = 'Entertainment (Pop culture fun)';
                }
                
                option.textContent = displayName;
                select.appendChild(option);
            });
            
        } catch (error) {
            console.warn('Failed to load topics, using defaults');
        }
    }
    
    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.startQuiz());
        this.elements.leaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        
        this.elements.skipBtn.addEventListener('click', () => this.skipQuestion());
        this.elements.submitBtn.addEventListener('click', () => this.submitAnswer());
        this.elements.nextBtn.addEventListener('click', () => this.nextQuestion());
        
        this.elements.playAgainBtn.addEventListener('click', () => this.restartQuiz());
        this.elements.viewLeaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        this.elements.homeBtn.addEventListener('click', () => this.goHome());
        
        this.elements.leaderboardTopic.addEventListener('change', () => this.filterLeaderboard());
        this.elements.backToHomeBtn.addEventListener('click', () => this.goHome());
        
        this.elements.closeToast.addEventListener('click', () => this.hideError());
        
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }
    
    handleKeyPress(e) {
        if (this.getCurrentScreen() === 'quiz') {
            if (e.key >= '1' && e.key <= '4') {
                const answerIndex = parseInt(e.key) - 1;
                this.selectAnswer(answerIndex);
            } else if (e.key === 'Enter' && !this.elements.submitBtn.disabled) {
                this.submitAnswer();
            } else if (e.key === ' ' && this.elements.feedback.hidden === false) {
                e.preventDefault();
                this.nextQuestion();
            }
        }
    }
    
    getCurrentScreen() {
        if (!this.elements.startScreen.hidden) return 'start';
        if (!this.elements.quizScreen.hidden) return 'quiz';
        if (!this.elements.resultsScreen.hidden) return 'results';
        if (!this.elements.leaderboardScreen.hidden) return 'leaderboard';
        return null;
    }
    
    showScreen(screenName) {
        Object.values(this.elements).forEach(element => {
            if (element && element.classList && element.classList.contains('screen')) {
                element.hidden = true;
            }
        });
        
        const screenMap = {
            'start': this.elements.startScreen,
            'quiz': this.elements.quizScreen,
            'results': this.elements.resultsScreen,
            'leaderboard': this.elements.leaderboardScreen
        };
        
        if (screenMap[screenName]) {
            screenMap[screenName].hidden = false;
            screenMap[screenName].focus();
        }
    }
    
    async startQuiz() {
        try {
            this.currentTopic = this.elements.topicSelect.value;
            
            this.elements.startBtn.disabled = true;
            this.elements.startBtn.textContent = 'Loading...';
            
            this.questions = await QuizDataManager.getAdaptiveQuestionSet(this.currentTopic, 6);
            
            this.currentQuestionIndex = 0;
            this.score = 0;
            this.speedBonus = 0;
            this.gameStartTime = new Date();
            
            this.elements.totalQuestions.textContent = this.questions.length;
            this.elements.scoreValue.textContent = '0';
            
            this.showScreen('quiz');
            this.displayQuestion();
            
            this.elements.startBtn.disabled = false;
            this.elements.startBtn.textContent = 'Let\'s Go!';
            
        } catch (error) {
            this.showError('Failed to start quiz: ' + error.message);
            this.elements.startBtn.disabled = false;
            this.elements.startBtn.textContent = 'Let\'s Go!';
        }
    }
    
    displayQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.endQuiz();
            return;
        }
        
        const question = this.questions[this.currentQuestionIndex];
        this.questionStartTime = new Date();
        
        this.elements.currentQuestion.textContent = this.currentQuestionIndex + 1;
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        this.elements.progressFill.style.width = `${progress}%`;
        
        this.elements.questionTitle.textContent = question.question;
        
        if (question.metadata) {
            const difficultyText = this.getDifficultyText(question.metadata.difficulty);
            this.elements.questionTitle.innerHTML = `
                ${question.question}
                <span class="question__difficulty" data-difficulty="${question.metadata.difficulty}">${difficultyText}</span>
            `;
        }
        
        this.elements.answersContainer.innerHTML = '';
        this.selectedAnswer = null;
        this.elements.submitBtn.disabled = true;
        
        question.options.forEach((option, index) => {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer';
            
            const label = question.options.length === 2 ? (index + 1) : String.fromCharCode(65 + index);
            
            answerDiv.innerHTML = `
                <input type="radio" id="answer${index}" name="answer" value="${index}" class="answer__input">
                <label for="answer${index}" class="answer__label">
                    <span class="answer__letter">${label}</span>
                    <span class="answer__text">${option}</span>
                </label>
            `;
            
            const input = answerDiv.querySelector('input');
            input.addEventListener('change', () => this.selectAnswer(index));
            
            this.elements.answersContainer.appendChild(answerDiv);
        });
        
        this.elements.feedback.hidden = true;
        
        const timeLimit = this.getQuestionTimeLimit(question);
        this.startTimer(timeLimit);
    }
    
    getDifficultyText(difficulty) {
        const levels = {
            1: "Easy",
            2: "Easy+", 
            3: "Medium",
            4: "Hard",
            5: "Expert"
        };
        return levels[difficulty] || "Medium";
    }
    
    getQuestionTimeLimit(question) {
        if (!question.metadata) return 30;
        
        const baseTime = {
            'true_false': 15,
            'multiple_choice': 25,
            'type_in': 35
        };
        
        const format = question.metadata.format || 'multiple_choice';
        const difficulty = question.metadata.difficulty || 3;
        const timeToRead = question.metadata.timeToRead || 3;
        
        return Math.max(10, baseTime[format] + (timeToRead * 2) + (difficulty * 2));
    }
    
    selectAnswer(index) {
        this.selectedAnswer = index;
        this.elements.submitBtn.disabled = false;
        
        const answers = this.elements.answersContainer.querySelectorAll('.answer');
        answers.forEach((answer, i) => {
            answer.classList.toggle('answer--selected', i === index);
        });
    }
    
    startTimer(timeLimit = 30) {
        this.timeLeft = timeLimit;
        this.maxTime = timeLimit;
        this.elements.timerValue.textContent = this.timeLeft;
        
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.elements.timerValue.textContent = this.timeLeft;
            
            const warningThreshold = Math.ceil(this.maxTime * 0.25);
            this.elements.timerValue.classList.toggle('quiz-timer__value--warning', this.timeLeft <= warningThreshold);
            
            if (this.timeLeft <= 0) {
                this.timeUp();
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.elements.timerValue.classList.remove('quiz-timer__value--warning');
    }
    
    timeUp() {
        this.stopTimer();
        this.showFeedback(false, "Oops, time's up! No worries though - here's what we were looking for.");
    }
    
    skipQuestion() {
        this.stopTimer();
        this.showFeedback(false, "No problem! Sometimes it's better to move on. Here's the answer for next time.");
    }
    
    submitAnswer() {
        if (this.selectedAnswer === null) return;
        
        this.stopTimer();
        const question = this.questions[this.currentQuestionIndex];
        const isCorrect = this.selectedAnswer === question.correct;
        const timeSpent = this.maxTime - this.timeLeft;
        
        let points = 0;
        if (isCorrect) {
            points = 1;
            const speedThreshold = this.maxTime * 0.5; 
            if (timeSpent < speedThreshold) {
                const speedBonus = Math.round((speedThreshold - timeSpent) / speedThreshold * 50); // Up to 50 bonus points
                this.speedBonus += speedBonus;
                points += speedBonus / 100; // Convert to fractional points
            }
            this.score += points;
            this.elements.scoreValue.textContent = Math.round(this.score);
        }
        
        if (question.metadata) {
            QuizDataManager.updatePlayerPerformance(isCorrect, question, timeSpent, this.maxTime);
        }
        
        this.showFeedback(isCorrect, question.explanation, timeSpent, points);
    }
    
    showFeedback(isCorrect, explanation, timeSpent = 0, points = 0) {
        const question = this.questions[this.currentQuestionIndex];
        
        const answers = this.elements.answersContainer.querySelectorAll('.answer');
        answers.forEach((answer, index) => {
            const input = answer.querySelector('input');
            if (index === question.correct) {
                answer.classList.add('answer--correct');
            } else if (index === this.selectedAnswer && !isCorrect) {
                answer.classList.add('answer--incorrect');
            }
            input.disabled = true;
        });
        
        let feedbackText = '';
        if (isCorrect) {
            const encouragements = ["Nice one!", "Nailed it!", "You got it!", "Exactly right!", "Well done!"];
            const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
            feedbackText = `${randomEncouragement} ${explanation}`;
            if (timeSpent > 0 && timeSpent < (this.maxTime * 0.5)) {
                feedbackText += ` ⚡ Lightning fast! +${Math.round((points - 1) * 100)} bonus points!`;
            }
        } else {
            const softResponses = ["Not quite, but close!", "Almost there!", "Good thinking, but...", "Nice try!"];
            const randomResponse = softResponses[Math.floor(Math.random() * softResponses.length)];
            feedbackText = `${randomResponse} ${explanation}`;
        }
        
        if (question.metadata) {
            const difficultyText = this.getDifficultyText(question.metadata.difficulty);
            const category = question.metadata.category;
            feedbackText += ` (${difficultyText} ${category})`;
        }
        
        this.elements.feedbackMessage.textContent = feedbackText;
        this.elements.feedback.hidden = false;
        this.elements.feedback.classList.toggle('feedback--correct', isCorrect);
        this.elements.feedback.classList.toggle('feedback--incorrect', !isCorrect);
        
        this.elements.skipBtn.disabled = true;
        this.elements.submitBtn.disabled = true;
        
        this.elements.nextBtn.focus();
    }
    
    nextQuestion() {
        this.currentQuestionIndex++;
        
        this.elements.skipBtn.disabled = false;
        this.elements.submitBtn.disabled = true;
        
        const answers = this.elements.answersContainer.querySelectorAll('.answer');
        answers.forEach(answer => {
            answer.classList.remove('answer--selected', 'answer--correct', 'answer--incorrect');
            answer.querySelector('input').disabled = false;
        });
        
        this.displayQuestion();
    }
    
    endQuiz() {
        this.gameEndTime = new Date();
        this.showResults();
        this.saveScore();
    }
    
    showResults() {
        const percentage = Math.round((this.score / this.questions.length) * 100);
        
        this.elements.finalScore.textContent = this.score;
        this.elements.finalTotal.textContent = this.questions.length;
        this.elements.percentageScore.textContent = `${percentage}%`;
        
        let message = '';
        if (percentage >= 90) {
            const masterMessages = [
                'Wow! You absolutely crushed it!',
                'Quiz master level achieved!',
                'That was incredible! You\'re on fire!',
                'Absolutely brilliant performance!'
            ];
            message = masterMessages[Math.floor(Math.random() * masterMessages.length)];
        } else if (percentage >= 70) {
            const goodMessages = [
                'Really solid work! You\'ve got this!',
                'Nice job! Your brain is clearly warmed up!',
                'Great stuff! You know your way around trivia!',
                'Well played! That was impressive!'
            ];
            message = goodMessages[Math.floor(Math.random() * goodMessages.length)];
        } else if (percentage >= 50) {
            const okayMessages = [
                'Not bad at all! You\'re getting the hang of it!',
                'Good foundation! A few more rounds and you\'ll be unstoppable!',
                'Solid effort! Every expert was once a beginner!',
                'Nice work! You\'re building those brain muscles!'
            ];
            message = okayMessages[Math.floor(Math.random() * okayMessages.length)];
        } else {
            const encouragingMessages = [
                'Hey, everyone starts somewhere! You\'ve got this!',
                'Great first attempt! Ready to give it another shot?',
                'No worries! The best way to learn is by doing!',
                'Nice try! Every question teaches us something new!'
            ];
            message = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
        }
        
        this.elements.performanceMessage.textContent = message;
        this.showScreen('results');
    }
    
    saveScore() {
        try {
            const gameData = {
                topic: this.currentTopic,
                score: this.score,
                total: this.questions.length,
                percentage: Math.round((this.score / this.questions.length) * 100),
                date: new Date().toISOString(),
                duration: this.gameEndTime - this.gameStartTime
            };
            
            const scores = this.getStoredScores();
            scores.push(gameData);
            
            const topicScores = scores.filter(s => s.topic === this.currentTopic)
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 50);
            
            const otherScores = scores.filter(s => s.topic !== this.currentTopic);
            const updatedScores = [...otherScores, ...topicScores];
            
            localStorage.setItem('quizmaster-scores', JSON.stringify(updatedScores));
        } catch (error) {
            console.warn('Failed to save score:', error);
        }
    }
    
    getStoredScores() {
        try {
            const stored = localStorage.getItem('quizmaster-scores');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Failed to load stored scores:', error);
            return [];
        }
    }
    
    showLeaderboard() {
        this.loadLeaderboard();
        this.showScreen('leaderboard');
    }
    
    loadLeaderboard() {
        const scores = this.getStoredScores();
        const selectedTopic = this.elements.leaderboardTopic.value;
        
        let filteredScores = scores;
        if (selectedTopic !== 'all') {
            filteredScores = scores.filter(score => score.topic === selectedTopic);
        }
        
        filteredScores.sort((a, b) => {
            if (b.percentage !== a.percentage) {
                return b.percentage - a.percentage;
            }
            return new Date(b.date) - new Date(a.date);
        });
        
        this.displayLeaderboard(filteredScores.slice(0, 10));
    }
    
    displayLeaderboard(scores) {
        if (scores.length === 0) {
            this.elements.leaderboardList.innerHTML = '<p class="leaderboard__empty">No scores recorded yet. Play a quiz to get started!</p>';
            return;
        }
        
        const leaderboardHTML = scores.map((score, index) => {
            const date = new Date(score.date).toLocaleDateString();
            const topicName = this.getTopicDisplayName(score.topic);
            const duration = Math.round(score.duration / 1000);
            
            return `
                <div class="leaderboard__entry">
                    <div class="leaderboard__rank">${index + 1}</div>
                    <div class="leaderboard__details">
                        <div class="leaderboard__score">${score.percentage}%</div>
                        <div class="leaderboard__meta">
                            <span class="leaderboard__topic">${topicName}</span>
                            <span class="leaderboard__date">${date}</span>
                            <span class="leaderboard__duration">${duration}s</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.elements.leaderboardList.innerHTML = leaderboardHTML;
    }
    
    filterLeaderboard() {
        this.loadLeaderboard();
    }
    
    getTopicDisplayName(topicId) {
        const topicMap = {
            'mixed': 'Mixed Knowledge',
            'general': 'General Knowledge',
            'science': 'Science & Nature',
            'history': 'History',
            'geography': 'Geography',
            'sports': 'Sports',
            'entertainment': 'Entertainment'
        };
        return topicMap[topicId] || topicId;
    }
    
    restartQuiz() {
        this.startQuiz();
    }
    
    goHome() {
        this.showScreen('start');
    }
    
    showError(message) {
        const friendlyMessage = message.includes('Failed to') 
            ? `Oops! Something didn't work quite right. Mind giving it another try?`
            : `Hmm, that's odd. ${message} Want to try again?`;
            
        this.elements.errorMessage.textContent = friendlyMessage;
        this.elements.errorToast.hidden = false;
        
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }
    
    hideError() {
        this.elements.errorToast.hidden = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        new QuizGame();
    } catch (error) {
        console.error('Failed to initialize QuizMaster:', error);
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center; font-family: system-ui;">
                <h1>QuizMaster</h1>
                <p>Sorry, the game failed to load. Please refresh the page and try again.</p>
                <p style="color: #666; font-size: 0.875rem;">Error: ${error.message}</p>
            </div>
        `;
    }
});