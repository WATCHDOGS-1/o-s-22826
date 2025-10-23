import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BUILD_PATH = path.join(__dirname, 'dist');

// 1. Serve static files from the 'dist' directory (where Vite builds the app)
app.use(express.static(BUILD_PATH));

// 2. Handle SPA routing: all other requests fall back to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(BUILD_PATH, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});