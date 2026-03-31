import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { validateEnv } from './config/env';
import { startScheduler } from './jobs/scheduler';

validateEnv();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startScheduler();
});
