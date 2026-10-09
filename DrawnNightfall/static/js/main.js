// ============================================================
// DRAWNNIGHTFALL — SHARED JAVASCRIPT
// ============================================================

(() => {
    "use strict";

    const API_BASE = "/api";
    const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

    const DN = {

        // =====================================================
        // CONFIG
        // =====================================================

        apiBase: API_BASE,

        imageBase: TMDB_IMAGE_BASE,

        watchlistKey: "drawnNightFallWatchlist",


        // =====================================================
        // API
        // =====================================================

        async api(endpoint, options = {}) {

            try {

                const url = endpoint.startsWith("/api/")
                    ? endpoint
                    : endpoint === "/api"
                        ? "/api"
                        : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

                const response = await fetch(
                    url,
                    {
                        ...options,
                        headers: {
                            "Content-Type": "application/json",
                            ...(options.headers || {})
                        }
                    }
                );

                let data = null;

                try {
                    data = await response.json();
                } catch {
                    data = null;
                }

                if (!response.ok) {

                    const message =
                        data?.error ||
                        data?.message ||
                        `Request failed (${response.status})`;

                    throw new Error(message);
                }

                return data;

            } catch (error) {

                console.error("API Error:", error);

                throw error;
            }
        },


        // =====================================================
        // IMAGE URL
        // =====================================================

        image(path, size = "w500") {

            if (!path) {
                return "";
            }

            if (path.startsWith("http")) {
                return path;
            }

            return `${TMDB_IMAGE_BASE}${size}${path}`;
        },


        backdrop(path) {

            return this.image(path, "original");
        },


        poster(path) {

            return this.image(path, "w500");
        },


        // =====================================================
        // FORMATTING
        // =====================================================

        rating(value) {

            const number = Number(value);

            if (!Number.isFinite(number)) {
                return "N/A";
            }

            return number.toFixed(1);
        },


        year(date) {

            if (!date) {
                return "—";
            }

            const value = String(date);

            return value.length >= 4
                ? value.substring(0, 4)
                : "—";
        },


        runtime(minutes) {

            const value = Number(minutes);

            if (!Number.isFinite(value) || value <= 0) {
                return "—";
            }

            const hours = Math.floor(value / 60);
            const mins = value % 60;

            if (hours === 0) {
                return `${mins}m`;
            }

            if (mins === 0) {
                return `${hours}h`;
            }

            return `${hours}h ${mins}m`;
        },


        date(value) {

            if (!value) {
                return "—";
            }

            try {
                const d = new Date(value);
                if (Number.isNaN(d.getTime())) {
                    return String(value);
                }
                return d.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                });
            } catch {
                return String(value);
            }
        },


        truncate(text, max = 150) {

            if (!text) {
                return "";
            }

            const str = String(text).trim();

            if (str.length <= max) {
                return str;
            }

            return `${str.slice(0, max).trim()}...`;
        },


        // =====================================================
        // SECURITY
        // =====================================================

        escapeHTML(value) {

            if (value === null || value === undefined) {
                return "";
            }

            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },


        // =====================================================
        // MOVIE ID
        // =====================================================

        getMovieId(movie) {

            if (movie) {
                if (typeof movie === "number" || typeof movie === "string") {
                    return movie;
                }

                return (
                    movie.id ||
                    movie.movie_id ||
                    movie.tmdb_id ||
                    null
                );
            }

            try {
                const params = new URLSearchParams(window.location.search);
                return params.get("id") || params.get("movie_id") || null;
            } catch {
                return null;
            }
        },


        openMovie(movieId) {

            if (!movieId) {
                return;
            }

            window.location.href = `/movie?id=${encodeURIComponent(movieId)}`;
        },


        // =====================================================
        // MOVIE CARD
        // =====================================================

        movieCard(movie, options = {}) {

            if (!movie) {
                return "";
            }

            const id = this.getMovieId(movie);

            if (!id) {
                return "";
            }

            const title =
                movie.title ||
                movie.name ||
                movie.original_title ||
                movie.original_name ||
                "Untitled";


            const poster = this.poster(
                movie.poster_path ||
                movie.poster
            );


            const rating = this.rating(
                movie.vote_average ??
                movie.rating
            );


            const releaseDate =
                movie.release_date ||
                movie.first_air_date ||
                movie.releaseDate ||
                "";


            const mediaType =
                movie.media_type ||
                movie.type ||
                (movie.first_air_date ? "tv" : "movie");


            const typeLabel =
                mediaType === "tv"
                    ? "TV"
                    : "Movie";


            const rank =
                options.rank ||
                movie.rank ||
                "";


            return `
                <article
                    class="movie-card"
                    data-movie-id="${this.escapeHTML(id)}"
                    data-rank="${this.escapeHTML(rank)}"
                >

                    <button
                        type="button"
                        class="movie-card-click"
                        data-movie-id="${this.escapeHTML(id)}"
                        aria-label="Open ${this.escapeHTML(title)}"
                    >

                        <div class="movie-card-poster">

                            ${
                                poster
                                    ? `
                                        <img
                                            src="${this.escapeHTML(poster)}"
                                            alt="${this.escapeHTML(title)} poster"
                                            loading="lazy"
                                        >
                                    `
                                    : `
                                        <div class="movie-card-fallback">
                                            No Image
                                        </div>
                                    `
                            }

                            <span class="movie-card-rating">
                                ★ ${rating}
                            </span>

                        </div>


                        <div class="movie-card-info">

                            <h3 class="movie-card-title">
                                ${this.escapeHTML(title)}
                            </h3>

                            <div class="movie-card-meta">

                                <span>
                                    ${this.escapeHTML(this.year(releaseDate))}
                                </span>

                                <span>
                                    ${typeLabel}
                                </span>

                            </div>

                        </div>

                    </button>

                </article>
            `;
        },


        // =====================================================
        // RENDER GRID
        // =====================================================

        renderMovieGrid(container, movies, options = {}) {

            if (!container) {
                return;
            }

            if (!Array.isArray(movies) || movies.length === 0) {

                container.innerHTML = `
                    <div class="empty-state">
                        <p>No movies found.</p>
                    </div>
                `;

                return;
            }


            container.innerHTML = movies
                .map((movie, index) => {

                    const rank =
                        options.startRank
                            ? options.startRank + index
                            : movie.rank || "";

                    return this.movieCard(
                        movie,
                        {
                            ...options,
                            rank
                        }
                    );

                })
                .join("");


            this.bindMovieCards(container);
        },


        // =====================================================
        // MOVIE CARD CLICK
        // =====================================================

        bindMovieCards(container = document) {

            container
                .querySelectorAll(".movie-card-click")
                .forEach(button => {

                    button.addEventListener("click", event => {

                        event.preventDefault();
                        event.stopPropagation();

                        const movieId =
                            button.dataset.movieId;

                        this.openMovie(movieId);
                    });

                });
        },


        // =====================================================
        // GLOBAL SEARCH
        // =====================================================

        async performSearch(query) {

            const cleanQuery = String(query || "").trim();

            if (!cleanQuery) {
                return;
            }

            const section =
                document.getElementById("searchResultsSection");

            const title =
                document.getElementById("searchResultsTitle");

            const grid =
                document.getElementById("searchResultsGrid");

            if (!section || !grid) {
                window.location.href = `/?search=${encodeURIComponent(cleanQuery)}`;
                return;
            }

            section.classList.remove("hidden");
            section.hidden = false;
            section.style.display = "block";

            if (title) {
                title.textContent =
                    `Search results for "${cleanQuery}"`;
            }

            grid.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Searching for "${this.escapeHTML(cleanQuery)}"...</p>
                </div>
            `;

            section.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            try {
                const filteredResults = await this.search(cleanQuery);

                this.renderMovieGrid(
                    grid,
                    filteredResults
                );

                const closeBtn = document.getElementById("closeSearchButton");
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        section.classList.add("hidden");
                        section.hidden = true;
                        section.style.display = "none";
                        const input =
                            document.getElementById("globalSearch") ||
                            document.getElementById("movieSearch");
                        if (input) input.value = "";
                    };
                }
            } catch (error) {
                console.error(
                    "Search failed:",
                    error
                );

                grid.innerHTML = `
                    <div class="error-message">
                        <strong>Unable to search.</strong>
                        <p>${this.escapeHTML(error.message)}</p>
                    </div>
                `;
            }
        },


        async search(query) {

            const cleanQuery = String(query || "").trim();

            if (!cleanQuery) {
                return [];
            }

            try {
                let data = await this.api(
                    `/search/multi?query=${encodeURIComponent(cleanQuery)}`
                );

                let results =
                    Array.isArray(data)
                        ? data
                        : (
                            data?.results ||
                            data?.movies ||
                            data?.items ||
                            []
                        );

                if (!results || results.length === 0) {
                    data = await this.api(
                        `/search?query=${encodeURIComponent(cleanQuery)}`
                    );
                    results =
                        Array.isArray(data)
                            ? data
                            : (data?.results || data?.movies || []);
                }

                return (results || []).filter(item => {
                    return (
                        item &&
                        item.id &&
                        (
                            item.media_type === "movie" ||
                            item.media_type === "tv" ||
                            !item.media_type ||
                            item.title ||
                            item.name
                        )
                    );
                });

            } catch (error) {
                console.error("Search API error:", error);
                return [];
            }
        },


        // =====================================================
        // SEARCH SETUP
        // =====================================================

        setupGlobalSearch() {

            const form =
                document.getElementById("globalSearchForm");

            const input =
                document.getElementById("globalSearch") ||
                document.getElementById("movieSearch");

            const button =
                document.getElementById("globalSearchButton") ||
                document.getElementById("movieSearchButton");

            if (!input) {
                return;
            }

            const submitSearch = event => {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }

                const query = input.value.trim();
                if (query) {
                    this.performSearch(query);
                }
            };

            // Form submit
            if (form) {
                form.onsubmit = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    submitSearch(event);
                    return false;
                };

                form.addEventListener(
                    "submit",
                    submitSearch
                );
            }

            // Search button fallback
            if (button) {
                button.addEventListener(
                    "click",
                    submitSearch
                );
            }

            // Enter key fallback
            input.addEventListener(
                "keydown",
                event => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        event.stopPropagation();
                        submitSearch(event);
                    }
                }
            );
        },


        // =====================================================
        // TRAILER
        // =====================================================

        async getTrailer(movieId) {

            if (!movieId) {
                return null;
            }

            try {

                const data = await this.api(
                    `/movie/${movieId}/trailer`
                );

                const key =
                    data?.key ||
                    data?.youtube_key ||
                    data?.youtubeKey ||
                    data?.trailer?.key ||
                    (typeof data === "string" ? data : null);

                if (!key) {
                    return null;
                }

                return {
                    key: key,
                    name: data?.name || "Trailer",
                    site: data?.site || "YouTube",
                    toString() {
                        return this.key;
                    },
                    valueOf() {
                        return this.key;
                    }
                };

            } catch (error) {

                console.error(
                    "Trailer error:",
                    error
                );

                return null;
            }
        },


        // =====================================================
        // TRAILER MODAL
        // =====================================================

        openTrailerModal(youtubeKey, title = "Movie Trailer") {

            const modal =
                document.getElementById("trailerModal");

            const player =
                document.getElementById("trailerPlayer");

            const modalTitle =
                document.getElementById("trailerModalTitle");

            const key =
                typeof youtubeKey === "object" && youtubeKey !== null
                    ? (youtubeKey.key || youtubeKey.youtube_key || youtubeKey.youtubeKey || "")
                    : youtubeKey;

            if (!modal || !player || !key) {
                console.warn("Unable to open trailer modal:", { modal, player, key });
                return;
            }

            if (modalTitle) {
                modalTitle.textContent = title || "Movie Trailer";
            }

            player.innerHTML = `
                <iframe
                    src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?autoplay=1&rel=0"
                    title="${this.escapeHTML(title || "Movie trailer")}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                ></iframe>
            `;

            modal.classList.remove("hidden");
            modal.classList.add("active");

            document.body.classList.add("no-scroll");
        },


        closeTrailerModal() {

            const modal =
                document.getElementById("trailerModal");

            const player =
                document.getElementById("trailerPlayer");

            if (player) {
                player.innerHTML = "";
            }

            if (modal) {
                modal.classList.remove("active");
                modal.classList.add("hidden");
            }

            document.body.classList.remove("no-scroll");
        },


        setupTrailerModal() {

            const modal =
                document.getElementById("trailerModal");

            if (!modal) {
                return;
            }

            const closeButtons = modal.querySelectorAll(
                "#closeTrailerModal, #closeTrailerButton, .modal-close"
            );

            closeButtons.forEach(button => {
                button.addEventListener(
                    "click",
                    () => this.closeTrailerModal()
                );
            });

            const backdrop =
                modal.querySelector(".modal-backdrop") ||
                document.getElementById("trailerBackdrop");

            if (backdrop) {
                backdrop.addEventListener(
                    "click",
                    () => this.closeTrailerModal()
                );
            }

            modal.addEventListener(
                "click",
                event => {
                    if (event.target === modal) {
                        this.closeTrailerModal();
                    }
                }
            );

            document.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Escape" &&
                        (modal.classList.contains("active") || !modal.classList.contains("hidden"))
                    ) {
                        this.closeTrailerModal();
                    }

                }
            );
        },


        // =====================================================
        // LOCAL STORAGE
        // =====================================================

        getWatchlist() {

            try {

                const raw =
                    localStorage.getItem(
                        this.watchlistKey
                    );

                if (!raw) {
                    return [];
                }

                const parsed =
                    JSON.parse(raw);

                return Array.isArray(parsed)
                    ? parsed
                    : [];

            } catch (error) {

                console.error(
                    "Watchlist read error:",
                    error
                );

                return [];
            }
        },


        saveWatchlist(list) {

            try {

                localStorage.setItem(
                    this.watchlistKey,
                    JSON.stringify(list)
                );

            } catch (error) {

                console.error(
                    "Watchlist save error:",
                    error
                );
            }
        },


        isInWatchlist(movieId) {

            return this.getWatchlist()
                .some(item =>
                    String(
                        this.getMovieId(item)
                    ) === String(movieId)
                );
        },


        addToWatchlist(movie) {

            if (!movie) {
                return false;
            }


            const movieId =
                this.getMovieId(movie);


            if (!movieId) {
                return false;
            }


            const list =
                this.getWatchlist();


            if (
                list.some(item =>
                    String(
                        this.getMovieId(item)
                    ) === String(movieId)
                )
            ) {
                return false;
            }


            list.push(movie);

            this.saveWatchlist(list);

            return true;
        },


        removeFromWatchlist(movieId) {

            const list =
                this.getWatchlist()
                    .filter(item =>
                        String(
                            this.getMovieId(item)
                        ) !== String(movieId)
                    );


            this.saveWatchlist(list);

            return list;
        },


        toggleWatchlist(movie) {

            const movieId =
                this.getMovieId(movie);


            if (!movieId) {
                return false;
            }


            if (this.isInWatchlist(movieId)) {

                this.removeFromWatchlist(movieId);

                return false;
            }


            this.addToWatchlist(movie);

            return true;
        },


        // =====================================================
        // LOADING / ERROR HELPERS
        // =====================================================

        showLoading(element, message = "Loading...") {

            if (!element) {
                return;
            }

            element.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>${this.escapeHTML(message)}</p>
                </div>
            `;
        },


        showError(element, message = "Something went wrong.") {

            if (!element) {
                return;
            }

            element.innerHTML = `
                <div class="error-message">
                    <strong>Unable to load movies.</strong>
                    <p>${this.escapeHTML(message)}</p>
                </div>
            `;
        },


        // =====================================================
        // NAVIGATION
        // =====================================================

        setupNavigation() {

            document
                .querySelectorAll(".nav-link")
                .forEach(link => {

                    link.addEventListener(
                        "click",
                        () => {

                            document
                                .querySelectorAll(".nav-link")
                                .forEach(item =>
                                    item.classList.remove("active")
                                );

                            link.classList.add("active");
                        }
                    );

                });
        },


        // =====================================================
        // IMAGE FALLBACK
        // =====================================================

        setupImageFallbacks() {

            document
                .addEventListener(
                    "error",
                    event => {

                        const target =
                            event.target;

                        if (
                            target &&
                            target.tagName === "IMG"
                        ) {

                            target.style.display =
                                "none";

                            const parent =
                                target.parentElement;

                            if (
                                parent &&
                                !parent.querySelector(
                                    ".movie-card-fallback"
                                )
                            ) {

                                const fallback =
                                    document.createElement(
                                        "div"
                                    );

                                fallback.className =
                                    "movie-card-fallback";

                                fallback.textContent =
                                    "No Image";

                                parent.appendChild(
                                    fallback
                                );
                            }

                        }

                    },
                    true
                );
        },


        // =====================================================
        // FLASH TOASTS
        // =====================================================

        setupFlashToasts() {
            const toasts = document.querySelectorAll(".flash-toast");
            toasts.forEach((toast) => {
                const closeBtn = toast.querySelector(".flash-toast-close");
                if (closeBtn) {
                    closeBtn.addEventListener("click", () => {
                        toast.remove();
                    });
                }
                setTimeout(() => {
                    if (toast && toast.parentElement) {
                        toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";
                        toast.style.opacity = "0";
                        toast.style.transform = "translateY(-10px)";
                        setTimeout(() => toast.remove(), 400);
                    }
                }, 4500);
            });
        },


        // =====================================================
        // INITIALIZATION
        // =====================================================

        init() {

            this.setupGlobalSearch();

            this.setupTrailerModal();

            this.setupNavigation();

            this.setupImageFallbacks();

            this.setupFlashToasts();

            try {
                const params = new URLSearchParams(window.location.search);
                const query = params.get("search") || params.get("query");
                if (query && document.getElementById("searchResultsSection")) {
                    const input =
                        document.getElementById("globalSearch") ||
                        document.getElementById("movieSearch");
                    if (input) {
                        input.value = query;
                    }
                    this.performSearch(query);
                }
            } catch (err) {
                console.error("Init search error:", err);
            }

            console.log(
                "DrawnNightfall initialized."
            );
        }
    };


    // =========================================================
    // GLOBAL OBJECT
    // =========================================================

    window.DrawnNightfall = DN;


    // =========================================================
    // START
    // =========================================================

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            () => DN.init()
        );

    } else {

        DN.init();
    }

})();
