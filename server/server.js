const pool = require("./db");

pool.query("SELECT current_database()", (err, res) => {
  if (err) {
    console.log("DB Error:", err);
  } else {
    console.log("Connected Database:", res.rows);
  }
});

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const contactRoutes = require("./routes/contacts");

app.use("/contacts", contactRoutes);

app.get("/", (req, res) => {
  res.send("Server Working");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

pool.query("SELECT current_database()", (err, res) => {
  if (err) {
    console.log("DB Error:", err);
  } else {
    console.log("Connected Database:", res.rows);
  }
});