console.log('🧪 Testing module imports...');

try {
    console.log('1. Testing Auth module...');
    const Auth = require('./auth.js');
    console.log('✅ Auth module loaded');

    console.log('2. Testing XPFarmer module...');
    const XPFarmer = require('./xpFarmer.js');
    console.log('✅ XPFarmer module loaded');

    console.log('3. Testing GemsFarmer module...');
    const GemsFarmer = require('./gemsFarmer.js');
    console.log('✅ GemsFarmer module loaded');

    console.log('4. Testing StreaksFarmer module...');
    const StreaksFarmer = require('./streaksFarmer.js');
    console.log('✅ StreaksFarmer module loaded');

    console.log('5. Testing config loading...');
    const fs = require('fs');
    if (fs.existsSync('../config.json')) {
        const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
        console.log('✅ Config loaded:', config);
    } else {
        console.log('⚠️  Config file not found, using defaults');
    }

    console.log('6. Testing environment variables...');
    const token = process.env.TOKEN;
    if (token) {
        console.log('✅ TOKEN environment variable found');
        console.log('Token length:', token.length);
        console.log('Token starts with:', token.substring(0, 20) + '...');
    } else {
        console.log('❌ TOKEN environment variable not found');
    }

    console.log('\n🎉 All tests passed!');

} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
