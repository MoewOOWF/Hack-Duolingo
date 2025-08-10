const axios = require('axios');
const fs = require('fs');
const Auth = require('./auth');
const XPFarmer = require('./xpFarmer');
const GemsFarmer = require('./gemsFarmer');
const StreaksFarmer = require('./streaksFarmer');

class DuolingoAutoFarm {
    constructor() {
        this.config = this.loadConfig();
        this.token = process.env.TOKEN;
        this.auth = null;
        this.axios = axios;
    }

    loadConfig() {
        try {
            const configData = fs.readFileSync('config.json', 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.error('Error loading config:', error.message);
            return {
                xp_loops: 10,
                gems_loops: 10,
                streaks_loops: 5,
                farming_type: 'all'
            };
        }
    }

    async initialize() {
        if (!this.token) {
            throw new Error('TOKEN environment variable is required');
        }

        this.auth = new Auth(this.token);
        this.auth.decodeToken();
        
        console.log(`User ID: ${this.auth.getUserId()}`);
        
        const courses = await this.auth.fetchCourses(this.axios);
        console.log(`Languages: ${courses.fromLanguage} -> ${courses.learningLanguage}`);
        console.log(`Courses found: ${courses.courses.length}`);
    }

    async run() {
        try {
            await this.initialize();
            
            const results = {
                xp: null,
                gems: null,
                streaks: null,
                startTime: new Date().toISOString(),
                endTime: null
            };

            console.log('🦉 Duolingo Auto Farm Started');
            console.log('================================');

            if (this.config.farming_type === 'all' || this.config.farming_type === 'xp') {
                console.log('\n📚 Starting XP Farming...');
                const xpFarmer = new XPFarmer(this.auth, this.axios);
                results.xp = await xpFarmer.farmXP(this.config.xp_loops);
                this.printResults('XP', results.xp);
            }

            if (this.config.farming_type === 'all' || this.config.farming_type === 'gems') {
                console.log('\n💎 Starting Gems Farming...');
                const gemsFarmer = new GemsFarmer(this.auth, this.axios);
                results.gems = await gemsFarmer.farmGems(this.config.gems_loops);
                this.printResults('Gems', results.gems);
            }

            if (this.config.farming_type === 'all' || this.config.farming_type === 'streaks') {
                console.log('\n🔥 Starting Streaks Farming...');
                const streaksFarmer = new StreaksFarmer(this.auth, this.axios);
                results.streaks = await streaksFarmer.farmStreaks(this.config.streaks_loops);
                this.printResults('Streaks', results.streaks);
            }

            results.endTime = new Date().toISOString();
            this.saveResults(results);
            
            console.log('\n🎉 Farming completed successfully!');
            console.log('Results saved to results.json');

        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    }

    printResults(type, results) {
        if (!results) {
            console.log(`${type} farming failed`);
            return;
        }

        const { duration, requestCount, errorCount } = results;
        const successRate = ((requestCount - errorCount) / requestCount * 100).toFixed(1);
        
        console.log(`\n${type} Results:`);
        console.log(`- Gained: ${results[`${type.toLowerCase()}Gained`] || 0}`);
        console.log(`- Requests: ${requestCount}`);
        console.log(`- Errors: ${errorCount}`);
        console.log(`- Success Rate: ${successRate}%`);
        console.log(`- Duration: ${duration.toFixed(2)}s`);
    }

    saveResults(results) {
        try {
            const resultsData = {
                ...results,
                summary: {
                    totalXP: results.xp?.xpGained || 0,
                    totalGems: results.gems?.gemsGained || 0,
                    totalStreaks: results.streaks?.streaksGained || 0,
                    totalRequests: (results.xp?.requestCount || 0) + (results.gems?.requestCount || 0) + (results.streaks?.requestCount || 0),
                    totalErrors: (results.xp?.errorCount || 0) + (results.gems?.errorCount || 0) + (results.streaks?.errorCount || 0)
                }
            };
            fs.writeFileSync('results.json', JSON.stringify(resultsData, null, 2));
            console.log('\n📊 Results Summary:');
            console.log(`- Total XP: ${resultsData.summary.totalXP}`);
            console.log(`- Total Gems: ${resultsData.summary.totalGems}`);
            console.log(`- Total Streaks: ${resultsData.summary.totalStreaks}`);
            console.log(`- Total Requests: ${resultsData.summary.totalRequests}`);
            console.log(`- Total Errors: ${resultsData.summary.totalErrors}`);
        } catch (error) {
            console.error('Error saving results:', error.message);
            fs.writeFileSync('results.json', JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }, null, 2));
        }
    }
}

const farm = new DuolingoAutoFarm();
farm.run().catch(console.error);
