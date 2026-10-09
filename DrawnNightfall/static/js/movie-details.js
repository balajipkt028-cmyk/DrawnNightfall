(() => {
    "use strict";

    const DN = window.DrawnNightfall;

    function getSelectedId() {
        if (DN && typeof DN.getMovieId === "function") {
            const id = DN.getMovieId();
            if (id) return id;
        }

        try {
            const params = new URLSearchParams(window.location.search);
            return (
                params.get("id") ||
                params.get("movie_id") ||
                params.get("movieId") ||
                params.get("movie") ||
                null
            );
        } catch {
            return null;
        }
    }

    const movieId = getSelectedId();

    const elements = {
        app: document.getElementById("movieDetailsApp"),
        loading: document.getElementById("movieLoading"),
        error: document.getElementById("movieError"),
        errorText: document.getElementById("movieErrorText"),
        hero: document.getElementById("movieHero"),
        information: document.getElementById("movieInformation"),
        backdrop: document.getElementById("movieBackdrop"),
        poster: document.getElementById("moviePoster"),
        kicker: document.getElementById("movieKicker"),
        title: document.getElementById("movieTitle"),
        meta: document.getElementById("movieMeta"),
        genres: document.getElementById("movieGenres"),
        tagline: document.getElementById("movieTagline"),
        overview: document.getElementById("movieOverview"),
        trailer: document.getElementById("trailerButton"),
        watchlist: document.getElementById("watchlistButton"),
        compare: document.getElementById("compareButton"),
        director: document.getElementById("directorContainer"),
        cast: document.getElementById("castGrid"),
        similar: document.getElementById("similarMoviesGrid"),
        rating: document.getElementById("movieRating"),
        votes: document.getElementById("movieVoteCount"),
        release: document.getElementById("movieReleaseDate"),
        runtime: document.getElementById("movieRuntime"),
        language: document.getElementById("movieLanguage"),
        status: document.getElementById("movieStatus")
    };

    let movie = null;

    function hideLoading() {
        if (elements.loading) {
            elements.loading.hidden = true;
            elements.loading.classList.add("hidden");
            elements.loading.style.display = "none";
        }
    }

    function showLoading() {
        if (elements.loading) {
            elements.loading.hidden = false;
            elements.loading.classList.remove("hidden");
            elements.loading.style.display = "flex";
        }
        if (elements.hero) {
            elements.hero.hidden = true;
            elements.hero.classList.add("hidden");
        }
        if (elements.information) {
            elements.information.hidden = true;
            elements.information.classList.add("hidden");
        }
        if (elements.error) {
            elements.error.hidden = true;
            elements.error.classList.add("hidden");
        }
    }

    function showError(message) {
        hideLoading();

        if (elements.hero) {
            elements.hero.hidden = true;
            elements.hero.classList.add("hidden");
        }

        if (elements.information) {
            elements.information.hidden = true;
            elements.information.classList.add("hidden");
        }

        if (elements.error) {
            elements.error.hidden = false;
            elements.error.classList.remove("hidden");
            elements.error.style.display = "block";

            const textEl =
                elements.errorText ||
                document.getElementById("movieErrorText") ||
                elements.error.querySelector("p");

            if (textEl) {
                textEl.textContent = message;
            }
        }
    }

    function updateWatchlistButton() {
        if (!elements.watchlist || !movie) return;

        const exists = DN.isInWatchlist(movie.id);

        elements.watchlist.textContent = exists
            ? "✓ In Watchlist"
            : "+ Add to Watchlist";

        elements.watchlist.classList.toggle("active", exists);
    }

    function renderMovie(data) {
        movie = data;

        const title =
            movie.title ||
            movie.name ||
            "Untitled";

        const releaseDate =
            movie.release_date ||
            movie.first_air_date ||
            "";

        if (elements.backdrop) {
            elements.backdrop.style.backgroundImage =
                movie.backdrop_path
                    ? `url("${DN.backdrop(movie.backdrop_path)}")`
                    : "none";
        }

        if (elements.poster) {
            elements.poster.src =
                movie.poster_path
                    ? DN.poster(movie.poster_path, "w500")
                    : "";

            elements.poster.alt = `${title} poster`;
        }

        if (elements.kicker) {
            elements.kicker.textContent =
                movie.media_type === "tv"
                    ? "TV Series"
                    : "Movie Details";
        }

        if (elements.title) {
            elements.title.textContent = title;
        }

        if (elements.meta) {
            const ratingVal = DN.rating(
                movie.vote_average ?? movie.rating
            );
            const yearVal = DN.year(releaseDate);
            const runtimeVal = movie.runtime
                ? DN.runtime(movie.runtime)
                : movie.media_type === "tv"
                    ? "TV Series"
                    : "—";

            elements.meta.innerHTML = `
                <span>⭐ ${ratingVal}</span>
                <span>${yearVal}</span>
                <span>${runtimeVal}</span>
            `;
        }

        if (elements.genres) {
            const genres = movie.genres || [];
            elements.genres.innerHTML = genres.length
                ? genres
                    .map(
                        (genre) => `
                            <span class="badge">
                                ${DN.escapeHTML(genre.name)}
                            </span>
                        `
                    )
                    .join("")
                : '<span class="badge">General</span>';
        }

        if (elements.tagline) {
            elements.tagline.textContent = movie.tagline || "";
        }

        if (elements.overview) {
            elements.overview.textContent =
                movie.overview || "No overview available for this title.";
        }

        if (elements.rating) {
            elements.rating.textContent = DN.rating(
                movie.vote_average ?? movie.rating
            );
        }

        if (elements.votes) {
            elements.votes.textContent = Number(
                movie.vote_count || 0
            ).toLocaleString();
        }

        if (elements.release) {
            elements.release.textContent = releaseDate
                ? DN.date(releaseDate)
                : "N/A";
        }

        if (elements.runtime) {
            elements.runtime.textContent = movie.runtime
                ? DN.runtime(movie.runtime)
                : movie.media_type === "tv"
                    ? "TV Series"
                    : "—";
        }

        if (elements.language) {
            elements.language.textContent = movie.original_language
                ? String(movie.original_language).toUpperCase()
                : "N/A";
        }

        if (elements.status) {
            elements.status.textContent = movie.status || "Released";
        }

        renderCredits();
        updateWatchlistButton();

        // Reveal content sections
        hideLoading();

        if (elements.hero) {
            elements.hero.hidden = false;
            elements.hero.classList.remove("hidden");
            elements.hero.style.display = "";
        }

        if (elements.information) {
            elements.information.hidden = false;
            elements.information.classList.remove("hidden");
            elements.information.style.display = "";
        }
    }

    function renderCredits() {
        const directorName =
            movie.director?.name ||
            (movie.credits?.crew || []).find((p) => p.job === "Director")?.name;

        if (elements.director) {
            elements.director.innerHTML = directorName
                ? `<span>${DN.escapeHTML(directorName)}</span>`
                : "<span>Not available</span>";
        }

        const cast =
            (Array.isArray(movie.cast) && movie.cast.length > 0)
                ? movie.cast
                : (movie.credits?.cast || []);

        if (elements.cast) {
            elements.cast.innerHTML = cast.length
                ? cast
                    .slice(0, 12)
                    .map(
                        (person) => `
                            <div class="cast-card">
                                <div class="cast-photo">
                                    ${
                                        person.profile_path
                                            ? `
                                                <img
                                                    src="${DN.image(
                                                        person.profile_path,
                                                        "w185"
                                                    )}"
                                                    alt="${DN.escapeHTML(
                                                        person.name
                                                    )}"
                                                    loading="lazy"
                                                >
                                            `
                                            : `
                                                <div class="cast-placeholder">
                                                    👤
                                                </div>
                                            `
                                    }
                                </div>

                                <div class="cast-name" title="${DN.escapeHTML(person.name)}">
                                    ${DN.escapeHTML(person.name)}
                                </div>

                                <div class="cast-character" title="${DN.escapeHTML(person.character || "")}">
                                    ${DN.escapeHTML(
                                        person.character || ""
                                    )}
                                </div>
                            </div>
                        `
                    )
                    .join("")
                : "<p class='empty-cast'>Cast information not available.</p>";
        }
    }

    async function loadSimilar() {
        if (!elements.similar || !movieId) return;

        try {
            const data = await DN.api(`/api/movie/${movieId}/similar`);
            const movies = Array.isArray(data)
                ? data
                : data?.results || [];

            DN.renderMovieGrid(elements.similar, movies);
        } catch (error) {
            console.warn("Similar movies load error:", error);
        }
    }

    async function loadMovie() {
        if (!movieId) {
            showError("No movie was selected. Please select a movie to view details.");
            return;
        }

        showLoading();

        try {
            const data = await DN.api(`/api/movie/${movieId}`);

            if (!data || data.error) {
                throw new Error(data?.error || "Movie details not found.");
            }

            renderMovie(data);

            // Load similar movies asynchronously
            loadSimilar();
        } catch (error) {
            console.error("Movie loading failed:", error);
            showError(error.message || "Unable to load movie.");
        }
    }

    function setupButtons() {
        if (elements.trailer) {
            elements.trailer.addEventListener("click", async () => {
                if (!movieId) return;

                const originalHtml = elements.trailer.innerHTML;
                elements.trailer.disabled = true;
                elements.trailer.innerHTML = `<span>Loading...</span>`;

                try {
                    const trailer = await DN.getTrailer(movieId);

                    if (!trailer) {
                        alert("Trailer not available for this title.");
                        return;
                    }

                    const trailerKey =
                        typeof trailer === "string" ? trailer : trailer?.key;

                    if (!trailerKey) {
                        alert("Trailer not available for this title.");
                        return;
                    }

                    DN.openTrailerModal(
                        trailerKey,
                        movie?.title || movie?.name || "Trailer"
                    );
                } catch (error) {
                    console.error("Trailer click error:", error);
                    alert("Trailer not available for this title.");
                } finally {
                    elements.trailer.disabled = false;
                    elements.trailer.innerHTML = originalHtml;
                }
            });
        }

        if (elements.watchlist) {
            elements.watchlist.addEventListener("click", () => {
                if (!movie) return;

                if (DN.isInWatchlist(movie.id)) {
                    DN.removeFromWatchlist(movie.id);
                } else {
                    DN.addToWatchlist(movie);
                }

                updateWatchlistButton();
            });
        }

        if (elements.compare) {
            elements.compare.addEventListener("click", () => {
                if (!movieId) return;

                window.location.href = `/compare?movie1=${encodeURIComponent(
                    movieId
                )}`;
            });
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        setupButtons();
        loadMovie();
    });
})();