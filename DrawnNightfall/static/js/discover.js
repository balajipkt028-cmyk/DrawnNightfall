(() => {
    "use strict";

    const DN = window.DrawnNightfall;

    const grid = document.getElementById("discoverMovieGrid");
    const pageNumber = document.getElementById("discoverPageNumber");
    const resultCount = document.getElementById("discoverResultCount");
    const genreButtons = document.getElementById("discoverGenreButtons");
    const genreSelect = document.getElementById("discoverGenre");
    const yearSelect = document.getElementById("discoverYear");
    const typeSelect = document.getElementById("discoverType");
    const ratingSelect = document.getElementById("discoverRating");
    const langSelect = document.getElementById("discoverLanguage");
    const sortSelect = document.getElementById("discoverSort");

    let currentPage = 1;
    let selectedGenre = "";

    function populateYears() {
        if (!yearSelect || yearSelect.options.length > 2) return;

        const currentVal = yearSelect.value;
        yearSelect.innerHTML = '<option value="">Any Year</option>';
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 1960; y--) {
            const opt = document.createElement("option");
            opt.value = String(y);
            opt.textContent = String(y);
            yearSelect.appendChild(opt);
        }
        if (currentVal) {
            yearSelect.value = currentVal;
        }
    }

    async function loadGenres() {
        populateYears();

        try {
            const data = await DN.api("/api/genres");
            const genres = data?.genres || data || [];

            if (genreSelect && Array.isArray(genres) && genres.length > 0) {
                const currentVal = genreSelect.value;
                genreSelect.innerHTML = '<option value="">All Genres</option>';
                genres.forEach((genre) => {
                    const option = document.createElement("option");
                    option.value = String(genre.id);
                    option.textContent = genre.name;
                    genreSelect.appendChild(option);
                });
                if (currentVal) {
                    genreSelect.value = currentVal;
                }
            }

            if (genreButtons && Array.isArray(genres)) {
                genreButtons.innerHTML = genres
                    .map(
                        (genre) => `
                            <button
                                type="button"
                                class="discover-genre-button"
                                data-genre-id="${genre.id}"
                            >
                                ${DN.escapeHTML(genre.name)}
                            </button>
                        `
                    )
                    .join("");

                genreButtons.querySelectorAll("[data-genre-id]").forEach((button) => {
                    button.addEventListener("click", () => {
                        const isActive = button.classList.contains("active");

                        genreButtons.querySelectorAll(".active").forEach((item) =>
                            item.classList.remove("active")
                        );

                        if (isActive) {
                            selectedGenre = "";
                            if (genreSelect) genreSelect.value = "";
                        } else {
                            selectedGenre = button.dataset.genreId;
                            button.classList.add("active");
                            if (genreSelect) genreSelect.value = selectedGenre;
                        }

                        currentPage = 1;
                        loadMovies();
                    });
                });
            }
        } catch (error) {
            console.error("Failed to load genres:", error);
        }
    }

    function syncGenreButtons(genreId) {
        if (!genreButtons) return;
        genreButtons.querySelectorAll(".active").forEach((b) => b.classList.remove("active"));
        if (genreId) {
            const match = genreButtons.querySelector(`[data-genre-id="${genreId}"]`);
            if (match) match.classList.add("active");
        }
    }

    function getFilters() {
        const activeGenre = selectedGenre || genreSelect?.value || "";
        return {
            type: typeSelect?.value || "movie",
            genre: activeGenre,
            year: yearSelect?.value || "",
            rating: ratingSelect?.value || "",
            language: langSelect?.value || "",
            sort: sortSelect?.value || "popularity.desc"
        };
    }

    async function loadMovies() {
        if (!grid) return;

        const loading = document.getElementById("discoverLoading");
        const error = document.getElementById("discoverError");

        if (loading) {
            loading.classList.remove("hidden");
            loading.hidden = false;
            loading.style.display = "flex";
        }
        if (error) {
            error.classList.add("hidden");
            error.hidden = true;
            error.style.display = "none";
        }

        grid.innerHTML = "";

        const filters = getFilters();
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            }
        });

        params.set("page", currentPage);

        try {
            const data = await DN.api(`/api/discover?${params}`);
            const movies = data.results || [];

            if (resultCount) {
                resultCount.textContent = data.total_results
                    ? `${Number(data.total_results).toLocaleString()} results`
                    : `${movies.length} results`;
            }

            if (pageNumber) {
                pageNumber.textContent = `Page ${data.page || currentPage}`;
            }

            const resultsTitle = document.getElementById("discoverResultsTitle");
            if (resultsTitle) {
                if (filters.genre && genreSelect) {
                    const selOpt = genreSelect.options[genreSelect.selectedIndex];
                    const genreName = selOpt ? selOpt.textContent : "Selected";
                    resultsTitle.textContent = `${genreName} ${filters.type === "tv" ? "TV Shows" : "Movies"}`;
                } else {
                    resultsTitle.textContent = `Popular ${filters.type === "tv" ? "TV Shows" : "Movies"}`;
                }
            }

            DN.renderMovieGrid(grid, movies);
            updatePagination(data.total_pages || 1);
        } catch (err) {
            console.error("Discover load error:", err);

            if (error) {
                error.classList.remove("hidden");
                error.hidden = false;
                error.style.display = "block";

                const text = document.getElementById("discoverErrorText");
                if (text) {
                    text.textContent = err.message || "Failed to load movies.";
                }
            }
        } finally {
            if (loading) {
                loading.classList.add("hidden");
                loading.hidden = true;
                loading.style.display = "none";
            }
        }
    }

    function updatePagination(totalPages) {
        const previous = document.getElementById("previousPageButton");
        const next = document.getElementById("nextPageButton");

        if (previous) {
            previous.disabled = currentPage <= 1;
        }

        if (next) {
            next.disabled = currentPage >= totalPages;
        }
    }

    // Event listeners
    if (genreSelect) {
        genreSelect.addEventListener("change", () => {
            selectedGenre = genreSelect.value;
            syncGenreButtons(selectedGenre);
            currentPage = 1;
            loadMovies();
        });
    }

    [typeSelect, yearSelect, ratingSelect, langSelect, sortSelect].forEach((el) => {
        el?.addEventListener("change", () => {
            currentPage = 1;
            loadMovies();
        });
    });

    document.getElementById("applyFiltersButton")?.addEventListener("click", () => {
        currentPage = 1;
        loadMovies();
    });

    document.getElementById("clearFiltersButton")?.addEventListener("click", () => {
        [
            "discoverType",
            "discoverGenre",
            "discoverYear",
            "discoverRating",
            "discoverLanguage",
            "discoverSort"
        ].forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = id === "discoverSort" ? "popularity.desc" : id === "discoverType" ? "movie" : "";
            }
        });

        selectedGenre = "";
        currentPage = 1;

        if (genreButtons) {
            genreButtons.querySelectorAll(".active").forEach((button) =>
                button.classList.remove("active")
            );
        }

        loadMovies();
    });

    document.getElementById("previousPageButton")?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            loadMovies();
            window.scrollTo({ top: grid?.offsetTop ? grid.offsetTop - 100 : 0, behavior: "smooth" });
        }
    });

    document.getElementById("nextPageButton")?.addEventListener("click", () => {
        currentPage++;
        loadMovies();
        window.scrollTo({ top: grid?.offsetTop ? grid.offsetTop - 100 : 0, behavior: "smooth" });
    });

    document.addEventListener("DOMContentLoaded", async () => {
        await loadGenres();
        await loadMovies();
    });
})();