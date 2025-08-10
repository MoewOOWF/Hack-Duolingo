// Configuration constants matching Python version
const CONFIG = {
    TARGET_RATE: 2,
    CONCURRENT_REQUESTS: 2,
    BATCH_SIZE: 2,
    REQUEST_INTERVAL: 222,
    MIN_REQUEST_DELAY: 30,
    MAX_CONSECUTIVE_ERRORS: 3,
    RETRY_DELAY: 100,
    HEALTH_CHECK_INTERVAL: 100,
    CHECKPOINT_INTERVAL: 90,
    ADAPTIVE_DELAY_MIN: 100,
    ADAPTIVE_DELAY_MAX: 500,
    CONNECTION_POOL_SIZE: 3
};

// Default challenge types (optimized from original template)
const DEFAULT_CHALLENGE_TYPES = [
    "assist", "characterIntro", "characterMatch", "characterPuzzle",
    "characterSelect", "characterTrace", "characterWrite",
    "completeReverseTranslation", "definition", "dialogue",
    "extendedMatch", "extendedListenMatch", "form", "freeResponse",
    "gapFill", "judge", "listen", "listenComplete", "listenMatch",
    "match", "name", "listenComprehension", "listenIsolation",
    "listenSpeak", "listenTap", "orderTapComplete", "partialListen",
    "partialReverseTranslate", "patternTapComplete", "radioBinary",
    "radioImageSelect", "radioListenMatch", "radioListenRecognize",
    "radioSelect", "readComprehension", "reverseAssist",
    "sameDifferent", "select", "selectPronunciation",
    "selectTranscription", "svgPuzzle", "syllableTap",
    "syllableListenTap", "speak", "tapCloze", "tapClozeTable",
    "tapComplete", "tapCompleteTable", "tapDescribe", "translate",
    "transliterate", "transliterationAssist", "typeCloze",
    "typeClozeTable", "typeComplete", "typeCompleteTable",
    "writeComprehension"
];

// Session template (cached)
const SESSION_TEMPLATE = {
    challengeTypes: DEFAULT_CHALLENGE_TYPES,
    isFinalLevel: false,
    isV2: true,
    juicy: true,
    smartTipsVersion: 2,
    type: "GLOBAL_PRACTICE"
};

class UltraFastRequestManager {
    constructor(maxConcurrent = 15) {
        this.maxConcurrent = maxConcurrent;
        this.active = 0;
        this.queue = [];
        this.stats = {
            total: 0,
            success: 0,
            failed: 0
        };
    }

    async addTask(taskPromise) {
        this.stats.total++;
        
        // Wait for available slot
        while (this.active >= this.maxConcurrent) {
            await this.delay(10);
        }
        
        this.active++;
        try {
            const result = await taskPromise;
            this.stats.success++;
            return result;
        } catch (error) {
            this.stats.failed++;
            throw error;
        } finally {
            this.active--;
        }
    }

    getStats() {
        return { ...this.stats };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class StreaksFarmer {
    constructor(auth, axios) {
        this.auth = auth;
        this.axios = axios;
        this.streaksGained = 0;
        this.requestCount = 0;
        this.errorCount = 0;
        this.processedDates = new Set();
        this.shouldStop = false;
        this.consecutiveErrors = 0;
        this.totalProcessedSessions = 0;
        this.lastBatchTime = 0;
        this.requestManager = new UltraFastRequestManager(CONFIG.CONCURRENT_REQUESTS);
        
        // User agents pool for randomization
        this.userAgents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/122.0",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
        ];
    }

    getOptimizedHeaders() {
        const randomUserAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        return {
            ...this.auth.getHeaders(),
            'User-Agent': randomUserAgent,
            'Referer': 'https://www.duolingo.com/practice',
            'Origin': 'https://www.duolingo.com',
            'Connection': 'keep-alive'
        };
    }

    async preciseDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async adaptiveRateLimit() {
        const currentTime = Date.now();
        const timeSinceLastBatch = currentTime - this.lastBatchTime;
        const targetInterval = 1000 / CONFIG.TARGET_RATE;
        
        if (timeSinceLastBatch < targetInterval) {
            const delayNeeded = targetInterval - timeSinceLastBatch;
            await this.preciseDelay(delayNeeded);
        }
        
        this.lastBatchTime = Date.now();
    }

    handleError(error, context = '') {
        console.log(`Handled error in ${context}:`, error.message);
        
        // Reset consecutive errors after successful operations
        if (this.consecutiveErrors > 0 && Math.random() > 0.3) {
            this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
        }
        
        const errorStr = error.message.toLowerCase();
        
        if (errorStr.includes('abort')) return 'abort';
        if (errorStr.includes('429') || errorStr.includes('rate limit')) return 'rate_limit';
        if (errorStr.includes('server') || errorStr.includes('5')) return 'server_error';
        if (errorStr.includes('network') || errorStr.includes('connection')) return 'network_error';
        
        return 'unknown_error';
    }

    async executeWithSmartRetry(asyncFunc, maxRetries = 2, context = '') {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            if (this.shouldStop) {
                throw new Error('Stopped by user');
            }
            
            try {
                const result = await asyncFunc();
                
                // Success - reset error counter
                if (this.consecutiveErrors > 0) {
                    this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
                }
                
                return result;
                
            } catch (error) {
                const errorType = this.handleError(error, context);
                this.consecutiveErrors++;
                
                let retryDelay = CONFIG.RETRY_DELAY;
                const shouldRetry = attempt < maxRetries - 1;
                
                switch (errorType) {
                    case 'rate_limit':
                        retryDelay = 300;
                        break;
                    case 'abort':
                        retryDelay = 10;
                        break;
                    case 'server_error':
                        retryDelay = 500;
                        break;
                    case 'network_error':
                        retryDelay = 150;
                        break;
                    default:
                        retryDelay = 200;
                }
                
                if (!shouldRetry) {
                    console.error(`Failed after ${maxRetries} attempts:`, error.message);
                    return null;
                }
                
                await this.preciseDelay(retryDelay);
            }
        }
        
        return null;
    }

    async apiRequest(method, url, data = null, timeout = 8000) {
        const headers = this.getOptimizedHeaders();
        
        const config = {
            method,
            url,
            headers,
            timeout,
            ...(data && { data })
        };

        try {
            const response = await this.axios(config);
            
            if (response.status === 200) {
                return response.data;
            } else {
                throw new Error(`API request failed: ${response.status}`);
            }
        } catch (error) {
            throw error;
        }
    }

    async getStreakData() {
        const userId = this.auth.getUserId();
        const url = `https://www.duolingo.com/2017-06-30/users/${userId}?fields=streakData`;
        return await this.apiRequest('GET', url);
    }

    async createSession() {
        const url = 'https://www.duolingo.com/2017-06-30/sessions';
        const languages = this.auth.getLanguages();
        
        const payload = {
            ...SESSION_TEMPLATE,
            fromLanguage: languages.from,
            learningLanguage: languages.learning
        };

        return await this.apiRequest('POST', url, payload);
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

        return await this.apiRequest('PUT', url, payload);
    }

    generateDateBeforeStreak(streakStartDate, daysBack) {
        const startDate = new Date(streakStartDate);
        const targetDate = new Date(startDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
        targetDate.setHours(12, 0, 0, 0);
        return targetDate.toISOString();
    }

    async getCurrentStreakEndDate() {
        try {
            const streakData = await this.getStreakData();
            const currentStreak = streakData?.streakData?.currentStreak;
            
            if (currentStreak && currentStreak.length > 0) {
                return currentStreak[currentStreak.length - 1];
            }
            
            // Fallback to today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today.toISOString().split('T')[0];
            
        } catch (error) {
            console.error('Error getting current streak end date:', error);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today.toISOString().split('T')[0];
        }
    }

    async processSessionBatch(dates) {
        const tasks = dates.map(async (targetDate, index) => {
            try {
                // Stagger requests to avoid thundering herd
                if (index > 0) {
                    await this.preciseDelay(index * 50);
                }
                
                const sessionData = await this.executeWithSmartRetry(
                    () => this.createSession(),
                    2,
                    `create_session_${index}`
                );
                
                if (!sessionData) {
                    return null;
                }
                
                const result = await this.executeWithSmartRetry(
                    () => this.completeSession(sessionData, targetDate),
                    2,
                    `complete_session_${index}`
                );
                
                return result ? { success: true, date: targetDate } : null;
                
            } catch (error) {
                console.error(`Session failed for ${targetDate}:`, error.message);
                return null;
            }
        });
        
        // Execute all tasks concurrently
        const results = await Promise.allSettled(tasks);
        
        // Count successful results
        let successCount = 0;
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value?.success) {
                successCount++;
            }
        }
        
        return successCount;
    }

    async farmStreaks(loops) {
        console.log(`Starting enhanced Streaks farming for ${loops} loops...`);
        const startTime = Date.now();
        
        try {
            // Get initial streak data
            const streakData = await this.executeWithSmartRetry(
                () => this.getStreakData(),
                3,
                'initial_streak_data'
            );
            
            if (!streakData?.streakData?.longestStreak?.startDate) {
                throw new Error('No streak data found');
            }

            const currentStreakStart = streakData.streakData.longestStreak.startDate;
            let daysBack = 1;
            let processedSessions = 0;

            // Process streaks in optimized batches
            for (let batchNum = 0; batchNum < loops; batchNum += CONFIG.BATCH_SIZE) {
                if (this.shouldStop) {
                    break;
                }

                // Apply adaptive rate limiting
                await this.adaptiveRateLimit();

                // Prepare batch of dates
                const batchDates = [];
                for (let i = 0; i < CONFIG.BATCH_SIZE && processedSessions + i < loops; i++) {
                    const targetDate = this.generateDateBeforeStreak(currentStreakStart, daysBack + i);
                    const targetDateKey = targetDate.split('T')[0];
                    
                    if (!this.processedDates.has(targetDateKey)) {
                        this.processedDates.add(targetDateKey);
                        batchDates.push(targetDate);
                    }
                }

                if (batchDates.length === 0) {
                    daysBack += CONFIG.BATCH_SIZE;
                    continue;
                }

                // Process batch
                const successCount = await this.processSessionBatch(batchDates);
                
                this.streaksGained += successCount;
                processedSessions += batchDates.length;
                this.requestCount += batchDates.length;
                daysBack += batchDates.length;

                // Progress logging
                if (batchNum % 5 === 0) {
                    console.log(`Streaks Progress: ${processedSessions}/${loops} | Streaks Gained: ${this.streaksGained}`);
                }

                // Health check periodically
                if (processedSessions % CONFIG.HEALTH_CHECK_INTERVAL === 0) {
                    try {
                        await this.executeWithSmartRetry(
                            () => this.getStreakData(),
                            1,
                            'health_check'
                        );
                    } catch (error) {
                        // Continue even if health check fails
                    }
                }

                // Small delay between batches
                await this.preciseDelay(CONFIG.MIN_REQUEST_DELAY);
            }
        } catch (error) {
            console.error('Streaks farming initialization failed:', error.message);
            this.errorCount++;
            return null;
        }
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        return {
            streaksGained: this.streaksGained,
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            duration: duration,
            requestManagerStats: this.requestManager.getStats()
        };
    }

    // Original methods preserved for compatibility
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

    getDefaultChallengeTypes() {
        return DEFAULT_CHALLENGE_TYPES;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            streaksGained: this.streaksGained,
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            processedDates: this.processedDates.size,
            consecutiveErrors: this.consecutiveErrors,
            requestManagerStats: this.requestManager.getStats()
        };
    }

    stop() {
        this.shouldStop = true;
        console.log('Streaks farming stopped by user');
    }
}

module.exports = StreaksFarmer;
