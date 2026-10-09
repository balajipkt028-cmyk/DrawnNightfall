(() => {
    "use strict";

    const DN = window.DrawnNightfall;

    const spinButton = document.getElementById("spinButton");
    const spinAgain = document.getElementById("spinAgainButton");
    const viewMovie = document.getElementById("viewMovieButton");
    const wheelStage = document.getElementById("rouletteWheelStage");
    const choicesSection = document.getElementById("rouletteChoicesSection");
    const choicesGrid = document.getElementById("rouletteChoicesGrid");
    const countdownEl = document.getElementById("rouletteCountdown");
    const timerBar = document.getElementById("rouletteTimerBar");
    const resultSection = document.getElementById("rouletteResultSection");
    const result = document.getElementById("rouletteResult");
    const winnerTitle = document.getElementById("rouletteWinnerTitle");
    const error = document.getElementById("rouletteError");

    let selectedMovie = null;
    let candidateMovies = [];
    let countdownInterval = null;
    let autoPickTimeout = null;
    let isAutoPicking = false;

    function clearTimers() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (autoPickTimeout) {
            clearTimeout(autoPickTimeout);
            autoPickTimeout = null;
        }
    }

    async function spin() {
        clearTimers();
        isAutoPicking = false;

        if (spinButton) spinButton.disabled = true;
        if (spinAgain) spinAgain.disabled = true;

        // Hide previous results & choices
        if (choicesSection) {
            choicesSection.classList.add("hidden");
            choicesSection.classList.remove("visible");
            choicesSection.style.display = "none";
        }
        if (resultSection) {
            resultSection.classList.add("hidden");
            resultSection.classList.remove("visible");
            resultSection.style.display = "none";
        }
        if (error) {
            error.classList.add("hidden");
            error.hidden = true;
            error.style.display = "none";
        }

        // Show spinning wheel stage
        if (wheelStage) {
            wheelStage.classList.remove("hidden");
            wheelStage.classList.add("visible");
            wheelStage.style.display = "block";
            wheelStage.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        const startTime = Date.now();

        try {
            const genre = document.getElementById("rouletteGenre")?.value || "";
            const rating = document.getElementById("rouletteRating")?.value || "";
            const period = document.getElementById("roulettePeriod")?.value || "";
            const type = document.getElementById("rouletteType")?.value || "movie";

            const params = new URLSearchParams();
            params.set("count", "3");
            if (genre) params.set("genre", genre);
            if (rating) params.set("rating", rating);
            if (period) params.set("period", period);
            if (type) params.set("type", type);

            const data = await DN.api(`/api/random-movie?${params}`);

            let movies = [];
            if (data?.movies && Array.isArray(data.movies)) {
                movies = data.movies;
            } else if (Array.isArray(data)) {
                movies = data;
            } else if (data?.id) {
                movies = [data];
            }

            // Ensure we have at least 1 movie, preferably 3
            if (!movies || movies.length === 0) {
                throw new Error("No movies matched your filters. Try relaxing the filters.");
            }

            candidateMovies = movies;

            // Guarantee spinning animation shows for at least 1600ms
            const elapsed = Date.now() - startTime;
            const remainingSpin = Math.max(0, 1600 - elapsed);
            await new Promise((resolve) => setTimeout(resolve, remainingSpin));

            // Hide spinning wheel stage
            if (wheelStage) {
                wheelStage.classList.add("hidden");
                wheelStage.classList.remove("visible");
                wheelStage.style.display = "none";
            }

            // Display the 3 choices
            renderChoices(candidateMovies);

        } catch (err) {
            console.error("Roulette spin error:", err);
            if (wheelStage) {
                wheelStage.classList.add("hidden");
                wheelStage.classList.remove("visible");
                wheelStage.style.display = "none";
            }
            if (error) {
                error.classList.remove("hidden");
                error.hidden = false;
                error.style.display = "block";
                const text = document.getElementById("rouletteErrorText");
                if (text) text.textContent = err.message || "Failed to spin roulette.";
                error.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        } finally {
            if (spinButton) spinButton.disabled = false;
            if (spinAgain) spinAgain.disabled = false;
        }
    }

    function renderChoices(movies) {
        if (!choicesSection || !choicesGrid) return;

        choicesGrid.innerHTML = "";
        clearTimers();

        choicesSection.classList.remove("hidden");
        choicesSection.classList.add("visible");
        choicesSection.style.display = "block";
        choicesSection.scrollIntoView({ behavior: "smooth", block: "start" });

        movies.forEach((movie, index) => {
            const title = movie.title || movie.name || "Untitled";
            const poster = movie.poster_path ? DN.poster(movie.poster_path, "w500") : "";
            const rating = DN.rating(movie.vote_average);
            const year = DN.year(movie.release_date || movie.first_air_date);
            const overview = DN.truncate(movie.overview || "No overview available.", 140);

            const card = document.createElement("div");
            card.className = "roulette-choice-card";
            card.dataset.index = String(index);

            card.innerHTML = `
                <div class="roulette-choice-poster">
                    ${poster ? `<img src="${poster}" alt="${DN.escapeHTML(title)} poster" loading="lazy">` : `<div class="movie-card-fallback">🎬</div>`}
                    <span class="roulette-choice-badge">⭐ ${rating}</span>
                    <span class="roulette-choice-candidate-num">#0${index + 1}</span>
                </div>
                <div class="roulette-choice-info">
                    <h3 class="roulette-choice-title">${DN.escapeHTML(title)}</h3>
                    <div class="roulette-choice-meta">
                        <span>📅 ${year}</span>
                        <span>⭐ ${rating} / 10</span>
                    </div>
                    <p class="roulette-choice-overview">${DN.escapeHTML(overview)}</p>
                    <button type="button" class="roulette-pick-btn" data-pick-index="${index}">
                        👉 Pick This Movie
                    </button>
                </div>
            `;

            // Card click listener
            card.addEventListener("click", () => {
                if (isAutoPicking) return;
                chooseMovie(movie, card);
            });

            choicesGrid.appendChild(card);
        });

        startCountdown(movies);
    }

    function startCountdown(movies) {
        let timeLeft = 7;
        if (countdownEl) countdownEl.textContent = String(timeLeft);
        if (timerBar) timerBar.style.width = "100%";

        const stepMs = 1000;
        countdownInterval = setInterval(() => {
            timeLeft--;
            if (countdownEl) countdownEl.textContent = String(timeLeft);
            if (timerBar) {
                const percent = Math.max(0, (timeLeft / 7) * 100);
                timerBar.style.width = `${percent}%`;
            }

            if (timeLeft <= 0) {
                clearTimers();
                performAutoPick(movies);
            }
        }, stepMs);
    }

    function performAutoPick(movies) {
        if (isAutoPicking) return;
        isAutoPicking = true;

        if (countdownEl) countdownEl.textContent = "0 (Auto-Selecting!)";

        const cards = choicesGrid.querySelectorAll(".roulette-choice-card");
        if (!cards.length) return;

        // Visual cycling animation before settling on a random winner
        const winnerIndex = Math.floor(Math.random() * movies.length);
        let currentIndex = 0;
        let hops = 0;
        const totalHops = 8 + winnerIndex;

        const cycleInterval = setInterval(() => {
            cards.forEach((c) => c.classList.remove("highlighted"));
            const activeCard = cards[currentIndex % cards.length];
            if (activeCard) activeCard.classList.add("highlighted");

            currentIndex++;
            hops++;

            if (hops >= totalHops) {
                clearInterval(cycleInterval);
                const winningCard = cards[winnerIndex];
                const winningMovie = movies[winnerIndex];
                chooseMovie(winningMovie, winningCard, true);
            }
        }, 130);
    }

    function chooseMovie(movie, cardElement, isAuto = false) {
        clearTimers();
        isAutoPicking = false;
        selectedMovie = movie;

        // Highlight chosen card
        if (choicesGrid) {
            choicesGrid.querySelectorAll(".roulette-choice-card").forEach((c) => {
                c.classList.remove("highlighted");
                c.classList.remove("chosen");
            });
        }
        if (cardElement) {
            cardElement.classList.add("chosen");
        }

        setTimeout(() => {
            renderFinalResult(movie, isAuto);
        }, 350);
    }

    function renderFinalResult(movie, isAuto = false) {
        if (!result || !movie || !resultSection) return;

        const title = movie.title || movie.name || "Untitled";
        const date = movie.release_date || movie.first_air_date || "";
        const rating = DN.rating(movie.vote_average);
        const year = DN.year(date);

        if (winnerTitle) {
            winnerTitle.textContent = isAuto
                ? "Tonight's Pick (Auto-Selected)"
                : "Tonight's Pick (Your Choice)";
        }

        result.innerHTML = `
            <div class="roulette-result-poster">
                ${movie.poster_path ? `
                    <img src="${DN.poster(movie.poster_path, "w500")}" alt="${DN.escapeHTML(title)}">
                ` : `
                    <div class="movie-card-fallback" style="height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;">🎬</div>
                `}
            </div>

            <div class="roulette-result-info">
                <span class="roulette-result-kicker">
                    ${isAuto ? "🎲 Auto-Decided By Nightfall" : "🏆 Your Selected Pick"}
                </span>

                <h2 class="roulette-result-title">
                    ${DN.escapeHTML(title)}
                </h2>

                <div class="roulette-result-meta">
                    <span class="roulette-result-rating">
                        ⭐ ${rating} / 10
                    </span>
                    <span>
                        📅 ${year}
                    </span>
                    ${movie.vote_count ? `<span>🗳️ ${Number(movie.vote_count).toLocaleString()} votes</span>` : ""}
                </div>

                <p class="roulette-result-overview">
                    ${DN.escapeHTML(movie.overview || "No plot overview available for this movie.")}
                </p>
            </div>
        `;

        if (viewMovie) {
            viewMovie.href = `/movie?id=${encodeURIComponent(movie.id)}`;
        }

        resultSection.classList.remove("hidden");
        resultSection.classList.add("visible");
        resultSection.style.display = "block";
        resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function loadGenres() {
        const select = document.getElementById("rouletteGenre");
        if (!select) return;

        try {
            const data = await DN.api("/api/genres");
            const genres = data?.genres || data || [];
            if (Array.isArray(genres)) {
                genres.forEach((g) => {
                    const option = document.createElement("option");
                    option.value = String(g.id);
                    option.textContent = g.name;
                    select.appendChild(option);
                });
            }
        } catch (err) {
            console.error("Failed to load roulette genres:", err);
        }
    }

    if (spinButton) spinButton.addEventListener("click", spin);
    if (spinAgain) spinAgain.addEventListener("click", spin);

    if (viewMovie) {
        viewMovie.addEventListener("click", (e) => {
            if (selectedMovie?.id) {
                e.preventDefault();
                DN.openMovie(selectedMovie.id);
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        loadGenres();
    });
})();