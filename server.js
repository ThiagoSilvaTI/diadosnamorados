const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Configuração para Render - usar diretório temporário ou memória
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
let db;

// Banco de dados - adaptado para Render
try {
  if (isProduction) {
    // No Render, usar banco em memória ou arquivo temporário
    console.log('🔄 Modo produção (Render) - Usando banco em memória');
    db = new sqlite3.Database(':memory:');
    
    // Inicializar tabelas no banco em memória
    db.serialize(() => {
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
    });
  } else {
    // Desenvolvimento local - usar arquivo
    console.log('💻 Modo desenvolvimento local - Usando arquivo pedidos.db');
    db = new sqlite3.Database('./pedidos.db');
  }
} catch (error) {
  console.error('⚠️ Erro ao conectar banco:', error);
  // Fallback para banco em memória
  db = new sqlite3.Database(':memory:');
}

// Criar tabela se não existir (compatível com ambos os modos)
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_remetente TEXT,
      anonimo INTEGER DEFAULT 0,
      nome_destinatario TEXT NOT NULL,
      telefone_destinatario TEXT,
      sala TEXT NOT NULL,
      combo TEXT NOT NULL,
      foto_polaroide INTEGER DEFAULT 0,
      bombom_extra INTEGER DEFAULT 0,
      polaroide_spotify INTEGER DEFAULT 0,
      rosa_extra INTEGER DEFAULT 0,
      pacote_fini INTEGER DEFAULT 0,
      serenata TEXT,
      valor_total REAL NOT NULL,
      status_envio TEXT DEFAULT 'pendente',
      data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela:', err.message);
    } else {
      console.log('✅ Banco de dados inicializado com sucesso');
    }
  });
});

// Função para enviar mensagem via WhatsApp (simulada para manter compatibilidade)
async function enviarWhatsApp(telefone, mensagem, nomeDestinatario) {
  try {
    console.log(`📱 [WhatsApp Simulado] Para: ${telefone}`);
    console.log(`📝 Mensagem: ${mensagem}`);
    
    // Gerar link do WhatsApp para o cliente (não quebra nada)
    const linkWhatsApp = `https://wa.me/${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`;
    
    return {
      success: true,
      method: 'simulado',
      link: linkWhatsApp,
      message: `Mensagem preparada para ${nomeDestinatario}`
    };
  } catch (error) {
    console.error('Erro na simulação de WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

// Rota para enviar confirmação (nova - não quebra as existentes)
app.post('/api/enviar-confirmacao', async (req, res) => {
  try {
    const { telefone, nomeDestinatario, pedidoId, valorTotal } = req.body;
    
    if (!telefone) {
      return res.json({ 
        success: false, 
        message: 'Número de telefone não fornecido (confirmação opcional)'
      });
    }
    
    const mensagem = `🎉 PEDIDO CONFIRMADO! 🎉\n\n` +
      `Olá ${nomeDestinatario}! 💝\n` +
      `Seu pedido #${pedidoId} foi realizado com sucesso!\n` +
      `Valor total: R$ ${valorTotal.toFixed(2)}\n` +
      `📦 Seu presente especial será entregue em breve!\n\n` +
      `💖 LoveExpress - Espalhando amor! 💖\n` +
      `Turma 302 e 303 agradece seu carinho! 🎓`;
    
    const resultado = await enviarWhatsApp(telefone, mensagem, nomeDestinatario);
    
    res.json({
      success: true,
      method: resultado.method,
      message: 'Confirmação processada!',
      link: resultado.link
    });
  } catch (error) {
    console.error('Erro na rota de confirmação:', error);
    res.json({ 
      success: false, 
      message: 'Erro ao processar confirmação (pedido salvo com sucesso)'
    });
  }
});

// Rota principal para criar pedido (modificada para aceitar telefone opcional)
app.post('/api/pedido', (req, res) => {
  const {
    nome_remetente,
    anonimo,
    nome_destinatario,
    telefone_destinatario,
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

  // Query atualizada com telefone (coluna opcional para compatibilidade)
  const query = `
    INSERT INTO pedidos (
      nome_remetente, anonimo, nome_destinatario, telefone_destinatario, sala, combo,
      foto_polaroide, bombom_extra, polaroide_spotify,
      rosa_extra, pacote_fini, serenata, valor_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    anonimo ? null : nome_remetente,
    anonimo ? 1 : 0,
    nome_destinatario,
    telefone_destinatario || null,  // Aceita telefone opcional
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
      console.error('❌ Erro ao salvar pedido:', err.message);
      res.status(500).json({ error: err.message });
    } else {
      console.log(`✅ Pedido #${this.lastID} salvo com sucesso!`);
      res.json({ 
        success: true, 
        id: this.lastID,
        message: "Pedido realizado com sucesso! ❤️"
      });
    }
  });
});

// Rota para listar todos os pedidos
app.get('/api/pedidos', (req, res) => {
  db.all("SELECT * FROM pedidos ORDER BY data_pedido DESC", (err, rows) => {
    if (err) {
      console.error('❌ Erro ao buscar pedidos:', err.message);
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Rota para buscar pedido por ID
app.get('/api/pedido/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM pedidos WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error('❌ Erro ao buscar pedido:', err.message);
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Pedido não encontrado' });
    } else {
      res.json(row);
    }
  });
});

// Rota de status para health check (útil para Render)
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    database: isProduction ? 'memory' : 'file'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('❌ Erro global:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📱 LoveExpress - Sistema de Pedidos Dia dos Namorados`);
  console.log(`🎓 Turma 302 e 303 agradece seu amor!`);
  console.log(`💾 Banco de dados: ${isProduction ? 'MEMÓRIA (Render)' : 'ARQUIVO (Local)'}\n`);
});

// Fechar conexão do banco gracefulmente
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, fechando conexões...');
  db.close((err) => {
    if (err) console.error('Erro ao fechar banco:', err);
    server.close(() => process.exit(0));
  });
});