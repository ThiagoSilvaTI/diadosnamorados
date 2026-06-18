const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Caminho do arquivo JSON
const PEDIDOS_FILE = path.join(__dirname, 'pedidos.json');

// Função para ler pedidos do arquivo JSON
function lerPedidos() {
    try {
        if (fs.existsSync(PEDIDOS_FILE)) {
            const data = fs.readFileSync(PEDIDOS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('❌ Erro ao ler pedidos:', error);
        return [];
    }
}

// Função para salvar pedidos no arquivo JSON
function salvarPedidos(pedidos) {
    try {
        fs.writeFileSync(PEDIDOS_FILE, JSON.stringify(pedidos, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar pedidos:', error);
        return false;
    }
}

// Inicializar arquivo se não existir
if (!fs.existsSync(PEDIDOS_FILE)) {
    salvarPedidos([]);
    console.log('📁 Arquivo pedidos.json criado!');
}

// Rota para criar pedido
app.post('/api/pedido', (req, res) => {
    const {
        nome_remetente,
        anonimo,
        nome_destinatario,
        sala,
        combo,
        extras,
        serenata,
        valor_total,
        turma
    } = req.body;

    // Validar dados
    if (!nome_destinatario || !sala || !combo) {
        return res.status(400).json({ 
            error: 'Por favor, preencha todos os campos obrigatórios!' 
        });
    }

    // Ler pedidos existentes
    const pedidos = lerPedidos();

    // Criar novo pedido
    const novoPedido = {
        id: pedidos.length > 0 ? pedidos[pedidos.length - 1].id + 1 : 1,
        nome_remetente: anonimo ? null : nome_remetente,
        anonimo: anonimo || false,
        nome_destinatario: nome_destinatario,
        sala: sala,
        combo: combo,
        extras: extras || [],
        serenata: serenata || null,
        valor_total: valor_total || 0,
        turma: turma || 'Não especificada',
        data_pedido: new Date().toISOString(),
        status: 'pendente'
    };

    // Adicionar ao array
    pedidos.push(novoPedido);

    // Salvar no arquivo
    if (salvarPedidos(pedidos)) {
        console.log(`✅ Pedido #${novoPedido.id} salvo com sucesso!`);
        console.log(`   📝 ${nome_destinatario} - ${combo} - R$ ${valor_total.toFixed(2)}`);
        console.log(`   🎓 Turma ${turma} - Sala ${sala}`);
        
        res.json({ 
            success: true, 
            id: novoPedido.id,
            message: "Pedido realizado com sucesso! ❤️",
            pedido: novoPedido
        });
    } else {
        res.status(500).json({ 
            error: 'Erro ao salvar pedido no arquivo!' 
        });
    }
});

// Rota para listar todos os pedidos (apenas para API, não exibe no HTML)
app.get('/api/pedidos', (req, res) => {
    const pedidos = lerPedidos();
    res.json(pedidos);
});

// Rota para buscar pedido por ID
app.get('/api/pedido/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const pedidos = lerPedidos();
    const pedido = pedidos.find(p => p.id === id);
    
    if (pedido) {
        res.json(pedido);
    } else {
        res.status(404).json({ error: 'Pedido não encontrado!' });
    }
});

// Rota para buscar pedidos por turma
app.get('/api/pedidos/turma/:turma', (req, res) => {
    const turma = req.params.turma;
    const pedidos = lerPedidos();
    const pedidosTurma = pedidos.filter(p => p.turma === turma);
    res.json(pedidosTurma);
});

// Rota para buscar pedidos por sala
app.get('/api/pedidos/sala/:sala', (req, res) => {
    const sala = req.params.sala;
    const pedidos = lerPedidos();
    const pedidosSala = pedidos.filter(p => p.sala === sala);
    res.json(pedidosSala);
});

// Rota para atualizar status do pedido
app.put('/api/pedido/:id/status', (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    const pedidos = lerPedidos();
    const index = pedidos.findIndex(p => p.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Pedido não encontrado!' });
    }
    
    pedidos[index].status = status;
    
    if (salvarPedidos(pedidos)) {
        console.log(`✅ Status do pedido #${id} atualizado para: ${status}`);
        res.json({ 
            success: true, 
            message: 'Status atualizado com sucesso!',
            pedido: pedidos[index]
        });
    } else {
        res.status(500).json({ error: 'Erro ao atualizar status!' });
    }
});

// Rota para deletar pedido
app.delete('/api/pedido/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const pedidos = lerPedidos();
    const filteredPedidos = pedidos.filter(p => p.id !== id);
    
    if (filteredPedidos.length === pedidos.length) {
        return res.status(404).json({ error: 'Pedido não encontrado!' });
    }
    
    if (salvarPedidos(filteredPedidos)) {
        console.log(`🗑️ Pedido #${id} removido com sucesso!`);
        res.json({ 
            success: true, 
            message: 'Pedido removido com sucesso!'
        });
    } else {
        res.status(500).json({ error: 'Erro ao remover pedido!' });
    }
});

// Rota para estatísticas (apenas API)
app.get('/api/estatisticas', (req, res) => {
    const pedidos = lerPedidos();
    
    const estatisticas = {
        total_pedidos: pedidos.length,
        total_por_turma: {},
        total_por_combo: {},
        valor_total: pedidos.reduce((sum, p) => sum + p.valor_total, 0),
        pedidos_por_status: {}
    };
    
    pedidos.forEach(p => {
        // Por turma
        estatisticas.total_por_turma[p.turma] = (estatisticas.total_por_turma[p.turma] || 0) + 1;
        
        // Por combo
        estatisticas.total_por_combo[p.combo] = (estatisticas.total_por_combo[p.combo] || 0) + 1;
        
        // Por status
        estatisticas.pedidos_por_status[p.status] = (estatisticas.pedidos_por_status[p.status] || 0) + 1;
    });
    
    res.json(estatisticas);
});

// Rota de status
app.get('/api/status', (req, res) => {
    const pedidos = lerPedidos();
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        total_pedidos: pedidos.length,
        arquivo: PEDIDOS_FILE
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
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📁 Pedidos salvos em: ${PEDIDOS_FILE}`);
    console.log(`💝 LoveExpress - Sistema de Pedidos Dia dos Namorados`);
    console.log(`🎓 Turma 302 e 303 agradece seu amor!`);

    // Mostrar pedidos existentes no console
    const pedidos = lerPedidos();
    if (pedidos.length > 0) {
        console.log(`\n📊 ${pedidos.length} pedidos encontrados no arquivo!`);
        console.log(`📝 Último pedido: #${pedidos[pedidos.length - 1].id}`);
        console.log(`💵 Total arrecadado: R$ ${pedidos.reduce((sum, p) => sum + p.valor_total, 0).toFixed(2)}`);
    } else {
        console.log(`\n📝 Nenhum pedido encontrado ainda.`);
    }
    console.log('');
});