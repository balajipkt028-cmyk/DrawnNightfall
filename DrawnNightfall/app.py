from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os
import requests
import sqlite3
import re
from datetime import timedelta

# =========================================================
# SETUP
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static")
)

app.secret_key = os.getenv("SECRET_KEY", "drawnnightfall-cinema-secret-key-2026")
app.permanent_session_lifetime = timedelta(days=7)
DB_PATH = os.path.join(BASE_DIR, "drawnnightfall.db")

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/"


# =========================================================
# DATABASE & AUTH HELPERS
# =========================================================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Create default demo user if not present
        cursor = conn.execute("SELECT id FROM users WHERE username = ?", ("demo",))
        if not cursor.fetchone():
            demo_hash = generate_password_hash("password123")
            conn.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                ("demo", "demo@drawnnightfall.com", demo_hash)
            )
        conn.commit()


# Initialize database
init_db()


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    try:
        with get_db() as conn:
            user = conn.execute(
                "SELECT id, username, email, created_at FROM users WHERE id = ?",
                (user_id,)
            ).fetchone()
            if user:
                return dict(user)
    except Exception as e:
        print("Database error in get_current_user:", e)
    return None


@app.context_processor
def inject_current_user():
    return dict(current_user=get_current_user())


# =========================================================
# TMDB HELPER
# =========================================================

def tmdb_get(endpoint, params=None):

    if not TMDB_API_KEY:
        return None, "TMDB API key is missing"

    params = params or {}
    params["api_key"] = TMDB_API_KEY

    try:

        response = requests.get(
            f"{TMDB_BASE_URL}{endpoint}",
            params=params,
            timeout=10
        )

        if response.status_code != 200:
            return None, f"TMDB request failed: {response.status_code}"

        return response.json(), None

    except requests.RequestException as error:

        print("TMDB ERROR:", error)

        return None, "Unable to connect to TMDB"


def api_error(message, status=500):
    return jsonify({"error": message}), status


# =========================================================
# PAGE ROUTES
# =========================================================

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/movie")
def movie_details():
    return render_template("movie-details.html")


@app.route("/watchlist")
def watchlist():
    return render_template("watchlist.html")


@app.route("/roulette")
def roulette():
    return render_template("roulette.html")


@app.route("/mood")
def mood():
    return render_template("mood.html")


@app.route("/compare")
def compare():
    return render_template("compare.html")


@app.route("/discover")
def discover():
    return render_template("discover.html")


@app.route("/recommend")
def recommend():
    return render_template("recommend.html")


# =========================================================
# AUTHENTICATION ROUTES
# =========================================================

@app.route("/signin", methods=["GET", "POST"])
@app.route("/login", methods=["GET", "POST"])
def signin():
    if get_current_user():
        return redirect(url_for("home"))

    if request.method == "POST":
        identifier = request.form.get("identifier", "").strip()
        password = request.form.get("password", "")
        next_url = request.form.get("next") or request.args.get("next")

        if not identifier or not password:
            flash("Please enter both username/email and password.", "error")
            return render_template("signin.html", identifier=identifier)

        with get_db() as conn:
            user = conn.execute(
                "SELECT id, username, email, password_hash FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?",
                (identifier.lower(), identifier.lower())
            ).fetchone()

        if not user or not check_password_hash(user["password_hash"], password):
            flash("Invalid username/email or password.", "error")
            return render_template("signin.html", identifier=identifier)

        session["user_id"] = user["id"]
        session["username"] = user["username"]
        session["email"] = user["email"]
        session.permanent = True

        flash(f"Welcome back, {user['username']}!", "success")

        if next_url and next_url.startswith("/") and not next_url.startswith("//"):
            return redirect(next_url)
        return redirect(url_for("home"))

    return render_template("signin.html")


@app.route("/signup", methods=["GET", "POST"])
@app.route("/register", methods=["GET", "POST"])
def signup():
    if get_current_user():
        return redirect(url_for("home"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not username or not email or not password or not confirm_password:
            flash("All fields are required.", "error")
            return render_template("signup.html", username=username, email=email)

        if len(username) < 3 or len(username) > 30:
            flash("Username must be between 3 and 30 characters.", "error")
            return render_template("signup.html", username=username, email=email)

        if not re.match(r"^[A-Za-z0-9_]+$", username):
            flash("Username can only contain letters, numbers, and underscores.", "error")
            return render_template("signup.html", username=username, email=email)

        email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
        if not re.match(email_pattern, email):
            flash("Please enter a valid email address.", "error")
            return render_template("signup.html", username=username, email=email)

        if len(password) < 6:
            flash("Password must be at least 6 characters long.", "error")
            return render_template("signup.html", username=username, email=email)

        if password != confirm_password:
            flash("Passwords do not match.", "error")
            return render_template("signup.html", username=username, email=email)

        with get_db() as conn:
            existing_user = conn.execute(
                "SELECT id FROM users WHERE LOWER(username) = ?",
                (username.lower(),)
            ).fetchone()
            if existing_user:
                flash("That username is already taken. Please choose another.", "error")
                return render_template("signup.html", username=username, email=email)

            existing_email = conn.execute(
                "SELECT id FROM users WHERE LOWER(email) = ?",
                (email.lower(),)
            ).fetchone()
            if existing_email:
                flash("An account with that email already exists.", "error")
                return render_template("signup.html", username=username, email=email)

            password_hash = generate_password_hash(password)
            cursor = conn.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                (username, email, password_hash)
            )
            user_id = cursor.lastrowid
            conn.commit()

        session["user_id"] = user_id
        session["username"] = username
        session["email"] = email
        session.permanent = True

        flash(f"Welcome to DrawnNightfall, {username}! Your account has been created.", "success")
        return redirect(url_for("home"))

    return render_template("signup.html")


@app.route("/signout", methods=["GET", "POST"])
@app.route("/logout", methods=["GET", "POST"])
def signout():
    session.clear()
    flash("You have been signed out successfully.", "info")
    return redirect(url_for("home"))


# =========================================================
# AUTH API ENDPOINTS
# =========================================================

@app.route("/api/auth/me")
def api_auth_me():
    user = get_current_user()
    if user:
        return jsonify({
            "authenticated": True,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "created_at": user["created_at"]
            }
        })
    return jsonify({"authenticated": False, "user": None})


@app.route("/api/auth/signin", methods=["POST"])
def api_auth_signin():
    data = request.get_json(silent=True) or request.form
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"error": "Identifier and password required"}), 400

    with get_db() as conn:
        user = conn.execute(
            "SELECT id, username, email, password_hash FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?",
            (identifier.lower(), identifier.lower())
        ).fetchone()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username/email or password"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["email"] = user["email"]

    return jsonify({
        "success": True,
        "message": f"Welcome back, {user['username']}",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"]
        }
    })


@app.route("/api/auth/signup", methods=["POST"])
def api_auth_signup():
    data = request.get_json(silent=True) or request.form
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    if len(username) < 3 or len(username) > 30:
        return jsonify({"error": "Username must be 3-30 characters"}), 400

    if not re.match(r"^[A-Za-z0-9_]+$", username):
        return jsonify({"error": "Username can only contain letters, numbers, and underscores"}), 400

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "Invalid email address format"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if confirm_password and password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    with get_db() as conn:
        existing_user = conn.execute(
            "SELECT id FROM users WHERE LOWER(username) = ?",
            (username.lower(),)
        ).fetchone()
        if existing_user:
            return jsonify({"error": "Username is already taken"}), 409

        existing_email = conn.execute(
            "SELECT id FROM users WHERE LOWER(email) = ?",
            (email.lower(),)
        ).fetchone()
        if existing_email:
            return jsonify({"error": "Email is already registered"}), 409

        password_hash = generate_password_hash(password)
        cursor = conn.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, password_hash)
        )
        user_id = cursor.lastrowid
        conn.commit()

    session["user_id"] = user_id
    session["username"] = username
    session["email"] = email

    return jsonify({
        "success": True,
        "message": f"Account created for {username}",
        "user": {
            "id": user_id,
            "username": username,
            "email": email
        }
    }), 201


@app.route("/api/auth/signout", methods=["POST", "GET"])
def api_auth_signout():
    session.clear()
    return jsonify({"success": True, "message": "Signed out successfully"})


# =========================================================
# HOME — TRENDING
# =========================================================

@app.route("/api/movies/trending")
def trending_movies():

    data, error = tmdb_get(
        "/trending/movie/week",
        {
            "language": "en-US"
        }
    )

    if error:
        return api_error(error)

    return jsonify(data.get("results", []))


# =========================================================
# HOME — TOP 10
# =========================================================

@app.route("/api/movies/top-10")
def top_10_movies():

    data, error = tmdb_get(
        "/trending/movie/week",
        {
            "language": "en-US"
        }
    )

    if error:
        return api_error(error)

    movies = []

    for movie in data.get("results", [])[:10]:

        movies.append({
            "id": movie.get("id"),
            "title": movie.get("title"),
            "overview": movie.get("overview"),
            "rating": movie.get("vote_average"),
            "vote_count": movie.get("vote_count"),
            "release_date": movie.get("release_date"),
            "poster_path": movie.get("poster_path"),
            "backdrop_path": movie.get("backdrop_path"),
            "genre_ids": movie.get("genre_ids", []),
            "popularity": movie.get("popularity")
        })

    return jsonify(movies)


# =========================================================
# POPULAR MOVIES
# =========================================================

@app.route("/api/movies/popular")
def popular_movies():

    page = request.args.get("page", 1, type=int)

    data, error = tmdb_get(
        "/movie/popular",
        {
            "language": "en-US",
            "region": "IN",
            "page": page
        }
    )

    if error:
        return api_error(error)

    return jsonify(data.get("results", []))


# =========================================================
# TOP RATED MOVIES
# =========================================================

@app.route("/api/movies/top-rated")
def top_rated_movies():

    page = request.args.get("page", 1, type=int)

    data, error = tmdb_get(
        "/movie/top_rated",
        {
            "language": "en-US",
            "region": "US",
            "page": page
        }
    )

    if error:
        return api_error(error)

    return jsonify(data.get("results", []))


# =========================================================
# UPCOMING MOVIES
# =========================================================

@app.route("/api/movies/upcoming")
def upcoming_movies():

    page = request.args.get("page", 1, type=int)

    data, error = tmdb_get(
        "/movie/upcoming",
        {
            "language": "en-US",
            "region": "IN",
            "page": page
        }
    )

    if error:
        return api_error(error)

    return jsonify(data.get("results", []))


# =========================================================
# NOW PLAYING
# =========================================================

@app.route("/api/movies/now-playing")
def now_playing_movies():

    page = request.args.get("page", 1, type=int)

    data, error = tmdb_get(
        "/movie/now_playing",
        {
            "language": "en-US",
            "region": "IN",
            "page": page
        }
    )

    if error:
        return api_error(error)

    return jsonify(data.get("results", []))


# =========================================================
# POPULAR TV
# =========================================================

@app.route("/api/tv/popular")
def popular_tv():

    page = request.args.get("page", 1, type=int)

    data, error = tmdb_get(
        "/tv/popular",
        {
            "language": "en-US",
            "page": page
        }
    )

    if error:
        return api_error(error)

    return jsonify(data.get("results", []))


# =========================================================
# SEARCH MOVIES
# =========================================================

@app.route("/api/search")
def search_movies():

    query = request.args.get("query", "").strip()

    if not query:
        return jsonify([])

    page = request.args.get("page", 1, type=int)

    data, error = tmdb_get(
        "/search/movie",
        {
            "language": "en-US",
            "query": query,
            "include_adult": False,
            "page": page
        }
    )

    if error:
        return api_error(error)

    return jsonify(data.get("results", []))


# =========================================================
# SEARCH MULTI
# Movies + TV + People
# =========================================================

@app.route("/api/search/multi")
def search_multi():

    query = request.args.get("query", "").strip()

    if not query:
        return jsonify([])

    data, error = tmdb_get(
        "/search/multi",
        {
            "language": "en-US",
            "query": query,
            "include_adult": False,
            "page": 1
        }
    )

    if error:
        return api_error(error)

    return jsonify(data.get("results", []))


# =========================================================
# GENRES
# =========================================================

@app.route("/api/genres")
def genres():

    data, error = tmdb_get(
        "/genre/movie/list",
        {
            "language": "en-US"
        }
    )

    if error:
        return api_error(error)

    return jsonify(data.get("genres", []))


# =========================================================
# MOVIES BY GENRE
# =========================================================

@app.route("/api/movies/genre/<int:genre_id>")
def movies_by_genre(genre_id):

    page = request.args.get("page", 1, type=int)

    data, error = tmdb_get(
        "/discover/movie",
        {
            "language": "en-US",
            "with_genres": genre_id,
            "sort_by": "popularity.desc",
            "include_adult": False,
            "page": page
        }
    )

    if error:
        return api_error(error)

    return jsonify(data.get("results", []))


# =========================================================
# DISCOVER MOVIES
# =========================================================

@app.route("/api/discover")
def discover_movies():

    media_type = request.args.get("type", "movie").strip().lower()
    endpoint = "/discover/tv" if media_type == "tv" else "/discover/movie"

    sort_val = (
        request.args.get("sort_by")
        or request.args.get("sort")
        or "popularity.desc"
    )

    page = request.args.get(
        "page",
        1,
        type=int
    )

    params = {
        "language": "en-US",
        "sort_by": sort_val,
        "include_adult": False,
        "page": page
    }

    genre = request.args.get("genre") or request.args.get("with_genres")
    mood = request.args.get("mood", "").strip().lower()

    if genre:
        params["with_genres"] = genre
    elif mood and mood in MOOD_GENRES:
        params["with_genres"] = "|".join(str(g) for g in MOOD_GENRES[mood])

    year = request.args.get("year")
    if year:
        if media_type == "tv":
            params["first_air_date_year"] = year
        else:
            params["primary_release_year"] = year

    rating = request.args.get("min_rating") or request.args.get("rating")
    if rating:
        params["vote_average.gte"] = rating
        params["vote_count.gte"] = 50

    language = request.args.get("language")
    if language:
        params["with_original_language"] = language

    runtime = request.args.get("runtime", "").strip().lower()
    min_runtime = request.args.get("min_runtime")
    max_runtime = request.args.get("max_runtime")

    if runtime == "short":
        params["with_runtime.lte"] = 90
    elif runtime == "medium":
        params["with_runtime.gte"] = 90
        params["with_runtime.lte"] = 120
    elif runtime == "long":
        params["with_runtime.gte"] = 120
    else:
        if min_runtime:
            params["with_runtime.gte"] = min_runtime
        if max_runtime:
            params["with_runtime.lte"] = max_runtime

    data, error = tmdb_get(
        endpoint,
        params
    )

    if error:
        return api_error(error)

    return jsonify({
        "page": data.get("page", 1),
        "total_pages": data.get("total_pages", 1),
        "total_results": data.get("total_results", 0),
        "results": data.get("results", [])
    })


# =========================================================
# MOVIE DETAILS
# =========================================================

@app.route("/api/movie/<int:movie_id>")
@app.route("/api/tmdb/movie/<int:movie_id>")
def get_movie(movie_id):

    is_tv = False
    movie, error = tmdb_get(
        f"/movie/{movie_id}",
        {
            "language": "en-US"
        }
    )

    if error or not movie:
        tv_movie, tv_error = tmdb_get(
            f"/tv/{movie_id}",
            {
                "language": "en-US"
            }
        )
        if not tv_error and tv_movie:
            movie = tv_movie
            error = None
            is_tv = True

    if error:
        return api_error(error)

    if not movie:
        return api_error(
            "Movie not found",
            404
        )

    credits_endpoint = f"/tv/{movie_id}/credits" if is_tv else f"/movie/{movie_id}/credits"
    credits, _ = tmdb_get(
        credits_endpoint,
        {
            "language": "en-US"
        }
    )

    credits = credits or {}

    # -----------------------------------------------------
    # DIRECTOR / CREATOR
    # -----------------------------------------------------

    director = None

    if is_tv:
        created_by = movie.get("created_by", [])
        if created_by:
            director = {
                "id": created_by[0].get("id"),
                "name": created_by[0].get("name"),
                "profile_path": created_by[0].get("profile_path")
            }

    if not director:
        for person in credits.get("crew", []):
            if person.get("job") == "Director":
                director = {
                    "id": person.get("id"),
                    "name": person.get("name"),
                    "profile_path": person.get("profile_path")
                }
                break

    # -----------------------------------------------------
    # CAST
    # -----------------------------------------------------

    cast = []

    for person in credits.get("cast", [])[:12]:
        cast.append({
            "id": person.get("id"),
            "name": person.get("name"),
            "character": person.get("character"),
            "profile_path": person.get("profile_path")
        })

    # -----------------------------------------------------
    # GENRES
    # -----------------------------------------------------

    movie_genres = []

    for genre in movie.get("genres", []):
        movie_genres.append({
            "id": genre.get("id"),
            "name": genre.get("name")
        })

    # -----------------------------------------------------
    # RETURN
    # -----------------------------------------------------

    title = movie.get("title") or movie.get("name") or "Untitled"
    release_date = movie.get("release_date") or movie.get("first_air_date") or ""
    runtime = movie.get("runtime")
    if not runtime and movie.get("episode_run_time"):
        r_list = movie.get("episode_run_time")
        if isinstance(r_list, list) and r_list:
            runtime = r_list[0]

    return jsonify({
        "id": movie.get("id"),
        "title": title,
        "name": movie.get("name"),
        "tagline": movie.get("tagline"),
        "overview": movie.get("overview"),
        "rating": movie.get("vote_average"),
        "vote_count": movie.get("vote_count"),
        "popularity": movie.get("popularity"),
        "release_date": release_date,
        "first_air_date": movie.get("first_air_date"),
        "runtime": runtime,
        "poster_path": movie.get("poster_path"),
        "backdrop_path": movie.get("backdrop_path"),
        "budget": movie.get("budget"),
        "revenue": movie.get("revenue"),
        "status": movie.get("status"),
        "original_language": movie.get("original_language"),
        "genres": movie_genres,
        "director": director,
        "cast": cast,
        "credits": credits,
        "media_type": "tv" if is_tv else "movie",
        "homepage": movie.get("homepage")
    })


# =========================================================
# MOVIE TRAILER
# =========================================================

@app.route("/api/movie/<int:movie_id>/trailer")
@app.route("/api/tmdb/movie/<int:movie_id>/trailer")
def get_trailer(movie_id):

    data, error = tmdb_get(
        f"/movie/{movie_id}/videos",
        {
            "language": "en-US"
        }
    )

    if error or not data or not data.get("results"):
        tv_data, tv_error = tmdb_get(
            f"/tv/{movie_id}/videos",
            {
                "language": "en-US"
            }
        )
        if not tv_error and tv_data and tv_data.get("results"):
            data = tv_data
            error = None

    # Fallback without language filter (some trailers do not have language tag or en-US)
    if not data or not data.get("results"):
        fallback_data, fb_error = tmdb_get(f"/movie/{movie_id}/videos")
        if not fb_error and fallback_data and fallback_data.get("results"):
            data = fallback_data
            error = None
        else:
            fb_tv, fb_tv_err = tmdb_get(f"/tv/{movie_id}/videos")
            if not fb_tv_err and fb_tv and fb_tv.get("results"):
                data = fb_tv
                error = None

    if error and (not data or not data.get("results")):
        status = 404 if "404" in str(error) else 500
        return api_error(error, status)

    videos = (data or {}).get("results", [])

    # 1. Official YouTube Trailer
    for video in videos:
        if (
            video.get("site") == "YouTube"
            and video.get("type") == "Trailer"
            and video.get("official") is True
        ):
            return jsonify({
                "key": video.get("key"),
                "name": video.get("name")
            })

    # 2. Any YouTube Trailer
    for video in videos:
        if (
            video.get("site") == "YouTube"
            and video.get("type") == "Trailer"
        ):
            return jsonify({
                "key": video.get("key"),
                "name": video.get("name")
            })

    # 3. Official YouTube Teaser
    for video in videos:
        if (
            video.get("site") == "YouTube"
            and video.get("type") == "Teaser"
            and video.get("official") is True
        ):
            return jsonify({
                "key": video.get("key"),
                "name": video.get("name")
            })

    # 4. Any YouTube Teaser
    for video in videos:
        if (
            video.get("site") == "YouTube"
            and video.get("type") == "Teaser"
        ):
            return jsonify({
                "key": video.get("key"),
                "name": video.get("name")
            })

    # 5. Any YouTube Video
    for video in videos:
        if video.get("site") == "YouTube" and video.get("key"):
            return jsonify({
                "key": video.get("key"),
                "name": video.get("name")
            })

    return api_error(
        "Trailer not available",
        404
    )


# =========================================================
# SIMILAR MOVIES
# =========================================================

@app.route("/api/movie/<int:movie_id>/similar")
def similar_movies(movie_id):

    data, error = tmdb_get(
        f"/movie/{movie_id}/similar",
        {
            "language": "en-US",
            "page": 1
        }
    )

    if error or not data or not data.get("results"):
        tv_data, tv_error = tmdb_get(
            f"/tv/{movie_id}/similar",
            {
                "language": "en-US",
                "page": 1
            }
        )
        if not tv_error and tv_data and tv_data.get("results"):
            data = tv_data
            error = None

    if error:
        return api_error(error)

    return jsonify(data.get("results", []))


# =========================================================
# RECOMMENDATIONS FROM TMDB
# =========================================================

@app.route("/api/movie/<int:movie_id>/recommendations")
def movie_recommendations(movie_id):

    data, error = tmdb_get(
        f"/movie/{movie_id}/recommendations",
        {
            "language": "en-US",
            "page": 1
        }
    )

    if error:
        return api_error(error)

    return jsonify(data.get("results", []))


# =========================================================
# MOVIE COMPARISON
# =========================================================

@app.route("/api/compare")
def compare_movies():

    movie1_id = request.args.get("movie1", type=int)
    movie2_id = request.args.get("movie2", type=int)

    if not movie1_id or not movie2_id:

        return api_error(
            "Two movie IDs are required",
            400
        )

    movie1, error1 = tmdb_get(
        f"/movie/{movie1_id}",
        {
            "language": "en-US"
        }
    )

    movie2, error2 = tmdb_get(
        f"/movie/{movie2_id}",
        {
            "language": "en-US"
        }
    )

    if error1:
        return api_error(error1)

    if error2:
        return api_error(error2)

    # -----------------------------------------------------
    # DRAWNNIGHTFALL COMPARISON SCORE
    #
    # This is a website scoring system,
    # NOT an objective movie-quality measurement.
    # -----------------------------------------------------

    def comparison_score(movie):

        rating = movie.get("vote_average") or 0
        popularity = movie.get("popularity") or 0
        votes = movie.get("vote_count") or 0

        rating_score = min(rating * 10, 100)

        popularity_score = min(
            popularity,
            100
        )

        vote_score = min(
            (votes / 10000) * 100,
            100
        )

        score = (
            rating_score * 0.50
            + popularity_score * 0.20
            + vote_score * 0.30
        )

        return round(score, 1)

    score1 = comparison_score(movie1)
    score2 = comparison_score(movie2)

    if score1 > score2:
        winner = movie1.get("title")

    elif score2 > score1:
        winner = movie2.get("title")

    else:
        winner = "It's a tie!"

    return jsonify({
        "movie1": movie1,
        "movie2": movie2,
        "score1": score1,
        "score2": score2,
        "winner": winner
    })


# =========================================================
# MOOD RECOMMENDATIONS
# =========================================================

MOOD_GENRES = {

    "happy": [35, 10751],

    "funny": [35],

    "romantic": [10749],

    "scary": [27],

    "exciting": [28, 12],

    "emotional": [18],

    "dark": [80, 53],

    "thoughtful": [18, 9648],

    "feel-good": [35, 10751],

    "disturbing": [27, 53, 80]

}


@app.route("/api/mood/<mood_name>")
def mood_movies(mood_name):

    mood_name = mood_name.lower().strip()

    genres = MOOD_GENRES.get(mood_name)

    if not genres:

        return api_error(
            "Unknown mood",
            404
        )

    results = []

    for genre_id in genres:

        data, error = tmdb_get(
            "/discover/movie",
            {
                "language": "en-US",
                "with_genres": genre_id,
                "sort_by": "vote_average.desc",
                "vote_count.gte": 200,
                "include_adult": False,
                "page": 1
            }
        )

        if error:
            continue

        results.extend(
            data.get("results", [])
        )

    # Remove duplicates

    unique_movies = {}

    for movie in results:

        movie_id = movie.get("id")

        if movie_id:
            unique_movies[movie_id] = movie

    movies = list(
        unique_movies.values()
    )

    movies.sort(
        key=lambda movie: (
            movie.get("vote_average") or 0,
            movie.get("popularity") or 0
        ),
        reverse=True
    )

    return jsonify(movies[:20])


# =========================================================
# RANDOM MOVIE
# =========================================================

@app.route("/api/random-movie")
def random_movie():

    import random

    media_type = request.args.get("type", "movie").strip().lower()
    endpoint = "/discover/tv" if media_type == "tv" else "/discover/movie"

    params = {
        "language": "en-US",
        "sort_by": "popularity.desc",
        "include_adult": False,
        "page": 1
    }

    genre = request.args.get("genre")
    if genre:
        params["with_genres"] = genre

    rating = request.args.get("rating")
    if rating:
        params["vote_average.gte"] = rating
        params["vote_count.gte"] = 20

    period = request.args.get("period")
    if period:
        date_key_gte = "first_air_date.gte" if media_type == "tv" else "primary_release_date.gte"
        date_key_lte = "first_air_date.lte" if media_type == "tv" else "primary_release_date.lte"

        if period == "2020":
            params[date_key_gte] = "2020-01-01"
        elif period == "2010":
            params[date_key_gte] = "2010-01-01"
            params[date_key_lte] = "2019-12-31"
        elif period == "2000":
            params[date_key_gte] = "2000-01-01"
            params[date_key_lte] = "2009-12-31"
        elif period == "1990":
            params[date_key_gte] = "1990-01-01"
            params[date_key_lte] = "1999-12-31"
        elif period == "1980":
            params[date_key_lte] = "1989-12-31"

    data, error = tmdb_get(endpoint, params)

    if error:
        return api_error(error)

    total_pages = data.get("total_pages", 1)
    if total_pages > 1:
        max_page = min(total_pages, 10)
        random_page = random.randint(1, max_page)
        if random_page != 1:
            params["page"] = random_page
            page_data, page_error = tmdb_get(endpoint, params)
            if not page_error and page_data.get("results"):
                data = page_data

    movies = data.get("results", [])

    if not movies:
        return api_error(
            "No movies found",
            404
        )

    count = request.args.get("count", 1, type=int)
    if count > 1:
        count = min(count, len(movies))
        chosen = random.sample(movies, count)
        return jsonify({
            "movies": chosen,
            "movie": chosen[0]
        })

    movie = random.choice(movies)

    return jsonify(movie)


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/api/health")
def health():

    return jsonify({
        "status": "online",
        "tmdb_configured": bool(TMDB_API_KEY),
        "project": "DrawnNightfall"
    })


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )