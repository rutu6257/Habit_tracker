const express = require("express");
const cors = require("cors");

const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());


// ================= TEST BACKEND =================

app.get("/", (req, res) => {
    res.send("Habit Tracker Backend is running!");
});


// ================= ADD NEW HABIT =================

app.post("/api/habits", (req, res) => {

    const {
        habit_name,
        description,
        category
    } = req.body;

    if (!habit_name || habit_name.trim() === "") {

        return res.status(400).json({
            message: "Habit name is required"
        });
    }

    const sql = `
        INSERT INTO habits
        (habit_name, description, category, created_at)
        VALUES (?, ?, ?, CURDATE())
    `;

    db.query(
        sql,
        [
            habit_name.trim(),
            description || "",
            category || ""
        ],
        (err, result) => {

            if (err) {

                console.log(
                    "Error adding habit:",
                    err
                );

                return res.status(500).json({
                    message: "Failed to add habit"
                });
            }

            res.status(201).json({
                message: "Habit added successfully",
                habitId: result.insertId
            });
        }
    );
});


// ================= GET ALL HABITS =================

app.get("/api/habits", (req, res) => {

    const sql = `
        SELECT *
        FROM habits
        ORDER BY id DESC
    `;

    db.query(
        sql,
        (err, results) => {

            if (err) {

                console.log(
                    "Error fetching habits:",
                    err
                );

                return res.status(500).json({
                    message: "Failed to fetch habits"
                });
            }

            res.json(results);
        }
    );
});


// ================= COMPLETE HABIT =================

app.post("/api/habits/:id/complete", (req, res) => {

    const habitId = req.params.id;

    const {
        completion_date
    } = req.body;

    if (!completion_date) {

        return res.status(400).json({
            message: "Completion date is required"
        });
    }

    const checkSql = `
        SELECT *
        FROM habit_completions
        WHERE habit_id = ?
        AND completion_date = ?
    `;

    db.query(
        checkSql,
        [
            habitId,
            completion_date
        ],
        (err, results) => {

            if (err) {

                console.log(
                    "Error checking completion:",
                    err
                );

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (results.length > 0) {

                return res.json({
                    message:
                        "Habit already completed for this date"
                });
            }

            const insertSql = `
                INSERT INTO habit_completions
                (habit_id, completion_date, status)
                VALUES (?, ?, TRUE)
            `;

            db.query(
                insertSql,
                [
                    habitId,
                    completion_date
                ],
                (err) => {

                    if (err) {

                        console.log(
                            "Error recording completion:",
                            err
                        );

                        return res.status(500).json({
                            message:
                                "Failed to record completion"
                        });
                    }

                    res.status(201).json({
                        message:
                            "Habit completed successfully"
                    });
                }
            );
        }
    );
});


// ================= GET COMPLETIONS =================

app.get("/api/habits/:id/completions", (req, res) => {

    const habitId = req.params.id;

    const sql = `
    SELECT 
        DATE_FORMAT(completion_date, '%Y-%m-%d') AS completion_date,
        status
    FROM habit_completions
    WHERE habit_id = ?
    ORDER BY completion_date ASC
`;
    db.query(
        sql,
        [habitId],
        (err, results) => {

            if (err) {

                console.log(
                    "Error fetching completions:",
                    err
                );

                return res.status(500).json({
                    message:
                        "Failed to fetch completions"
                });
            }

            res.json(results);
        }
    );
});


// ================= GET STREAK =================

// Get current streak for a habit
app.get("/api/habits/:id/streak", (req, res) => {

    const habitId = req.params.id;

    const sql = `
        SELECT DATE_FORMAT(completion_date, '%Y-%m-%d') AS completion_date
        FROM habit_completions
        WHERE habit_id = ?
        AND status = TRUE
        ORDER BY completion_date DESC
    `;

    db.query(sql, [habitId], (err, results) => {

        if (err) {

            console.log("Error calculating streak:", err);

            return res.status(500).json({
                message: "Failed to calculate streak"
            });
        }

        const completedDates = results.map(
            item => item.completion_date
        );

        // Get today's date in YYYY-MM-DD format
        const today = new Date();

        const todayYear = today.getFullYear();

        const todayMonth = String(
            today.getMonth() + 1
        ).padStart(2, "0");

        const todayDay = String(
            today.getDate()
        ).padStart(2, "0");

        const todayString =
            `${todayYear}-${todayMonth}-${todayDay}`;

        // If the habit was NOT completed today,
        // the current streak is 0.
        if (!completedDates.includes(todayString)) {

            return res.json({
                streak: 0
            });
        }

        // Today is completed, so count consecutive days.
        let streak = 0;

        let currentDate = new Date(today);

        while (true) {

            const year =
                currentDate.getFullYear();

            const month =
                String(
                    currentDate.getMonth() + 1
                ).padStart(2, "0");

            const day =
                String(
                    currentDate.getDate()
                ).padStart(2, "0");

            const dateString =
                `${year}-${month}-${day}`;

            if (
                completedDates.includes(dateString)
            ) {

                streak++;

                currentDate.setDate(
                    currentDate.getDate() - 1
                );

            } else {

                break;
            }
        }

        res.json({
            streak: streak
        });
    });
});


// ================= GET HISTORY =================

app.get("/api/habits/:id/history", (req, res) => {

    const habitId = req.params.id;

    const sql = `
        SELECT completion_date, status
        FROM habit_completions
        WHERE habit_id = ?
        ORDER BY completion_date DESC
    `;

    db.query(
        sql,
        [habitId],
        (err, results) => {

            if (err) {

                console.log(
                    "Error fetching habit history:",
                    err
                );

                return res.status(500).json({
                    message:
                        "Failed to fetch habit history"
                });
            }

            res.json(results);
        }
    );
});


// ================= UPDATE HABIT =================

app.put("/api/habits/:id", (req, res) => {

    const habitId = req.params.id;

    const {
        habit_name,
        description,
        category
    } = req.body;

    if (!habit_name || habit_name.trim() === "") {

        return res.status(400).json({
            message: "Habit name is required"
        });
    }

    const sql = `
        UPDATE habits

        SET
            habit_name = ?,
            description = ?,
            category = ?

        WHERE id = ?
    `;

    db.query(
        sql,
        [
            habit_name.trim(),
            description || "",
            category || "",
            habitId
        ],
        (err, result) => {

            if (err) {

                console.log(
                    "Error updating habit:",
                    err
                );

                return res.status(500).json({
                    message:
                        "Failed to update habit"
                });
            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    message: "Habit not found"
                });
            }

            res.json({
                message:
                    "Habit updated successfully"
            });
        }
    );
});


// ================= DELETE HABIT =================

app.delete("/api/habits/:id", (req, res) => {

    const habitId = req.params.id;

    const deleteCompletionsSql = `
        DELETE FROM habit_completions
        WHERE habit_id = ?
    `;

    db.query(
        deleteCompletionsSql,
        [habitId],
        (err) => {

            if (err) {

                console.log(
                    "Error deleting completion records:",
                    err
                );

                return res.status(500).json({
                    message:
                        "Failed to delete habit"
                });
            }

            const deleteHabitSql = `
                DELETE FROM habits
                WHERE id = ?
            `;

            db.query(
                deleteHabitSql,
                [habitId],
                (err, result) => {

                    if (err) {

                        console.log(
                            "Error deleting habit:",
                            err
                        );

                        return res.status(500).json({
                            message:
                                "Failed to delete habit"
                        });
                    }

                    if (result.affectedRows === 0) {

                        return res.status(404).json({
                            message:
                                "Habit not found"
                        });
                    }

                    res.json({
                        message:
                            "Habit deleted successfully"
                    });
                }
            );
        }
    );
});


// ================= START SERVER =================

const PORT = 5000;

app.listen(
    PORT,
    () => {
        console.log(
            `Server running on http://localhost:${PORT}`
        );
    }
);