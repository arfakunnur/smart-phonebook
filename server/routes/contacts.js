const express = require("express");
const router = express.Router();

const pool = require("../db");

// ==========================
// GET ALL CONTACTS
// ==========================
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM contacts ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET error:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// ==========================
// ADD CONTACT
// ==========================
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, company, address, tags } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        error: "Name and phone are required",
      });
    }

    // Strict phone validation: accept ONLY exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        error: "Phone number must be exactly 10 digits (numbers only)",
      });
    }

    const result = await pool.query(
      `INSERT INTO contacts (name, phone, email, company, address, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, phone, email, company, address, tags]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST error:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// ==========================
// DELETE CONTACT
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM contacts WHERE id = $1", [id]);

    res.json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("DELETE error:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// ==========================
// SEARCH CONTACTS (FIXED)
// ==========================
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    // If no search query, return all contacts
    if (!q || q.trim() === "") {
      const all = await pool.query(
        "SELECT * FROM contacts ORDER BY id DESC"
      );
      return res.json(all.rows);
    }

    const result = await pool.query(
      `SELECT * FROM contacts
       WHERE name ILIKE $1
       OR phone ILIKE $1
       OR email ILIKE $1
       OR company ILIKE $1
       ORDER BY id DESC`,
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("SEARCH error:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;