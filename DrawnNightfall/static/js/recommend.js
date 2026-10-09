(() => {
    "use strict";

    const DN = window.DrawnNightfall;

    const steps =
        document.querySelectorAll(
            ".recommend-step"
        );

    const progressSteps =
        document.querySelectorAll(
            ".recommend-progress-step"
        );

    let currentStep = 1;

    const preferences = {
        mood: "",
        type: "movie",
        rating: "",
        runtime: "",
        genre: ""
    };

    function showStep(step) {
        currentStep = step;

        steps.forEach((item) => {
            item.classList.toggle(
                "active",
                Number(item.dataset.step) === step
            );
        });

        const progressStepsList =
            document.querySelectorAll(
                ".recommend-progress-step, .progress-dot"
            );

        progressStepsList.forEach((item) => {
            const number =
                Number(item.dataset.step || item.dataset.progress);

            item.classList.toggle(
                "active",
                number === step
            );

            item.classList.toggle(
                "completed",
                number < step
            );
        });

        const progressLines =
            document.querySelectorAll(
                ".recommend-progress-line, .progress-line"
            );

        progressLines.forEach((line, index) => {
            line.classList.toggle(
                "active",
                index < step - 1
            );
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function enableStepNext(button) {
        const stepContainer = button.closest(".recommend-step");
        if (stepContainer) {
            const nextButton = stepContainer.querySelector(
                ".recommend-next-button"
            );
            if (nextButton) {
                nextButton.disabled = false;
            }
        }
    }

    function setupOptions() {
        document
            .querySelectorAll(
                "[data-mood]"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        document
                            .querySelectorAll(
                                "[data-mood]"
                            )
                            .forEach((item) =>
                                item.classList.remove(
                                    "selected"
                                )
                            );

                        button.classList.add(
                            "selected"
                        );

                        preferences.mood =
                            button.dataset.mood;

                        enableStepNext(button);
                    }
                );
            });

        document
            .querySelectorAll(
                "[data-type]"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        document
                            .querySelectorAll(
                                "[data-type]"
                            )
                            .forEach((item) =>
                                item.classList.remove(
                                    "selected"
                                )
                            );

                        button.classList.add(
                            "selected"
                        );

                        preferences.type =
                            button.dataset.type;

                        enableStepNext(button);
                    }
                );
            });

        document
            .querySelectorAll(
                "[data-rating]"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        document
                            .querySelectorAll(
                                "[data-rating]"
                            )
                            .forEach((item) =>
                                item.classList.remove(
                                    "selected"
                                )
                            );

                        button.classList.add(
                            "selected"
                        );

                        preferences.rating =
                            button.dataset.rating;

                        enableStepNext(button);
                    }
                );
            });

        document
            .querySelectorAll(
                "[data-runtime]"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        document
                            .querySelectorAll(
                                "[data-runtime]"
                            )
                            .forEach((item) =>
                                item.classList.remove(
                                    "selected"
                                )
                            );

                        button.classList.add(
                            "selected"
                        );

                        preferences.runtime =
                            button.dataset.runtime;

                        enableStepNext(button);
                    }
                );
            });
    }

    async function loadGenres() {
        const container =
            document.getElementById(
                "recommendGenreOptions"
            );

        if (!container) return;

        try {
            const data =
                await DN.api("/api/genres");

            const genres =
                data.genres || data || [];

            container.innerHTML =
                genres
                    .map(
                        (genre) => `
                            <button
                                type="button"
                                class="recommend-genre-option"
                                data-genre="${genre.id}"
                            >
                                ${DN.escapeHTML(
                                    genre.name
                                )}
                            </button>
                        `
                    )
                    .join("");

            container
                .querySelectorAll(
                    "[data-genre]"
                )
                .forEach((button) => {
                    button.addEventListener(
                        "click",
                        () => {
                            container
                                .querySelectorAll(
                                    ".selected"
                                )
                                .forEach((item) =>
                                    item.classList.remove(
                                        "selected"
                                    )
                                );

                            button.classList.add(
                                "selected"
                            );

                            preferences.genre =
                                button.dataset.genre;
                        }
                    );
                });
        } catch (error) {
            console.error(error);
        }
    }

    function setupNextButtons() {
        document
            .querySelectorAll(
                ".recommend-next-button"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        if (
                            currentStep <
                            steps.length
                        ) {
                            showStep(
                                currentStep + 1
                            );
                        }
                    }
                );
            });

        document
            .querySelectorAll(
                ".recommend-back-button"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        if (
                            currentStep > 1
                        ) {
                            showStep(
                                currentStep - 1
                            );
                        }
                    }
                );
            });
    }

    async function getRecommendations() {
        const button =
            document.getElementById(
                "getRecommendationsButton"
            );

        const loading =
            document.getElementById(
                "recommendLoading"
            );

        const error =
            document.getElementById(
                "recommendError"
            );

        const section =
            document.getElementById(
                "recommendResultsSection"
            );

        const grid =
            document.getElementById(
                "recommendMovieGrid"
            );

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

        if (button) {
            button.disabled = true;
        }

        try {
            const params = new URLSearchParams();

            Object.entries(preferences).forEach(([key, value]) => {
                if (value) {
                    params.set(key, value);
                }
            });

            let data = await DN.api(`/api/discover?${params}`);
            let movies = data?.results || [];

            // If 0 movies found with strict filters, gracefully relax filters
            if (movies.length === 0 && params.has("runtime")) {
                const p2 = new URLSearchParams(params);
                p2.delete("runtime");
                const d2 = await DN.api(`/api/discover?${p2}`);
                if (d2?.results?.length) movies = d2.results;
            }

            if (movies.length === 0 && params.has("rating")) {
                const p3 = new URLSearchParams(params);
                p3.delete("runtime");
                p3.delete("rating");
                const d3 = await DN.api(`/api/discover?${p3}`);
                if (d3?.results?.length) movies = d3.results;
            }

            if (movies.length === 0) {
                const p4 = new URLSearchParams();
                if (preferences.genre) p4.set("genre", preferences.genre);
                else if (preferences.mood) p4.set("mood", preferences.mood);
                if (preferences.type) p4.set("type", preferences.type);
                const d4 = await DN.api(`/api/discover?${p4}`);
                movies = d4?.results || [];
            }

            if (grid) {
                DN.renderMovieGrid(grid, movies);
            }

            const title = document.getElementById("recommendResultsTitle");
            const subtitle = document.getElementById("recommendResultsSubtitle");

            if (title) {
                title.textContent = movies.length
                    ? "Your Recommendations"
                    : "No Perfect Matches Yet";
            }

            if (subtitle) {
                subtitle.textContent = movies.length
                    ? `We found ${movies.length} movies based on your choices.`
                    : "Try changing one or two of your preferences.";
            }

            if (section) {
                section.classList.remove("hidden");
                section.classList.add("visible");
                section.hidden = false;
                section.style.display = "block";

                section.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        } catch (err) {
            console.error("Recommend error:", err);

            if (error) {
                error.classList.remove("hidden");
                error.hidden = false;
                error.style.display = "block";

                const text = document.getElementById("recommendErrorText");
                if (text) {
                    text.textContent = err.message || "Failed to find recommendations.";
                }
            }
        } finally {
            if (loading) {
                loading.classList.add("hidden");
                loading.hidden = true;
                loading.style.display = "none";
            }

            if (button) {
                button.disabled = false;
            }
        }
    }

    document
        .getElementById(
            "getRecommendationsButton"
        )
        ?.addEventListener(
            "click",
            getRecommendations
        );

    document
        .getElementById(
            "restartRecommendationButton"
        )
        ?.addEventListener(
            "click",
            () => {
                Object.keys(preferences)
                    .forEach(
                        (key) => {
                            preferences[key] =
                                key === "type"
                                    ? "movie"
                                    : "";
                        }
                    );

                document
                    .querySelectorAll(
                        ".selected"
                    )
                    .forEach((item) =>
                        item.classList.remove(
                            "selected"
                        )
                    );

                const section =
                    document.getElementById(
                        "recommendResultsSection"
                    );

                if (section) {
                    section.hidden = true;
                    section.classList.remove(
                        "visible"
                    );
                }

                document
                    .querySelectorAll(
                        ".recommend-next-button"
                    )
                    .forEach((btn) => {
                        btn.disabled = true;
                    });

                showStep(1);
            }
        );

    document.addEventListener(
        "DOMContentLoaded",
        async () => {
            setupOptions();
            setupNextButtons();
            await loadGenres();
            showStep(1);
        }
    );
})();