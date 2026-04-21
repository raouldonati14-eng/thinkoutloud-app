const express = require("express");
const cors = require("cors");
const handler = require("./src/pages/api/translate");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/translate", (req, res) => handler(req, res));

const PORT = 3001;
app.listen(PORT, () => console.log(`API server running on port ${PORT}`));