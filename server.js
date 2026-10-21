const path = require('path');
const express = require('express');
const app = require('./api/index');

const PORT = process.env.PORT || 3000;

// Serve static frontend files locally
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Z.R.+ (ZONING RESOLUTION PLUS) running on:`);
  console.log(` http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
