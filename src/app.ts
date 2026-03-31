import express from 'express';
import path from 'path';

const app = express();

// Middlewares globais
app.use(express.json());                              // Entende JSON no body das requisições
app.use(express.urlencoded({ extended: true }));      // Entende dados de formulários HTML
app.use(express.static(path.join(__dirname, '..', 'public'))); // Serve arquivos estáticos (HTML, CSS, JS)

// Rota de health check — usada pra verificar se o servidor está no ar
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
