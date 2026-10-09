(() => {
    "use strict";

    const DN = window.DrawnNightfall;

    const elements = {
        grid: document.getElementById("watchlistGrid"),
        empty: document.getElementById("emptyWatchlist"),
        count: document.getElementById("watchlistCount"),
        loading: document.getElementById("watchlistLoading"),
        error: document.getElementById("watchlistError"),
        errorText: document.getElementById("watchlistErrorText")
    };

    function renderWatchlist() {
        if (!elements.grid) return;

        try {
            if (elements.loading) {
                elements.loading.hidden = true;
                elements.loading.classList.add("hidden");
            }
            if (elements.error) {
                elements.error.hidden = true;
                elements.error.classList.add("hidden");
            }

            const list = DN.getWatchlist();

            if (elements.count) {
                const total = Array.isArray(list) ? list.length : 0;
                elements.count.textContent =
                    total === 1 ? "1 movie" : `${total} movies`;
            }

            if (!Array.isArray(list) || list.length === 0) {
                elements.grid.innerHTML = "";
                if (elements.empty) {
                    elements.empty.hidden = false;
                    elements.empty.classList.remove("hidden");
                }
                return;
            }

            if (elements.empty) {
                elements.empty.hidden = true;
                elements.empty.classList.add("hidden");
            }

            elements.grid.innerHTML = list
                .map((movie) => {
                    const id = DN.getMovieId(movie);
                    if (!id) return "";

                    const title =
                        movie.title ||
                        movie.name ||
                        movie.original_title ||
                        "Untitled";

                    const poster = DN.poster(
                        movie.poster_path || movie.poster
                    );

                    const rating = DN.rating(
                        movie.vote_average ?? movie.rating
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
                        mediaType === "tv" ? "TV" : "Movie";

                    return `
                        <article
                            class="movie-card"
                            data-movie-id="${DN.escapeHTML(id)}"
                        >
                            <button
                                type="button"
                                class="watchlist-remove-button"
                                data-remove-id="${DN.escapeHTML(id)}"
                                title="Remove from watchlist"
                                aria-label="Remove ${DN.escapeHTML(title)} from watchlist"
                            >
                                ✕
                            </button>

                            <button
                                type="button"
                                class="movie-card-click"
                                data-movie-id="${DN.escapeHTML(id)}"
                                aria-label="Open ${DN.escapeHTML(title)}"
                            >
                                <div class="movie-card-poster">
                                    ${
                                        poster
                                            ? `
                                                <img
                                                    src="${DN.escapeHTML(poster)}"
                                                    alt="${DN.escapeHTML(title)} poster"
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
                                        ${DN.escapeHTML(title)}
                                    </h3>

                                    <div class="movie-card-meta">
                                        <span>
                                            ${DN.escapeHTML(DN.year(releaseDate))}
                                        </span>

                                        <span>
                                            ${typeLabel}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        </article>
                    `;
                })
                .join("");

            // Bind card navigation clicks
            DN.bindMovieCards(elements.grid);

            // Bind remove buttons
            elements.grid
                .querySelectorAll(".watchlist-remove-button")
                .forEach((button) => {
                    button.addEventListener("click", (event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        const movieId = button.dataset.removeId;
                        if (movieId) {
                            DN.removeFromWatchlist(movieId);
                            renderWatchlist();
                        }
                    });
                });
        } catch (error) {
            console.error("Watchlist error:", error);

            if (elements.error) {
                elements.error.hidden = false;
                elements.error.classList.remove("hidden");

                if (elements.errorText) {
                    elements.errorText.textContent =
                        error.message || "Failed to load watchlist.";
                }
            }
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        renderWatchlist();
    });

    // Re-render when window gains focus or storage changes
    window.addEventListener("storage", (e) => {
        if (e.key === DN.watchlistKey) {
            renderWatchlist();
        }
    });
})();