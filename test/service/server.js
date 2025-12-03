const express = require("express");
const app = express();
const port = 8099;

// Route simple
app.get("/", (req, res) => {
  res.send("<h1>Test Add-on Web Server is running 🚀</h1>");
});

// Start server
app.listen(port, () => {
  console.log(`Web server running on port ${port}`);
});
