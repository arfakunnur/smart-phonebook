const express = require("express");
const router = express.Router();

const pool = require("../db");

// GET CONTACTS
router.get("/", async (req, res) => {
  try {
    const allContacts = await pool.query(
      "SELECT * FROM contacts"
    );

    res.json(allContacts.rows);

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "Server Error",
    });
  }
});

// ADD CONTACT
router.post("/", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      company,
      address,
      tags,
    } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        error: "Name and phone are required",
      });
    }

    // Duplicate check
    const existingContact = await pool.query(
      "SELECT * FROM contacts WHERE phone = $1",
      [phone]
    );

    if (existingContact.rows.length > 0) {
      return res.status(400).json({
        error: "Phone number already exists",
      });
    }

    // Insert contact
    const newContact = await pool.query(
      `INSERT INTO contacts
      (name, phone, email, company, address, tags)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [name, phone, email, company, address, tags]
    );

    res.status(201).json(newContact.rows[0]);

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "Server Error",
    });
  }
});

// DELETE CONTACT
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM contacts WHERE id = $1",
      [id]
    );

    res.json({
      message: "Contact deleted successfully",
    });

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "Server Error",
    });
  }
});

// UPDATE CONTACT
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      phone,
      email,
      company,
      address,
      tags,
    } = req.body;

    const updatedContact = await pool.query(
      `UPDATE contacts
       SET
         name = $1,
         phone = $2,
         email = $3,
         company = $4,
         address = $5,
         tags = $6
       WHERE id = $7
       RETURNING *`,
      [
        name,
        phone,
        email,
        company,
        address,
        tags,
        id,
      ]
    );

    res.json(updatedContact.rows[0]);

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "Server Error",
    });
  }
});

// SEARCH CONTACTS
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    const searchResults = await pool.query(
      `SELECT * FROM contacts
       WHERE
         name ILIKE $1 OR
         phone ILIKE $1 OR
         email ILIKE $1 OR
         company ILIKE $1`,
      [`%${q}%`]
    );

    res.json(searchResults.rows);

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      error: "Server Error",
    });
  }
});

module.exports = router;