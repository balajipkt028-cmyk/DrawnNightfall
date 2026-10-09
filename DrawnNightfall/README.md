# DrawnNightfall 🎬

A modern movie discovery and recommendation web application powered by Flask and The Movie Database (TMDB) API.

## Features

- 🌟 **Trending & Top-Rated**: Curated weekly trending movies, top 10 hero carousel, popular titles, and upcoming releases.
- 🔍 **Global Multi-Search**: Live movie and TV show search available across all pages.
- 🧭 **Discover Engine**: Filter titles by category, genre, release year, minimum rating, and language.
- 🎲 **Movie Roulette**: Random movie picker with customizable genre, rating, and decade filters.
- 🎭 **Mood-Based Recommender**: Instant recommendations mapped to your current mood (Happy, Scary, Thoughtful, etc.).
- 🧙 **Interactive Recommendation Wizard**: 5-step guided recommendation questionnaire.
- ⚖️ **Movie Comparison**: Head-to-head comparison tool with popularity, rating, runtime, and an automated DrawnNightfall score calculator.
- 📋 **Personal Watchlist**: Client-side persisted watchlist with quick add/remove capabilities.
- 🔐 **User Accounts & Auth**: Secure Sign In and Sign Up authentication with salted password hashing, SQLite user database, session management, demo account quick-fill, and interactive password visibility toggles.
- 🎥 **Embedded Trailers**: Modal trailer player with official YouTube integration.

---

## Setup & Running

### 1. Prerequisites
- Python 3.10+ (tested with Python 3.14)
- A TMDB API Key (already configured in `.env`)

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
Ensure `.env` exists in the project root with your TMDB API key:
```env
TMDB_API_KEY=your_tmdb_api_key_here
```

### 4. Run the Server
```bash
python app.py
```
Or with Flask CLI:
```bash
flask run --port=5000
```

Open your browser and navigate to:
**http://127.0.0.1:5000**
