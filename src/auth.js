const fs = require('fs');

class Auth {
    constructor(token) {
        this.token = token;
        this.userId = null;
        this.courses = [];
        this.fromLanguage = 'en';
        this.learningLanguage = 'vi';
    }

    decodeToken() {
        const parts = this.token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format');
        }
        
        const payload = parts[1];
        const decoded = Buffer.from(payload + '==', 'base64url').toString();
        const data = JSON.parse(decoded);
        this.userId = data.sub;
        return data;
    }

    getHeaders() {
        return {
            'authorization': `Bearer ${this.token}`,
            'connection': 'Keep-Alive',
            'content-type': 'application/json',
            'user-agent': 'Duolingo-Storm/1.0',
            'device-platform': 'web',
            'x-duolingo-device-platform': 'web',
            'x-duolingo-app-version': '1.0.0',
            'x-duolingo-application': 'chrome',
            'x-duolingo-client-version': 'web',
            'accept': 'application/json'
        };
    }

    async fetchCourses(axios) {
        const url = `https://www.duolingo.com/2017-06-30/users/${this.userId}?fields=courses,fromLanguage,learningLanguage`;
        const response = await axios.get(url, { headers: this.getHeaders() });
        
        this.courses = response.data.courses || [];
        this.fromLanguage = response.data.fromLanguage || 'en';
        this.learningLanguage = response.data.learningLanguage || 'vi';
        
        return {
            courses: this.courses,
            fromLanguage: this.fromLanguage,
            learningLanguage: this.learningLanguage
        };
    }

    getUserId() {
        return this.userId;
    }

    getLanguages() {
        return {
            from: this.fromLanguage,
            learning: this.learningLanguage
        };
    }
}

module.exports = Auth;
