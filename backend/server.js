// backend/server.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./todo.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the todo database.");
});

// Create todos table
db.run(
  `CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  date_to_end TEXT,
  priority TEXT,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`,
  (err) => {
    if (err) {
      console.error("Error creating todos table:", err.message);
    } else {
      console.log("Todos table created or already exists.");

      // Check if position column exists
      db.all(`PRAGMA table_info(todos)`, (err, rows) => {
        if (err) {
          console.error("Error checking table info:", err.message);
        } else {
          const positionColumnExists = rows.some(
            (row) => row.name === "position"
          );

          if (!positionColumnExists) {
            // Add position column
            db.run(`ALTER TABLE todos ADD COLUMN position INTEGER`, (err) => {
              if (err) {
                console.error("Error adding position column:", err.message);
              } else {
                console.log("Position column added successfully.");

                // Initialize position for existing todos
                db.run(
                  `UPDATE todos SET position = (SELECT COUNT(*) FROM todos t2 WHERE t2.id <= todos.id)`,
                  (err) => {
                    if (err) {
                      console.error(
                        "Error initializing position:",
                        err.message
                      );
                    } else {
                      console.log("Position initialized for existing todos.");
                    }
                  }
                );
              }
            });
          } else {
            console.log("Position column already exists.");
          }
        }
      });
    }
  }
);

// Add your routes here
app.get("/todos", (req, res) => {
  const { sort = "position", status = "all" } = req.query;
  let query = "SELECT * FROM todos";

  if (status !== "all") {
    query += ` WHERE status = '${status}'`;
  }

  query += ` ORDER BY ${sort === "position" ? "position" : sort}`;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post("/todos", (req, res) => {
  const { title, description, date_to_end, priority, status } = req.body;
  db.run(
    `INSERT INTO todos (title, description, date_to_end, priority, status, position) 
     VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM todos))`,
    [title, description, date_to_end, priority, status],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

app.put("/todos/:id", (req, res) => {
  const { title, description, date_to_end, priority, status } = req.body;
  db.run(
    `UPDATE todos SET title = ?, description = ?, date_to_end = ?, priority = ?, status = ? WHERE id = ?`,
    [title, description, date_to_end, priority, status, req.params.id],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ updated: this.changes });
    }
  );
});

app.delete("/todos/:id", (req, res) => {
  db.run("DELETE FROM todos WHERE id = ?", req.params.id, function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

app.post("/todos/reorder", (req, res) => {
  const { todoId, newPosition } = req.body;
  db.run(
    `UPDATE todos SET position = ? WHERE id = ?`,
    [newPosition, todoId],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ updated: this.changes });
    }
  );
});

// Add this route to delete all tasks
app.delete("/todos", (req, res) => {
  db.run("DELETE FROM todos", function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
