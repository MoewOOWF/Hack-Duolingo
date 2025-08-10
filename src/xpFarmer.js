class XPFarmer {
    constructor(auth, axios) {
        this.auth = auth;
        this.axios = axios;
        this.xpGained = 0;
        this.requestCount = 0;
        this.errorCount = 0;
    }

    async farmXP(loops) {
        console.log(`Starting XP farming for ${loops} loops...`);
        const startTime = Date.now();
        
        for (let i = 0; i < loops; i++) {
            try {
                await this.performXPRequest();
                this.xpGained += 499;
                this.requestCount++;
                
                if (i % 10 === 0) {
                    console.log(`XP Progress: ${i}/${loops} | XP Gained: ${this.xpGained}`);
                }
                
                await this.delay(500);
            } catch (error) {
                this.errorCount++;
                console.error(`XP Request ${i} failed:`, error.message);
                await this.delay(1000);
            }
        }
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        return {
            xpGained: this.xpGained,
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            duration: duration
        };
    }

    async performXPRequest() {
        const url = 'https://stories.duolingo.com/api2/stories/fr-en-le-passeport/complete';
        const languages = this.auth.getLanguages();
        const nowTs = Math.floor(Date.now() / 1000);
        
        const payload = {
            awardXp: true,
            completedBonusChallenge: true,
            fromLanguage: languages.from,
            learningLanguage: languages.learning,
            hasXpBoost: false,
            illustrationFormat: 'svg',
            isFeaturedStoryInPracticeHub: true,
            isLegendaryMode: true,
            isV2Redo: false,
            isV2Story: false,
            masterVersion: true,
            maxScore: 0,
            score: 0,
            happyHourBonusXp: 469,
            startTime: nowTs,
            endTime: nowTs
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

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            xpGained: this.xpGained,
            requestCount: this.requestCount,
            errorCount: this.errorCount
        };
    }
}

module.exports = XPFarmer;
