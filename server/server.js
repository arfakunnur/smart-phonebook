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