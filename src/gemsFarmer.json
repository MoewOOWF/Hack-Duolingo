class GemsFarmer {
    constructor(auth, axios) {
        this.auth = auth;
        this.axios = axios;
        this.gemsGained = 0;
        this.requestCount = 0;
        this.errorCount = 0;
    }

    async farmGems(loops) {
        console.log(`Starting Gems farming for ${loops} loops...`);
        const startTime = Date.now();
        
        for (let i = 0; i < loops; i++) {
            try {
                await this.performGemsRequest();
                this.gemsGained += 30;
                this.requestCount++;
                
                if (i % 10 === 0) {
                    console.log(`Gems Progress: ${i}/${loops} | Gems Gained: ${this.gemsGained}`);
                }
                
                await this.delay(200);
            } catch (error) {
                this.errorCount++;
                console.error(`Gems Request ${i} failed:`, error.message);
                await this.delay(500);
            }
        }
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        return {
            gemsGained: this.gemsGained,
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            duration: duration
        };
    }

    async performGemsRequest() {
        const userId = this.auth.getUserId();
        const url = `https://www.duolingo.com/2017-06-30/users/${userId}/rewards/SKILL_COMPLETION_BALANCED-3cc66443_c14d_3965_a68b_e4eb1cfae15e-2-GEMS`;
        
        const payload = {
            consumed: true,
            fromLanguage: 'en',
            learningLanguage: 'en'
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
            gemsGained: this.gemsGained,
            requestCount: this.requestCount,
            errorCount: this.errorCount
        };
    }
}

module.exports = GemsFarmer;
