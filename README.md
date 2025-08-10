# Duolingo Auto Farm 🦉

Automated farming tool for Duolingo XP, Gems, and Streaks using GitHub Actions.

## Quick Setup

### 1. Fork Repository
1. Click **Fork** button
2. Enter custom information and confirm fork

### 2. Setup Token
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `TOKEN`
4. Secret: Your Duolingo JWT token

### 3. Configure Farming
Edit `config.json`:
```json
{
  "xp_loops": 100,
  "gems_loops": 50,
  "streaks_loops": 30,
  "farming_type": "all"
}
```

### 4. Run Workflow
1. Go to **Actions** tab
2. Select **Duolingo Farm**
3. Click **Run workflow**

## Farming Types
- **XP**: 499 XP per loop (2 loops/second)
- **Gems**: 30 gems per loop (5 loops/second) 
- **Streaks**: Historical streak building

## Token Extraction
Use browser DevTools to get JWT token from Duolingo.com network requests.

## Disclaimer
Educational purposes only. Use responsibly.
