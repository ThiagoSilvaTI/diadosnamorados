const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Banco de dados
const db = new sqlite3.Database('./pedidos.db');

// Criar tabela
db.run(`
  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_remetente TEXT,
    anonimo INTEGER DEFAULT 0,
    nome_destinatario TEXT NOT NULL,
    sala TEXT NOT NULL,
    combo TEXT NOT NULL,
    foto_polaroide INTEGER DEFAULT 0,
    bombom_extra INTEGER DEFAULT 0,
    polaroide_spotify INTEGER DEFAULT 0,
    rosa_extra INTEGER DEFAULT 0,
    pacote_fini INTEGER DEFAULT 0,
    serenata TEXT,
    valor_total REAL NOT NULL,
    data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Rotas
app.post('/api/pedido', (req, res) => {
  const {
    nome_remetente,
    anonimo,
    nome_destinatario,
    sala,
    combo,
    foto_polaroide,
    bombom_extra,
    polaroide_spotify,
    rosa_extra,
    pacote_fini,
    serenata,
    valor_total
  } = req.body;

  const query = `
    INSERT INTO pedidos (
      nome_remetente, anonimo, nome_destinatario, sala, combo,
      foto_polaroide, bombom_extra, polaroide_spotify,
      rosa_extra, pacote_fini, serenata, valor_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    anonimo ? null : nome_remetente,
    anonimo ? 1 : 0,
    nome_destinatario,
    sala,
    combo,
    foto_polaroide || 0,
    bombom_extra || 0,
    polaroide_spotify || 0,
    rosa_extra || 0,
    pacote_fini || 0,
    serenata || null,
    valor_total
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ 
        success: true, 
        id: this.lastID,
        message: "Pedido realizado com sucesso! ❤️"
      });
    }
  });
});

app.get('/api/pedidos', (req, res) => {
  db.all("SELECT * FROM pedidos ORDER BY data_pedido DESC", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});