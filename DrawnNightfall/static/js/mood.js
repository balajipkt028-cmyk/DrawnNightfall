(() => {
    "use strict";

    const DN = window.DrawnNightfall;

    const buttons = document.querySelectorAll("[data-mood]");
    const section = document.getElementById("moodResultsSection");
    const grid = document.getElementById("moodMovieGrid");
    const title = document.getElementById("moodResultsTitle");
    const subtitle = document.getElementById("moodResultsSubtitle");
    const kicker = document.getElementById("moodResultsKicker");
    const loading = document.getElementById("moodLoading");
    const error = document.getElementById("moodError");

    const MOOD_EMOJIS = {
        happy: "☀️",
        emotional: "💔",
        scary: "👻",
        exciting: "⚡",
        romantic: "❤️",
        thoughtful: "🧠",
        funny: "😂",
        dark: "🌑",
        "feel-good": "🌈",
        disturbing: "🩸"
    };

    async function loadMood(mood) {
        if (!grid) return;

        // Reveal section
        if (section) {
            section.classList.remove("hidden");
            section.hidden = false;
            section.style.display = "block";
        }

        // Show loading state
        if (loading) {
            loading.classList.remove("hidden");
            loading.hidden = false;
            loading.style.display = "flex";
        }

        // Hide previous error
        if (error) {
            error.classList.add("hidden");
            error.hidden = true;
            error.style.display = "none";
        }

        grid.innerHTML = "";

        const emoji = MOOD_EMOJIS[mood] || "🎬";
        const formattedName = mood
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

        if (title) {
            title.textContent = `${emoji} ${formattedName} Movies`;
        }

        if (subtitle) {
            subtitle.textContent = `Handpicked movies that match your ${formattedName.toLowerCase()} vibe tonight.`;
        }

        if (kicker) {
            kicker.textContent = `MOOD: ${formattedName.toUpperCase()}`;
        }

        section?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        try {
            const data = await DN.api(`/api/mood/${encodeURIComponent(mood)}`);
            const movies = Array.isArray(data) ? data : data.results || [];

            if (movies.length === 0) {
                throw new Error(`No movies found for ${formattedName} mood.`);
            }

            DN.renderMovieGrid(grid, movies);
        } catch (err) {
            console.error("Mood movies fetch error:", err);

            if (error) {
                error.classList.remove("hidden");
                error.hidden = false;
                error.style.display = "block";

                const text = document.getElementById("moodErrorText");
                if (text) {
                    text.textContent = err.message || "Failed to load movies for this mood.";
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

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            buttons.forEach((item) => item.classList.remove("active"));
            button.classList.add("active");

            const mood = button.dataset.mood;
            if (mood) {
                loadMood(mood);
            }
        });
    });
})();