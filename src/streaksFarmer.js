class StreaksFarmer {
    constructor(auth, axios) {
        this.auth = auth;
        this.axios = axios;
        this.streaksGained = 0;
        this.requestCount = 0;
        this.errorCount = 0;
        this.processedDates = new Set();
    }

    async farmStreaks(loops) {
        console.log(`Starting Streaks farming for ${loops} loops...`);
        const startTime = Date.now();
        
        try {
            const streakData = await this.getStreakData();
            const streakStartDate = streakData.longestStreak?.startDate;
            
            if (!streakStartDate) {
                throw new Error('No streak data found');
            }

            for (let i = 0; i < loops; i++) {
                try {
                    const targetDate = this.generateDateBeforeStreak(streakStartDate, i + 1);
                    await this.performStreakRequest(targetDate);
                    this.streaksGained++;
                    this.requestCount++;
                    
                    if (i % 5 === 0) {
                        console.log(`Streaks Progress: ${i}/${loops} | Streaks Gained: ${this.streaksGained}`);
                    }
                    
                    await this.delay(1000);
                } catch (error) {
                    this.errorCount++;
                    console.error(`Streak Request ${i} failed:`, error.message);
                    await this.delay(2000);
                }
            }
        } catch (error) {
            console.error('Streaks farming initialization failed:', error.message);
            return null;
        }
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        return {
            streaksGained: this.streaksGained,
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            duration: duration
        };
    }

    async getStreakData() {
        const userId = this.auth.getUserId();
        const url = `https://www.duolingo.com/2017-06-30/users/${userId}?fields=streakData`;
        
        const response = await this.axios.get(url, {
            headers: this.auth.getHeaders(),
            timeout: 10000
        });

        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.data.streakData || {};
    }

    async performStreakRequest(targetDate) {
        const sessionData = await this.createSession();
        if (!sessionData) {
            throw new Error('Failed to create session');
        }

        const completedSession = await this.completeSession(sessionData, targetDate);
        if (!completedSession) {
            throw new Error('Failed to complete session');
        }

        return completedSession;
    }

    async createSession() {
        const url = 'https://www.duolingo.com/2017-06-30/sessions';
        const languages = this.auth.getLanguages();
        
        const payload = {
            challengeTypes: this.getDefaultChallengeTypes(),
            fromLanguage: languages.from,
            learningLanguage: languages.learning,
            isFinalLevel: false,
            isV2: true,
            juicy: true,
            smartTipsVersion: 2,
            type: 'GLOBAL_PRACTICE'
        };

        const response = await this.axios.post(url, payload, {
            headers: this.auth.getHeaders(),
            timeout: 10000
        });

        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.data;
    }

    async completeSession(sessionData, targetDate) {
        const url = `https://www.duolingo.com/2017-06-30/sessions/${sessionData.id}`;
        const targetDateTime = new Date(targetDate);
        const startTime = Math.floor(targetDateTime.getTime() / 1000);
        const endTime = startTime + 112;
        
        const payload = {
            ...sessionData,
            heartsLeft: 0,
            startTime: startTime,
            enableBonusPoints: false,
            endTime: endTime,
            failed: false,
            maxInLessonStreak: 9,
            shouldLearnThings: true
        };

        const response = await this.axios.put(url, payload, {
            headers: this.auth.getHeaders(),
            timeout: 10000
        });

        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.data;
    }

    generateDateBeforeStreak(streakStartDate, daysBack) {
        const startDate = new Date(streakStartDate);
        const targetDate = new Date(startDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
        targetDate.setHours(12, 0, 0, 0);
        return targetDate.toISOString();
    }

    getDefaultChallengeTypes() {
        return [
            'assist', 'characterIntro', 'characterMatch', 'characterPuzzle',
            'characterSelect', 'characterTrace', 'characterWrite',
            'completeReverseTranslation', 'definition', 'dialogue',
            'extendedMatch', 'extendedListenMatch', 'form', 'freeResponse',
            'gapFill', 'judge', 'listen', 'listenComplete', 'listenMatch',
            'match', 'name', 'listenComprehension', 'listenIsolation',
            'listenSpeak', 'listenTap', 'orderTapComplete', 'partialListen',
            'partialReverseTranslate', 'patternTapComplete', 'radioBinary',
            'radioImageSelect', 'radioListenMatch', 'radioListenRecognize',
            'radioSelect', 'readComprehension', 'reverseAssist',
            'sameDifferent', 'select', 'selectPronunciation',
            'selectTranscription', 'svgPuzzle', 'syllableTap',
            'syllableListenTap', 'speak', 'tapCloze', 'tapClozeTable',
            'tapComplete', 'tapCompleteTable', 'tapDescribe', 'translate',
            'transliterate', 'transliterationAssist', 'typeCloze',
            'typeClozeTable', 'typeComplete', 'typeCompleteTable',
            'writeComprehension'
        ];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            streaksGained: this.streaksGained,
            requestCount: this.requestCount,
            errorCount: this.errorCount
        };
    }
}

module.exports = StreaksFarmer;
