(() => {
    "use strict";

    const DN = window.DrawnNightfall;

    const grids = {
        trending: document.getElementById("trendingGrid"),
        topRated: document.getElementById("topRatedGrid"),
        popular: document.getElementById("popularGrid"),
        tv: document.getElementById("tvGrid"),
        upcoming: document.getElementById("upcomingGrid"),
        genre: document.getElementById("genreMovieGrid")
    };

    const hero = {
        section: document.getElementById("heroSection"),
        background: document.getElementById("heroBackground"),
        title: document.getElementById("heroTitle"),
        overview: document.getElementById("heroOverview"),
        meta: document.getElementById("heroMeta"),
        details: document.getElementById("heroDetailsButton"),
        trailer: document.getElementById("heroTrailerButton"),
        indicators: document.getElementById("heroIndicators")
    };

    let topTen = [];
    let currentHeroIndex = 0;
    let heroTimer = null;

    async function loadSection(endpoint, container, options = {}) {
        if (!container) return;

        try {
            const data = await DN.api(endpoint);
            const movies = Array.isArray(data)
                ? data
                : data.results || [];

            DN.renderMovieGrid(container, movies, options);
            return movies;
        } catch (error) {
            console.error(endpoint, error);

            container.innerHTML = `
                <div class="error-message">
                    <strong>Unable to load movies.</strong>
                    <p>${DN.escapeHTML(error.message)}</p>
                </div>
            `;

            return [];
        }
    }

    function setupHero(movies) {
        if (!movies.length || !hero.section) return;

        topTen = movies.slice(0, 10);
        currentHeroIndex = 0;

        renderHero();
        renderHeroIndicators();

        clearInterval(heroTimer);

        heroTimer = setInterval(() => {
            currentHeroIndex =
                (currentHeroIndex + 1) % topTen.length;

            renderHero();
            renderHeroIndicators();
        }, 7000);
    }

    function renderHero() {
        const movie = topTen[currentHeroIndex];

        if (!movie) return;

        const title = movie.title || movie.name || "Untitled";
        const date =
            movie.release_date ||
            movie.first_air_date ||
            "";

        if (hero.background) {
            hero.background.style.backgroundImage =
                movie.backdrop_path
                    ? `url("${DN.backdrop(movie.backdrop_path)}")`
                    : "none";
        }

        if (hero.title) {
            hero.title.textContent = title;
        }

        if (hero.overview) {
            hero.overview.textContent =
                DN.truncate(
                    movie.overview ||
                    "Discover this movie on DrawnNightfall.",
                    230
                );
        }

        if (hero.meta) {
            hero.meta.innerHTML = `
                <span>⭐ ${DN.rating(movie.vote_average)}</span>
                <span>${DN.year(date)}</span>
                <span>Movie</span>
            `;
        }

        if (hero.details) {
            hero.details.onclick = () => {
                DN.openMovie(movie.id);
            };
        }

        if (hero.trailer) {
            hero.trailer.onclick = async () => {
                const originalHtml = hero.trailer.innerHTML;
                hero.trailer.disabled = true;
                hero.trailer.innerHTML = `<span>Loading...</span>`;

                try {
                    const trailer = await DN.getTrailer(movie.id);
                    const trailerKey =
                        typeof trailer === "string" ? trailer : trailer?.key;

                    if (!trailerKey) {
                        alert("Trailer not available for this movie.");
                        return;
                    }

                    DN.openTrailerModal(
                        trailerKey,
                        `${title} Trailer`
                    );
                } catch (error) {
                    console.error("Hero trailer error:", error);
                    alert("Trailer not available for this movie.");
                } finally {
                    hero.trailer.disabled = false;
                    hero.trailer.innerHTML = originalHtml;
                }
            };
        }
    }

    function renderHeroIndicators() {
        if (!hero.indicators) return;

        hero.indicators.innerHTML = topTen
            .map(
                (_, index) => `
                    <button
                        type="button"
                        class="hero-indicator ${
                            index === currentHeroIndex
                                ? "active"
                                : ""
                        }"
                        data-hero-index="${index}"
                        aria-label="Show movie ${index + 1}"
                    ></button>
                `
            )
            .join("");

        hero.indicators
            .querySelectorAll("[data-hero-index]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    currentHeroIndex =
                        Number(button.dataset.heroIndex);

                    renderHero();
                    renderHeroIndicators();

                    clearInterval(heroTimer);

                    heroTimer = setInterval(() => {
                        currentHeroIndex =
                            (currentHeroIndex + 1) %
                            topTen.length;

                        renderHero();
                        renderHeroIndicators();
                    }, 7000);
                });
            });
    }

    async function loadGenres() {
        const container =
            document.getElementById("genreButtons");

        if (!container) return;

        try {
            const data =
                await DN.api("/api/genres");

            const genres =
                data.genres || data || [];

            container.innerHTML = genres
                .map(
                    (genre, index) => `
                        <button
                            type="button"
                            class="genre-button ${
                                index === 0
                                    ? "active"
                                    : ""
                            }"
                            data-genre-id="${genre.id}"
                            data-genre-name="${DN.escapeHTML(
                                genre.name
                            )}"
                        >
                            ${DN.escapeHTML(genre.name)}
                        </button>
                    `
                )
                .join("");

            const buttons =
                container.querySelectorAll(
                    ".genre-button"
                );

            buttons.forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        buttons.forEach((item) =>
                            item.classList.remove("active")
                        );

                        button.classList.add("active");

                        loadGenre(
                            button.dataset.genreId,
                            button.dataset.genreName
                        );
                    }
                );
            });

            if (genres[0]) {
                loadGenre(
                    genres[0].id,
                    genres[0].name
                );
            }
        } catch (error) {
            console.error("Genre error:", error);
        }
    }

    async function loadGenre(id, name) {
        if (!grids.genre || !id) return;

        const section =
            document.getElementById(
                "genreResultsSection"
            );

        const title =
            document.getElementById(
                "genreResultsTitle"
            );

        const kicker =
            document.getElementById(
                "genreResultsKicker"
            );

        if (section) section.hidden = false;
        if (kicker) kicker.textContent = "Genre";
        if (title) title.textContent = name;

        grids.genre.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading ${DN.escapeHTML(name)} movies...</p>
            </div>
        `;

        try {
            const data = await DN.api(
                `/api/movies/genre/${id}`
            );

            const movies =
                data.results || data || [];

            DN.renderMovieGrid(
                grids.genre,
                movies
            );
        } catch (error) {
            grids.genre.innerHTML = `
                <div class="error-message">
                    ${DN.escapeHTML(error.message)}
                </div>
            `;
        }
    }

    async function init() {
        const trending =
            await loadSection(
                "/api/movies/trending",
                grids.trending
            );

        setupHero(trending);

        await Promise.all([
            loadSection(
                "/api/movies/top-rated",
                grids.topRated
            ),

            loadSection(
                "/api/movies/popular",
                grids.popular
            ),

            loadSection(
                "/api/tv/popular",
                grids.tv,
                { mediaType: "tv" }
            ),

            loadSection(
                "/api/movies/upcoming",
                grids.upcoming
            ),

            loadGenres()
        ]);
    }

    document.addEventListener(
        "DOMContentLoaded",
        init
    );
})();