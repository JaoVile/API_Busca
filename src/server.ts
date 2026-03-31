import dotenv from 'dotenv';
dotenv.config(); // Carrega as variáveis do arquivo .env para process.env

import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
