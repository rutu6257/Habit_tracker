const API_URL = "http://localhost:5000/api/habits";

const habitForm = document.getElementById("habitForm");
const habitList = document.getElementById("habitList");
const message = document.getElementById("message");

const searchHabit = document.getElementById("searchHabit");
const categoryFilter = document.getElementById("categoryFilter");


// =====================================================
// ADD NEW HABIT
// =====================================================

habitForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const habitName =
        document.getElementById("habitName").value.trim();

    const description =
        document.getElementById("description").value.trim();

    const category =
        document.getElementById("category").value;

    if (!habitName) {
        showMessage("Habit name is required.");
        return;
    }

    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                habit_name: habitName,
                description: description,
                category: category
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Failed to add habit.");
            return;
        }

        showMessage("Habit added successfully!");

        habitForm.reset();

        await loadHabits();
        await loadDashboard();

    } catch (error) {

        console.error("Error adding habit:", error);

        showMessage("Cannot connect to the backend.");
    }
});


// =====================================================
// MESSAGE
// =====================================================

function showMessage(text) {

    if (!message) return;

    message.textContent = text;

    setTimeout(() => {

        message.textContent = "";

    }, 3000);
}


// =====================================================
// LOAD ALL HABITS
// =====================================================

async function loadHabits() {

    try {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Failed to fetch habits");
        }

        const habits = await response.json();

        habitList.innerHTML = "";

        if (habits.length === 0) {

            habitList.innerHTML =
                "<p>No habits added yet.</p>";

            return;
        }

        for (const habit of habits) {

            createHabitCard(habit);
        }

        filterHabits();

    } catch (error) {

        console.error("Error loading habits:", error);

        habitList.innerHTML =
            "<p>Unable to load habits.</p>";
    }
}


// =====================================================
// CREATE HABIT CARD
// =====================================================

function createHabitCard(habit) {

    const habitDiv =
        document.createElement("div");

    habitDiv.className = "habit-item";

    const category =
        habit.category || "Other";

    habitDiv.innerHTML = `

        <h3>${escapeHTML(habit.habit_name)}</h3>

        <p>
            ${escapeHTML(habit.description || "No description")}
        </p>

        <span class="category-badge">
            ${escapeHTML(category)}
        </span>

        <h4>Weekly Progress</h4>

        <div
            class="week-days"
            id="week-${habit.id}">
        </div>

        <p
            class="streak"
            id="streak-${habit.id}">
            🔥 Streak: 0 days
        </p>
        <div class="habit-completion">
    <div class="completion-header">
        <span>Completion</span>
        <strong id="completion-${habit.id}">
            0%
        </strong>
    </div>

    <div class="completion-bar">
        <div
            class="completion-fill"
            id="completion-bar-${habit.id}"
            style="width: 0%">
        </div>
    </div>
</div>

        <div class="habit-actions">

            <button
                type="button"
                class="history-button"
                onclick="loadHistory(${habit.id})">
                View History
            </button>

            <button
                type="button"
                class="edit-button"
                onclick="editHabit(${habit.id})">
                Edit Habit
            </button>

            <button
                type="button"
                class="delete-button"
                onclick="deleteHabit(${habit.id})">
                Delete Habit
            </button>

        </div>

        <div
            class="history"
            id="history-${habit.id}">
        </div>
    `;

    habitList.appendChild(habitDiv);

    loadWeeklyProgress(habit.id);

    loadStreak(habit.id);
    loadCompletionPercentage(habit.id);
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    const div = document.createElement("div");

    div.textContent = value;

    return div.innerHTML;
}


// =====================================================
// GET MONDAY
// =====================================================

function getMonday(date) {

    const result = new Date(date);

    result.setHours(0, 0, 0, 0);

    const day = result.getDay();

    const difference =
        day === 0 ? -6 : 1 - day;

    result.setDate(
        result.getDate() + difference
    );

    return result;
}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// =====================================================
// FORMAT DATABASE DATE
// =====================================================

function formatDatabaseDate(dateValue) {

    // MySQL DATE normally comes as YYYY-MM-DD
    if (typeof dateValue === "string") {
        return dateValue.substring(0, 10);
    }

    // If MySQL returns a Date object,
    // use local date values to avoid timezone shifting.
    if (dateValue instanceof Date) {

        const year =
            dateValue.getFullYear();

        const month =
            String(dateValue.getMonth() + 1)
                .padStart(2, "0");

        const day =
            String(dateValue.getDate())
                .padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    return "";
}

// =====================================================
// WEEKLY PROGRESS
// =====================================================

async function loadWeeklyProgress(habitId) {

    try {

        const response = await fetch(
            `${API_URL}/${habitId}/completions`
        );

        const completions =
            await response.json();

        const completedDates =
            completions
                .filter(item => item.status)
                .map(item =>
                    formatDatabaseDate(
                        item.completion_date
                    )
                );

        const weekContainer =
            document.getElementById(
                `week-${habitId}`
            );

        if (!weekContainer) {
            return;
        }

        weekContainer.innerHTML = "";

        const today = new Date();

        const monday =
            getMonday(today);

        const dayNames = [
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun"
        ];

        for (let i = 0; i < 7; i++) {

            const currentDate =
                new Date(monday);

            currentDate.setDate(
                monday.getDate() + i
            );

            const dateString =
                formatDate(currentDate);

            const button =
                document.createElement("button");

            button.type = "button";

            button.textContent =
                `${dayNames[i]} ${currentDate.getDate()}`;

            if (
                completedDates.includes(
                    dateString
                )
            ) {

                button.classList.add(
                    "completed"
                );
            }

            button.onclick = function () {

                completeHabit(
                    habitId,
                    dateString
                );
            };

            weekContainer.appendChild(button);
        }

    } catch (error) {

        console.error(
            "Error loading weekly progress:",
            error
        );
    }
}


// =====================================================
// COMPLETE HABIT
// =====================================================

async function completeHabit(
    habitId,
    completionDate
) {

    try {

        const response = await fetch(
            `${API_URL}/${habitId}/complete`,
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    completion_date:
                        completionDate
                })
            }
        );

        const data =
            await response.json();

        showMessage(data.message);

        if (response.ok) {

            await loadWeeklyProgress(habitId);

            await loadStreak(habitId);

            await loadDashboard();

            await loadProgressOverview();
        }

    } catch (error) {

        console.error(
            "Error completing habit:",
            error
        );

        showMessage(
            "Cannot connect to the backend."
        );
    }
}


// =====================================================
// LOAD STREAK
// =====================================================

async function loadStreak(habitId) {

    try {

        const response = await fetch(
            `${API_URL}/${habitId}/streak`
        );

        const data =
            await response.json();

        const streakElement =
            document.getElementById(
                `streak-${habitId}`
            );

        if (streakElement) {

            streakElement.textContent =
                `🔥 Streak: ${data.streak} days`;
        }

    } catch (error) {

        console.error(
            "Error loading streak:",
            error
        );
    }
}


// =====================================================
// LOAD HISTORY
// =====================================================

async function loadHistory(habitId) {

    try {

        const response = await fetch(
            `${API_URL}/${habitId}/history`
        );

        const history =
            await response.json();

        const historyElement =
            document.getElementById(
                `history-${habitId}`
            );

        if (!historyElement) {
            return;
        }

        if (history.length === 0) {

            historyElement.innerHTML =
                "<p>No completion history yet.</p>";

            return;
        }

        let historyHTML =
            "<h4>Completion History</h4>";

        historyHTML += "<ul>";

        history.forEach(item => {

            const date =
                formatDatabaseDate(
                    item.completion_date
                );

            historyHTML += `
                <li>
                    ${date} - Completed
                </li>
            `;
        });

        historyHTML += "</ul>";

        historyElement.innerHTML =
            historyHTML;

    } catch (error) {

        console.error(
            "Error loading history:",
            error
        );
    }
}


// =====================================================
// DELETE HABIT
// =====================================================

async function deleteHabit(habitId) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this habit?"
        );

    if (!confirmDelete) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/${habitId}`,
            {
                method: "DELETE"
            }
        );

        const data =
            await response.json();

        showMessage(data.message);

        if (response.ok) {

            await loadHabits();

            await loadDashboard();

            await loadProgressOverview();
        }

    } catch (error) {

        console.error(
            "Error deleting habit:",
            error
        );

        showMessage(
            "Cannot connect to the backend."
        );
    }
}


// =====================================================
// EDIT HABIT
// =====================================================

async function editHabit(habitId) {

    try {

        const response =
            await fetch(API_URL);

        const habits =
            await response.json();

        const habit =
            habits.find(
                item => item.id === habitId
            );

        if (!habit) {

            alert("Habit not found.");

            return;
        }

        const habitName =
            prompt(
                "Enter new habit name:",
                habit.habit_name
            );

        if (habitName === null) {
            return;
        }

        if (habitName.trim() === "") {

            alert(
                "Habit name cannot be empty."
            );

            return;
        }

        const description =
            prompt(
                "Enter new description:",
                habit.description || ""
            );

        if (description === null) {
            return;
        }

        const category =
            prompt(
                "Enter category (Study, Health, Fitness, Personal, Other):",
                habit.category || "Other"
            );

        if (category === null) {
            return;
        }

        const validCategories = [
            "Study",
            "Health",
            "Fitness",
            "Personal",
            "Other"
        ];

        const matchedCategory =
            validCategories.find(
                item =>
                    item.toLowerCase() ===
                    category.trim().toLowerCase()
            );

        const finalCategory =
            matchedCategory || "Other";

        const updateResponse =
            await fetch(
                `${API_URL}/${habitId}`,
                {

                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        habit_name:
                            habitName.trim(),

                        description:
                            description.trim(),

                        category:
                            finalCategory
                    })
                }
            );

        const data =
            await updateResponse.json();

        showMessage(data.message);

        if (updateResponse.ok) {

            await loadHabits();

            await loadDashboard();

            await loadProgressOverview();
        }

    } catch (error) {

        console.error(
            "Error updating habit:",
            error
        );

        showMessage(
            "Cannot connect to the backend."
        );
    }
}


// =====================================================
// DASHBOARD
// =====================================================

async function loadDashboard() {

    try {

        const response =
            await fetch(API_URL);

        const habits =
            await response.json();

        document.getElementById(
            "totalHabits"
        ).textContent =
            habits.length;

        let totalCompletedDays = 0;

        let highestStreak = 0;

        for (const habit of habits) {

            const completionResponse =
                await fetch(
                    `${API_URL}/${habit.id}/completions`
                );

            const completions =
                await completionResponse.json();

            totalCompletedDays +=
                completions.filter(
                    item => item.status
                ).length;


            const streakResponse =
                await fetch(
                    `${API_URL}/${habit.id}/streak`
                );

            const streakData =
                await streakResponse.json();

            if (
                streakData.streak >
                highestStreak
            ) {

                highestStreak =
                    streakData.streak;
            }
        }

        document.getElementById(
            "completedDays"
        ).textContent =
            totalCompletedDays;

        document.getElementById(
            "currentStreak"
        ).textContent =
            highestStreak;

    } catch (error) {

        console.error(
            "Error loading dashboard:",
            error
        );
    }
}


// =====================================================
// PROGRESS OVERVIEW
// =====================================================

async function loadProgressOverview() {

    try {

        const response =
            await fetch(API_URL);

        const habits =
            await response.json();

        const progressContainer =
            document.getElementById(
                "progressOverview"
            );

        if (!progressContainer) {
            return;
        }

        if (habits.length === 0) {

            progressContainer.innerHTML =
                "<p>No habits available yet.</p>";

            return;
        }

        progressContainer.innerHTML = "";

        const today = new Date();

        const monday =
            getMonday(today);

        for (const habit of habits) {

            const completionResponse =
                await fetch(
                    `${API_URL}/${habit.id}/completions`
                );

            const completions =
                await completionResponse.json();

            let completedThisWeek = 0;

            const completedDates =
                completions
                    .filter(item => item.status)
                    .map(item =>
                        formatDatabaseDate(
                            item.completion_date
                        )
                    );

            for (let i = 0; i < 7; i++) {

                const currentDate =
                    new Date(monday);

                currentDate.setDate(
                    monday.getDate() + i
                );

                const dateString =
                    formatDate(currentDate);

                if (
                    completedDates.includes(
                        dateString
                    )
                ) {

                    completedThisWeek++;
                }
            }

            const percentage =
                Math.round(
                    (completedThisWeek / 7) * 100
                );

            const progressItem =
                document.createElement("div");

            progressItem.className =
                "progress-item";

            progressItem.innerHTML = `

                <div class="progress-header">

                    <strong>
                        ${escapeHTML(
                            habit.habit_name
                        )}
                    </strong>

                    <span>
                        ${completedThisWeek}/7 days
                    </span>

                </div>

                <div class="progress-bar">

                    <div
                        class="progress-fill"
                        style="width: ${percentage}%">
                    </div>

                </div>

                <p class="progress-percentage">
                    ${percentage}% completed this week
                </p>
            `;

            progressContainer.appendChild(
                progressItem
            );
        }

    } catch (error) {

        console.error(
            "Error loading progress overview:",
            error
        );
    }
}


// =====================================================
// SEARCH + CATEGORY FILTER
// =====================================================

function filterHabits() {

    const searchText =
        searchHabit.value
            .toLowerCase()
            .trim();

    const selectedCategory =
        categoryFilter.value
            .toLowerCase()
            .trim();

    const habitItems =
        document.querySelectorAll(
            ".habit-item"
        );

    habitItems.forEach(function (habitItem) {

        const habitNameElement =
            habitItem.querySelector("h3");

        const categoryElement =
            habitItem.querySelector(
                ".category-badge"
            );

        const habitName =
            habitNameElement
                ? habitNameElement.textContent
                    .toLowerCase()
                : "";

        const category =
            categoryElement
                ? categoryElement.textContent
                    .toLowerCase()
                    .trim()
                : "";

        const matchesSearch =
            habitName.includes(
                searchText
            );

        const matchesCategory =
            selectedCategory === "" ||
            category === selectedCategory;

        if (
            matchesSearch &&
            matchesCategory
        ) {

            habitItem.style.display =
                "block";

        } else {

            habitItem.style.display =
                "none";
        }
    });
}


// Search while typing

searchHabit.addEventListener(
    "input",
    filterHabits
);


// Filter when category changes

categoryFilter.addEventListener(
    "change",
    filterHabits
);


// =====================================================
// INITIAL PAGE LOAD
// =====================================================

async function initializeApp() {

    await loadHabits();

    await loadDashboard();

    await loadProgressOverview();
}

initializeApp();
// =====================================================
// TODAY'S HABITS
// =====================================================

async function loadTodayHabits() {

    const todayContainer =
        document.getElementById("todayHabits");

    if (!todayContainer) {
        return;
    }

    try {

        const response =
            await fetch("http://localhost:5000/api/habits");

        const habits =
            await response.json();

        if (habits.length === 0) {

            todayContainer.innerHTML = `
                <p class="today-empty">
                    No habits added yet.
                </p>
            `;

            return;
        }

        const today =
            formatDate(new Date());

        todayContainer.innerHTML = "";

        for (const habit of habits) {

            const completionResponse =
                await fetch(
                    `http://localhost:5000/api/habits/${habit.id}/completions`
                );

            const completions =
                await completionResponse.json();

            const completedToday =
                completions.some(item =>
                    item.status &&
                    formatDatabaseDate(
                        item.completion_date
                    ) === today
                );

            const todayItem =
                document.createElement("div");

            todayItem.className =
                "today-habit-item";

            todayItem.innerHTML = `

                <div class="today-habit-info">

                    <div class="today-habit-name">
                        ${habit.habit_name}
                    </div>

                    <span class="category-badge">
                        ${habit.category || "Other"}
                    </span>

                </div>

                <button
                    type="button"
                    class="today-complete-button ${
                        completedToday
                            ? "today-completed"
                            : ""
                    }"
                    ${
                        completedToday
                            ? "disabled"
                            : ""
                    }
                    onclick="completeTodayHabit(${habit.id})">

                    ${
                        completedToday
                            ? "✓ Completed"
                            : "Complete"
                    }

                </button>
            `;

            todayContainer.appendChild(todayItem);
        }

    } catch (error) {

        console.log(
            "Error loading today's habits:",
            error
        );

        todayContainer.innerHTML = `
            <p class="today-empty">
                Unable to load today's habits.
            </p>
        `;
    }
}


// Complete today's habit
async function completeTodayHabit(habitId) {

    const today =
        formatDate(new Date());

    try {

        const response =
            await fetch(
                `http://localhost:5000/api/habits/${habitId}/complete`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        completion_date: today
                    })
                }
            );

        const data =
            await response.json();

        message.textContent =
            data.message;

        if (response.ok) {

            await loadTodayHabits();

            await loadHabits();

            await loadDashboardStats();

            await loadProgressOverview();
        }

    } catch (error) {

        console.log(
            "Error completing today's habit:",
            error
        );

        message.textContent =
            "Cannot connect to the backend.";
    }
}


// Load today's habits
loadTodayHabits();
// =====================================================
// HABIT COMPLETION PERCENTAGE
// =====================================================

async function loadCompletionPercentage(habitId) {

    try {

        const response =
            await fetch(
                `http://localhost:5000/api/habits/${habitId}/completions`
            );

        const completions =
            await response.json();

        const completedDays =
            completions.filter(
                item => item.status
            ).length;

        /*
         * Calculate percentage using
         * completed days out of 30 days.
         */
        const percentage =
            Math.min(
                Math.round(
                    (completedDays / 30) * 100
                ),
                100
            );

        const percentageElement =
            document.getElementById(
                `completion-${habitId}`
            );

        const progressBar =
            document.getElementById(
                `completion-bar-${habitId}`
            );

        if (percentageElement) {

            percentageElement.textContent =
                `${percentage}%`;
        }

        if (progressBar) {

            progressBar.style.width =
                `${percentage}%`;
        }

    } catch (error) {

        console.log(
            "Error loading completion percentage:",
            error
        );
    }
}