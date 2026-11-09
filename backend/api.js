const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());


// 1. Criando a ponte (conexão) com o MySQL
const db = mysql.createPool({
    host: process.env.DB_HOST ,
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_MYDB,
    waitForConnections: true,
    connectionLimit: 10
});

// Testando a conexão com o banco
db.getConnection((err, connection) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados MySQL:', err);
        return;
    }
    connection.release();
    console.log('Conectado ao MySQL com sucesso!');
});

app.get('/detalhe_agendamento', (req, res) => {
    const busca = String(req.query.busca || req.query.Nome || req.query.nome || req.query.email || '').trim();
    if (!busca) return res.status(400).json({ erro: 'Informe seu nome ou e-mail.' });

    const pareceEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(busca);
    if (busca.includes('@') && !pareceEmail) {
        return res.status(400).json({ erro: 'Informe um e-mail válido ou seu nome.' });
    }

    const nomeBusca = `%${busca.replace(/[\\%_]/g, '\\$&')}%`;
    const sql = `
        SELECT reservas.*
        FROM mydb.detalhe_agendamento AS reservas
        INNER JOIN mydb.tbl_clientes AS clientes
            ON clientes.idclientes = reservas.Cod
        WHERE LOWER(TRIM(clientes.email)) = LOWER(TRIM(?))
           OR LOWER(TRIM(clientes.cliente_nome)) LIKE LOWER(?)
    `;

    db.query({ sql, timeout: 10000 }, [busca, nomeBusca], (err, resultados) => {
        if (err) {
            console.error('Erro ao consultar agendamentos:', err);
            const tempoEsgotado = err.code === 'PROTOCOL_SEQUENCE_TIMEOUT';
            return res.status(tempoEsgotado ? 504 : 500).json({
                erro: tempoEsgotado
                    ? 'A consulta demorou mais que o esperado. Tente novamente.'
                    : 'Não foi possível consultar as reservas.'
            });
        }
        res.json(resultados);
    });
});

const cidadesAtendidas = new Set([
    'maua',
    'santo andre',
    'sao bernardo do campo',
    'diadema',
    'ribeirao pires',
    'sao caetano do sul'
]);

function normalizarTexto(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function cidadeAtendida(cidadeInformada, cidadeCep) {
    const cidadeDigitada = normalizarTexto(cidadeInformada);
    const municipioCep = normalizarTexto(cidadeCep);

    if (cidadeDigitada === 'capuava') {
        return municipioCep === 'maua' || municipioCep === 'santo andre';
    }

    const cidadeCanonica = cidadeDigitada === 'sao bernardo'
        || cidadeDigitada === 'sao bernado'
        || cidadeDigitada === 'sao bernado do campo'
        ? 'sao bernardo do campo'
        : cidadeDigitada === 'sao caetano'
            ? 'sao caetano do sul'
            : cidadeDigitada;

    return cidadesAtendidas.has(cidadeCanonica) && cidadeCanonica === municipioCep;
}

function normalizarDataAgenda(valor) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(valor || ''));
    if (!partes) return null;

    const [, ano, mes, dia, hora, minuto, segundo = '00'] = partes;
    const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
    if (
        data.getUTCFullYear() !== Number(ano)
        || data.getUTCMonth() !== Number(mes) - 1
        || data.getUTCDate() !== Number(dia)
        || Number(hora) > 23
        || Number(minuto) > 59
        || Number(segundo) > 59
    ) {
        return null;
    }

    return `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
}

app.get('/horarios_ocupados', (req, res) => {
    const idServico = Number(req.query.id_servico);
    const data = String(req.query.data || '');
    if (!Number.isInteger(idServico) || idServico < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ erro: 'Informe um serviço e uma data válidos.' });
    }

    const inicio = `${data} 00:00:00`;
    const sql = `
        SELECT DATE_FORMAT(data_agenda, '%H:%i') AS horario
        FROM agenda_cliente
        WHERE id_servico = ?
          AND data_agenda >= NOW()
          AND data_agenda >= ?
          AND data_agenda < DATE_ADD(?, INTERVAL 1 DAY)
        ORDER BY data_agenda
    `;

    db.query(sql, [idServico, inicio, inicio], (err, resultados) => {
        if (err) {
            console.error('Erro ao consultar horários ocupados:', err);
            return res.status(500).json({ erro: 'Não foi possível consultar os horários disponíveis.' });
        }
        res.json({ horarios: resultados.map((resultado) => resultado.horario) });
    });
});

async function validarCepCidade(cep, cidade) {
    if (!/^\d{8}$/.test(cep)) {
        return { valido: false, status: 400, erro: 'Informe um CEP válido com 8 números.' };
    }

    let resposta;
    try {
        resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
            signal: AbortSignal.timeout(5000)
        });
    } catch (erro) {
        console.error('Não foi possível validar o CEP no ViaCEP:', erro);
        return {
            valido: false,
            status: 503,
            erro: 'Não foi possível validar seu CEP agora. Tente novamente em instantes.'
        };
    }

    if (!resposta.ok) {
        return {
            valido: false,
            status: 503,
            erro: 'Não foi possível validar seu CEP agora. Tente novamente em instantes.'
        };
    }

    let endereco;
    try {
        endereco = await resposta.json();
    } catch (erro) {
        console.error('Resposta inválida ao validar CEP no ViaCEP:', erro);
        return {
            valido: false,
            status: 503,
            erro: 'Não foi possível validar seu CEP agora. Tente novamente em instantes.'
        };
    }
    if (endereco.erro || !endereco.localidade || !endereco.uf) {
        return { valido: false, status: 400, erro: 'CEP não encontrado. Confira os números informados.' };
    }

    if (endereco.uf !== 'SP' || !cidadeAtendida(cidade, endereco.localidade)) {
        return {
            valido: false,
            status: 400,
            erro: 'Sentimos muito, mas não podemos te atender devido à distância 😔. Atendemos Mauá, Santo André, Capuava, São Bernardo do Campo, Diadema, Ribeirão Pires e São Caetano do Sul. Confira se a cidade e o CEP estão corretos.'
        };
    }

    return { valido: true, cidade: endereco.localidade };
}

app.post('/tbl_clientes', async (req, res) => {
    let { cliente_nome, telefone, email, endereco, cpf, cidade, cep, id_servico, data_agenda } = req.body;

    cliente_nome = String(cliente_nome || '').trim();
    email = String(email || '').trim();
    cidade = String(cidade || '').trim();
    cep = String(cep || '').replace(/\D/g, '');

    if (!cliente_nome || !telefone || !email || !endereco || !cpf || !cidade || !cep || !Number.isInteger(Number(id_servico)) || Number(id_servico) < 1 || !data_agenda) {
        return res.status(400).json({ status: 'erro', erro: 'Preencha todos os dados da reserva.' });
    }

    if (!/^[\p{L}][\p{L}\p{M}\s'.-]{1,99}$/u.test(cliente_nome) || cliente_nome.trim().split(/\s+/).length < 2) {
        return res.status(400).json({ status: 'erro', erro: 'Informe seu nome completo usando pelo menos nome e sobrenome.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ status: 'erro', erro: 'Informe um endereço de e-mail válido.' });
    }

    const validacaoEndereco = await validarCepCidade(cep, cidade);
    if (!validacaoEndereco.valido) {
        return res.status(validacaoEndereco.status).json({ status: 'erro', erro: validacaoEndereco.erro });
    }
    cidade = validacaoEndereco.cidade;

    data_agenda = normalizarDataAgenda(data_agenda);
    if (!data_agenda) {
        return res.status(400).json({ status: 'erro', erro: 'Informe uma data e um horário válidos para a reserva.' });
    }

    const sqlCliente = `
        INSERT INTO tbl_clientes (cliente_nome, telefone, email, endereco, cpf, cidade, cep) 
        VALUES (?, ?, ?, ?, ?, ?, ?)

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const allowedCities = new Map([
    ['maua', 'Mauá'],
    ['santo andre', 'Santo André'],
    ['sao caetano', 'São Caetano do Sul'],
    ['sao caetano do sul', 'São Caetano do Sul'],
    ['ribeirao pires', 'Ribeirão Pires'],
    ['capuava', 'Capuava']
]);

app.get('/servicos', (req, res) => {
    const sql = `
        SELECT id_servico, nome_servico, preco, duracao_estimada, id_funcionario
        FROM servicos
        ORDER BY nome_servico

    `;
    const sqlAgenda = `
        INSERT INTO agenda_cliente (data_agenda, id_servico, id_cliente)
        VALUES (?, ?, ?)
    `;
    const nomeBloqueio = `agenda:${Number(id_servico)}:${data_agenda}`;
    let connection;
    let bloqueioAdquirido = false;
    let transacaoIniciada = false;


    try {
        connection = await db.promise().getConnection();
        const [bloqueios] = await connection.query('SELECT GET_LOCK(?, 10) AS adquirido', [nomeBloqueio]);
        if (Number(bloqueios[0].adquirido) !== 1) {
            return res.status(503).json({
                status: 'erro',
                erro: 'Não foi possível confirmar a disponibilidade agora. Tente novamente.'
            });
        }
        bloqueioAdquirido = true;

        await connection.beginTransaction();
        transacaoIniciada = true;
        const [reservasExistentes] = await connection.query(
            'SELECT id FROM agenda_cliente WHERE id_servico = ? AND data_agenda = ? AND data_agenda >= NOW() LIMIT 1',
            [Number(id_servico), data_agenda]
        );
        if (reservasExistentes.length > 0) {
            await connection.rollback();
            transacaoIniciada = false;
            return res.status(409).json({
                status: 'erro',
                erro: 'Este horário acabou de ser reservado. Escolha outro horário disponível.'
            });
        }

        const [resultadoCliente] = await connection.query(sqlCliente, [
            cliente_nome, telefone, email, endereco, cpf, cidade, cep
        ]);
        await connection.query(sqlAgenda, [data_agenda, Number(id_servico), resultadoCliente.insertId]);
        await connection.commit();
        transacaoIniciada = false;
        return res.status(201).json({
            status: 'sucesso',
            mensagem: 'Cliente cadastrado e horário agendado com sucesso!'
        });
    } catch (err) {
        if (connection && transacaoIniciada) {
            try {
                await connection.rollback();
            } catch (erroRollback) {
                console.error('Erro ao desfazer reserva incompleta:', erroRollback);
            }
        }
        console.error('Erro ao salvar reserva:', err);
        return res.status(500).json({ status: 'erro', erro: 'Não foi possível salvar a reserva.' });
    } finally {
        if (connection) {
            if (bloqueioAdquirido) {
                try {
                    await connection.query('SELECT RELEASE_LOCK(?)', [nomeBloqueio]);
                } catch (erroLiberacao) {
                    console.error('Erro ao liberar bloqueio do horário:', erroLiberacao);
                }
            }
            connection.release();
        }
    }

    db.query(sql, (error, services) => {
        if (error) {
            console.error('Erro ao carregar serviços do banco:', error);
            return res.status(500).json({ erro: 'Não foi possível carregar o catálogo de serviços.' });
        }
        res.json(services);
    });
});

app.get('/horarios', (req, res) => {
    const serviceId = Number(req.query.id_servico);
    const date = String(req.query.data || '');
    const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const validDate = dateParts && new Date(Date.UTC(
        Number(dateParts[1]),
        Number(dateParts[2]) - 1,
        Number(dateParts[3])
    )).toISOString().slice(0, 10) === date;

    if (!Number.isSafeInteger(serviceId) || serviceId <= 0 || !validDate) {
        return res.status(400).json({ erro: 'Informe um serviço e uma data válidos.' });
    }

    const sql = `
        SELECT TIME_FORMAT(a.data_agenda, '%H:%i') AS hora,
               TIME_TO_SEC(s.duracao_estimada) AS duracao_segundos
        FROM agenda_cliente a
        INNER JOIN servicos s ON s.id_servico = a.id_servico
        WHERE a.id_servico = ? AND DATE(a.data_agenda) = ?
        ORDER BY a.data_agenda
    `;

    db.query(sql, [serviceId, date], (error, reservations) => {
        if (error) {
            console.error('Erro ao consultar horários reservados:', error);
            return res.status(500).json({ erro: 'Não foi possível consultar os horários disponíveis.' });
        }
        res.json(reservations);
    });
});

app.get('/detalhe_agendamento', (req, res) => {
    const name = String(req.query.Nome || req.query.nome || '').trim();
    if (!name) return res.status(400).json({ erro: 'Informe o nome do cliente.' });

    const sql = 'SELECT * FROM mydb.detalhe_agendamento WHERE LOWER(Nome) LIKE LOWER(?)';
    db.query(sql, [`%${name}%`], (error, reservations) => {
        if (error) {
            console.error('Erro ao consultar reservas:', error);
            return res.status(500).json({ erro: 'Não foi possível consultar as reservas.' });
        }
        res.json(reservations);
    });
});

app.post('/tbl_clientes', (req, res) => {
    const {
        cliente_nome,
        telefone,
        email,
        endereco,
        cpf,
        cidade,
        cep,
        id_servico,
        data_agenda
    } = req.body || {};
    const canonicalCity = allowedCities.get(normalize(cidade));
    const serviceId = Number(id_servico);
    const appointmentDate = String(data_agenda || '').trim().replace('T', ' ');
    const validDateTime = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(appointmentDate);
    const requiredFields = [cliente_nome, telefone, email, endereco, cpf, cep];

    if (
        requiredFields.some((value) => !String(value || '').trim()) ||
        !canonicalCity || !Number.isSafeInteger(serviceId) || serviceId <= 0 ||
        !validDateTime
    ) {
        return res.status(400).json({
            status: 'erro',
            erro: 'Preencha os dados corretamente e informe uma cidade atendida.'
        });
    }

    const normalizedDate = appointmentDate.length === 16 ? `${appointmentDate}:00` : appointmentDate;
    db.getConnection((connectionError, connection) => {
        if (connectionError) {
            console.error('Erro ao obter conexão para agendamento:', connectionError);
            return res.status(500).json({ status: 'erro', erro: 'Não foi possível iniciar o agendamento.' });
        }

        connection.beginTransaction((transactionError) => {
            if (transactionError) {
                connection.release();
                console.error('Erro ao iniciar transação do agendamento:', transactionError);
                return res.status(500).json({ status: 'erro', erro: 'Não foi possível iniciar o agendamento.' });
            }

            const rollback = (statusCode, message, error) => {
                if (error) console.error(message, error);
                connection.rollback(() => {
                    connection.release();
                    res.status(statusCode).json({ status: 'erro', erro: message });
                });
            };

            connection.query(
                'SELECT id_servico, TIME_TO_SEC(duracao_estimada) AS duracao_segundos FROM servicos WHERE id_servico = ? FOR UPDATE',
                [serviceId],
                (serviceError, services) => {
                    if (serviceError) {
                        return rollback(500, 'Não foi possível validar o serviço.', serviceError);
                    }
                    if (!services.length) {
                        return rollback(400, 'O serviço selecionado não está disponível.');
                    }

                    const duration = Number(services[0].duracao_segundos);
                    const overlapSql = `
                        SELECT a.id_servico
                        FROM agenda_cliente a
                        INNER JOIN servicos s ON s.id_servico = a.id_servico
                        WHERE a.id_servico = ?
                          AND a.data_agenda < DATE_ADD(?, INTERVAL ? SECOND)
                          AND DATE_ADD(a.data_agenda, INTERVAL TIME_TO_SEC(s.duracao_estimada) SECOND) > ?
                        LIMIT 1
                    `;
                    connection.query(
                        overlapSql,
                        [serviceId, normalizedDate, duration, normalizedDate],
                        (overlapError, overlaps) => {
                            if (overlapError) {
                                return rollback(500, 'Não foi possível verificar a disponibilidade do horário.', overlapError);
                            }
                            if (overlaps.length) {
                                return rollback(409, 'Este horário acabou de ser reservado. Escolha outro horário.');
                            }

                            const clientSql = `
                                INSERT INTO tbl_clientes (cliente_nome, telefone, email, endereco, cpf, cidade, cep)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `;
                            const clientValues = [
                                String(cliente_nome).trim(),
                                String(telefone).trim(),
                                String(email).trim(),
                                String(endereco).trim(),
                                String(cpf).trim(),
                                canonicalCity,
                                String(cep).trim()
                            ];

                            connection.query(clientSql, clientValues, (clientError, clientResult) => {
                                if (clientError) {
                                    return rollback(500, 'Erro ao cadastrar cliente no banco.', clientError);
                                }

                                const appointmentSql = `
                                    INSERT INTO agenda_cliente (data_agenda, id_servico, id_cliente)
                                    VALUES (?, ?, ?)
                                `;
                                connection.query(
                                    appointmentSql,
                                    [normalizedDate, serviceId, clientResult.insertId],
                                    (appointmentError) => {
                                        if (appointmentError) {
                                            return rollback(500, 'Erro ao salvar a reserva na agenda.', appointmentError);
                                        }

                                        connection.commit((commitError) => {
                                            if (commitError) {
                                                return rollback(500, 'Erro ao concluir a reserva.', commitError);
                                            }
                                            connection.release();
                                            res.status(201).json({
                                                status: 'sucesso',
                                                mensagem: 'Cliente cadastrado e horário agendado com sucesso!'
                                            });
                                        });
                                    }
                                );
                            });
                        }
                    );
                }
            );
        });
    });
});

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);

});

module.exports = { app, server };
