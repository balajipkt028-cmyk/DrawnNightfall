(() => {
    "use strict";

    const DN = window.DrawnNightfall;

    let movie1 = null;
    let movie2 = null;

    const compareButton = document.getElementById("compareButton");
    const compareResultsSection = document.getElementById("compareResultsSection");
    const compareLoading = document.getElementById("compareLoading");
    const compareError = document.getElementById("compareError");
    const compareAgainButton = document.getElementById("compareAgainButton");

    function checkReady() {
        if (compareButton) {
            compareButton.disabled = !(movie1 && movie2);
        }
    }

    function setupSearch(number) {
        const input = document.getElementById(`movieSearch${number}`);
        const button = document.getElementById(`movieSearchButton${number}`);
        const results = document.getElementById(`movieSearchResults${number}`);

        if (!input || !results) return;

        let debounceTimer = null;

        async function doSearch() {
            const query = input.value.trim();
            if (!query) {
                results.innerHTML = "";
                results.style.display = "none";
                return;
            }

            results.style.display = "block";
            results.innerHTML = `
                <div class="loading-state" style="padding:15px;text-align:center;">
                    <div class="spinner" style="width:24px;height:24px;margin:0 auto 8px;"></div>
                    <small>Searching...</small>
                </div>
            `;

            try {
                const movies = await DN.search(query);
                const candidates = Array.isArray(movies) ? movies.slice(0, 7) : [];

                if (candidates.length === 0) {
                    results.innerHTML = `
                        <div style="padding:15px;text-align:center;color:#888;">
                            No movies found for "${DN.escapeHTML(query)}"
                        </div>
                    `;
                    return;
                }

                results.innerHTML = candidates
                    .map((movie) => {
                        const title = movie.title || movie.name || "Untitled";
                        const year = DN.year(movie.release_date || movie.first_air_date);
                        const poster = movie.poster_path ? DN.poster(movie.poster_path, "w92") : "";

                        return `
                            <button
                                type="button"
                                class="movie-search-result"
                                data-id="${movie.id}"
                                data-number="${number}"
                            >
                                <div class="movie-search-result-poster">
                                    ${poster ? `<img src="${poster}" alt="" loading="lazy">` : `<div style="font-size:1.5rem;text-align:center;line-height:60px;">🎬</div>`}
                                </div>
                                <div class="movie-search-result-info">
                                    <div class="movie-search-result-title">${DN.escapeHTML(title)}</div>
                                    <div class="movie-search-result-meta">
                                        ⭐ ${DN.rating(movie.vote_average)} • ${year}
                                    </div>
                                </div>
                            </button>
                        `;
                    })
                    .join("");

                results.querySelectorAll("[data-id]").forEach((item) => {
                    item.addEventListener("click", () => {
                        selectMovie(item.dataset.number, item.dataset.id);
                    });
                });
            } catch (err) {
                console.error("Compare search error:", err);
                results.innerHTML = `
                    <div style="padding:15px;text-align:center;color:#ff5555;">
                        ${DN.escapeHTML(err.message || "Search failed")}
                    </div>
                `;
            }
        }

        // Search button click
        button?.addEventListener("click", doSearch);

        // Enter key
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                doSearch();
            }
        });

        // Live input debounce
        input.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            if (input.value.trim().length >= 2) {
                debounceTimer = setTimeout(doSearch, 350);
            } else {
                results.innerHTML = "";
                results.style.display = "none";
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (!results.contains(e.target) && e.target !== input && e.target !== button) {
                results.style.display = "none";
            }
        });
    }

    async function selectMovie(number, idOrMovie) {
        const num = String(number);
        const results = document.getElementById(`movieSearchResults${num}`);
        const selected = document.getElementById(`selectedMovie${num}`);
        const input = document.getElementById(`movieSearch${num}`);

        if (results) {
            results.innerHTML = "";
            results.style.display = "none";
        }

        try {
            let movie = idOrMovie;
            if (typeof idOrMovie === "string" || typeof idOrMovie === "number") {
                movie = await DN.api(`/api/movie/${idOrMovie}`);
            }

            if (num === "1") {
                movie1 = movie;
            } else {
                movie2 = movie;
            }

            const title = movie.title || movie.name || "Untitled";
            const year = DN.year(movie.release_date || movie.first_air_date);
            const poster = movie.poster_path ? DN.poster(movie.poster_path, "w185") : "";

            if (input) {
                input.value = title;
            }

            if (selected) {
                selected.classList.add("visible");
                selected.style.display = "flex";
                selected.innerHTML = `
                    <div class="selected-movie-poster">
                        ${poster ? `<img src="${poster}" alt="${DN.escapeHTML(title)}">` : `<div style="font-size:2rem;text-align:center;line-height:86px;">🎬</div>`}
                    </div>
                    <div class="selected-movie-info" style="flex:1;">
                        <h4 class="selected-movie-title">${DN.escapeHTML(title)}</h4>
                        <div class="selected-movie-meta">
                            ⭐ ${DN.rating(movie.vote_average)} • 📅 ${year}
                        </div>
                    </div>
                    <button type="button" class="secondary-button" style="padding:4px 10px;font-size:0.75rem;" id="clearMovie${num}">
                        ✕ Change
                    </button>
                `;

                document.getElementById(`clearMovie${num}`)?.addEventListener("click", () => {
                    clearMovie(num);
                });
            }

            checkReady();
        } catch (error) {
            console.error("Select movie error:", error);
        }
    }

    function clearMovie(num) {
        if (num === "1") movie1 = null;
        else movie2 = null;

        const input = document.getElementById(`movieSearch${num}`);
        const selected = document.getElementById(`selectedMovie${num}`);

        if (input) input.value = "";
        if (selected) {
            selected.classList.remove("visible");
            selected.style.display = "none";
            selected.innerHTML = `
                <div class="selected-movie-placeholder">
                    <span>🎬</span>
                    <p>Search and choose ${num === "1" ? "first" : "second"} movie</p>
                </div>
            `;
        }

        checkReady();
    }

    async function compare() {
        if (!movie1 || !movie2) {
            alert("Please choose both movies first to run comparison.");
            return;
        }

        if (compareLoading) {
            compareLoading.classList.remove("hidden");
            compareLoading.hidden = false;
            compareLoading.style.display = "flex";
        }
        if (compareError) {
            compareError.classList.add("hidden");
            compareError.hidden = true;
            compareError.style.display = "none";
        }

        try {
            const data = await DN.api(`/api/compare?movie1=${movie1.id}&movie2=${movie2.id}`);
            renderComparison(data);

            if (compareResultsSection) {
                compareResultsSection.classList.remove("hidden");
                compareResultsSection.classList.add("visible");
                compareResultsSection.hidden = false;
                compareResultsSection.style.display = "block";
                compareResultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        } catch (err) {
            console.error("Compare error:", err);
            if (compareError) {
                compareError.classList.remove("hidden");
                compareError.hidden = false;
                compareError.style.display = "block";
                const text = document.getElementById("compareErrorText");
                if (text) text.textContent = err.message || "Comparison failed.";
            }
        } finally {
            if (compareLoading) {
                compareLoading.classList.add("hidden");
                compareLoading.hidden = true;
                compareLoading.style.display = "none";
            }
        }
    }

    function renderComparison(data) {
        const m1 = data.movie1 || movie1;
        const m2 = data.movie2 || movie2;
        const winner = data.winner;
        const score1 = Number(data.score1 || 0).toFixed(1);
        const score2 = Number(data.score2 || 0).toFixed(1);

        // Winner Banner
        const winnerEl = document.getElementById("compareWinner");
        if (winnerEl) {
            const isTie = winner === "It's a tie!";
            const winnerTitle = isTie ? "It's a Dead Heat Tie!" : winner;
            winnerEl.innerHTML = `
                <div class="compare-winner-label">🏆 THE VERDICT</div>
                <h3 class="compare-winner-title">
                    ${isTie ? "🤝 Perfect Tie!" : `🎉 Winner: ${DN.escapeHTML(winnerTitle)}`}
                </h3>
                <p style="margin:8px 0 0;color:#aaa;font-size:0.9rem;">
                    Nightfall Comparison Score: <strong style="color:#e50914;">${score1}</strong> vs <strong style="color:#3b82f6;">${score2}</strong>
                </p>
            `;
        }

        // Score Cards
        const card1 = document.getElementById("comparisonMovie1");
        if (card1) {
            const poster1 = m1.poster_path ? DN.poster(m1.poster_path, "w342") : "";
            card1.innerHTML = `
                <div style="width:140px;height:200px;margin:0 auto;border-radius:10px;overflow:hidden;border:2px solid rgba(229,9,20,0.5);box-shadow:0 8px 25px rgba(229,9,20,0.2);">
                    ${poster1 ? `<img src="${poster1}" alt="" style="width:100%;height:100%;object-fit:cover;">` : `<div style="line-height:200px;font-size:3rem;background:#222;">🎬</div>`}
                </div>
                <div class="comparison-movie-title" style="color:#ff6b6b;">${DN.escapeHTML(m1.title || m1.name)}</div>
                <div style="font-size:1.4rem;font-weight:900;color:#ffd166;margin-top:4px;">${score1} pts</div>
                <a href="/movie?id=${encodeURIComponent(m1.id)}" class="secondary-button" style="margin-top:8px;padding:5px 12px;font-size:0.75rem;display:inline-block;">🎬 View Movie</a>
            `;
        }

        const card2 = document.getElementById("comparisonMovie2");
        if (card2) {
            const poster2 = m2.poster_path ? DN.poster(m2.poster_path, "w342") : "";
            card2.innerHTML = `
                <div style="width:140px;height:200px;margin:0 auto;border-radius:10px;overflow:hidden;border:2px solid rgba(59,130,246,0.5);box-shadow:0 8px 25px rgba(59,130,246,0.2);">
                    ${poster2 ? `<img src="${poster2}" alt="" style="width:100%;height:100%;object-fit:cover;">` : `<div style="line-height:200px;font-size:3rem;background:#222;">🎬</div>`}
                </div>
                <div class="comparison-movie-title" style="color:#60a5fa;">${DN.escapeHTML(m2.title || m2.name)}</div>
                <div style="font-size:1.4rem;font-weight:900;color:#ffd166;margin-top:4px;">${score2} pts</div>
                <a href="/movie?id=${encodeURIComponent(m2.id)}" class="secondary-button" style="margin-top:8px;padding:5px 12px;font-size:0.75rem;display:inline-block;">🎬 View Movie</a>
            `;
        }

        setText("comparisonScore", `${score1} - ${score2}`);

        // Table Header
        setText("comparisonTableMovie1", m1.title || m1.name);
        setText("comparisonTableMovie2", m2.title || m2.name);

        // Rating
        const r1 = Number(m1.vote_average || 0);
        const r2 = Number(m2.vote_average || 0);
        setStatRow("comparisonRating1", "comparisonRating2", `⭐ ${DN.rating(r1)}`, `⭐ ${DN.rating(r2)}`, r1, r2);

        // Votes
        const v1 = Number(m1.vote_count || 0);
        const v2 = Number(m2.vote_count || 0);
        setStatRow("comparisonVotes1", "comparisonVotes2", `👥 ${v1.toLocaleString()}`, `👥 ${v2.toLocaleString()}`, v1, v2);

        // Popularity
        const p1 = Number(m1.popularity || 0);
        const p2 = Number(m2.popularity || 0);
        setStatRow("comparisonPopularity1", "comparisonPopularity2", `🔥 ${p1.toFixed(1)}`, `🔥 ${p2.toFixed(1)}`, p1, p2);

        // Runtime
        setText("comparisonRuntime1", `⏱️ ${DN.runtime(m1.runtime)}`);
        setText("comparisonRuntime2", `⏱️ ${DN.runtime(m2.runtime)}`);

        // Release Date
        setText("comparisonRelease1", `📅 ${DN.date(m1.release_date || m1.first_air_date)}`);
        setText("comparisonRelease2", `📅 ${DN.date(m2.release_date || m2.first_air_date)}`);

        // Genres
        setText("comparisonGenres1", (m1.genres || []).map((g) => g.name).join(", ") || "N/A");
        setText("comparisonGenres2", (m2.genres || []).map((g) => g.name).join(", ") || "N/A");
    }

    function setStatRow(id1, id2, text1, text2, val1, val2) {
        const el1 = document.getElementById(id1);
        const el2 = document.getElementById(id2);
        if (el1) {
            el1.textContent = text1;
            el1.classList.toggle("stat-winner", val1 > val2);
        }
        if (el2) {
            el2.textContent = text2;
            el2.classList.toggle("stat-winner", val2 > val1);
        }
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? "—";
    }

    // Setup Presets
    document.querySelectorAll(".preset-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const q1 = btn.dataset.m1;
            const q2 = btn.dataset.m2;
            if (!q1 || !q2) return;

            try {
                const res1 = await DN.search(q1);
                const res2 = await DN.search(q2);
                if (res1.length && res2.length) {
                    await selectMovie(1, res1[0].id);
                    await selectMovie(2, res2[0].id);
                    await compare();
                }
            } catch (err) {
                console.error("Preset load error:", err);
            }
        });
    });

    setupSearch(1);
    setupSearch(2);

    compareButton?.addEventListener("click", compare);

    compareAgainButton?.addEventListener("click", () => {
        clearMovie("1");
        clearMovie("2");
        if (compareResultsSection) {
            compareResultsSection.classList.add("hidden");
            compareResultsSection.classList.remove("visible");
            compareResultsSection.style.display = "none";
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    async function initFromUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            const m1 = params.get("movie1") || params.get("m1");
            const m2 = params.get("movie2") || params.get("m2");

            if (m1) await selectMovie(1, m1);
            if (m2) await selectMovie(2, m2);
            if (m1 && m2) await compare();
        } catch (err) {
            console.error("URL init compare error:", err);
        }
    }

    document.addEventListener("DOMContentLoaded", initFromUrl);
})();