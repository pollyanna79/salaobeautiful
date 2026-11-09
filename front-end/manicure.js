
﻿
const apiBase = 'https://salaobeautiful.onrender.com';


document.addEventListener('DOMContentLoaded', () => {
    const carrosseis = new Map();
    let agendamentoPendente = null;

    function inicializarCarrossel(idContainer) {
        const container = document.getElementById(idContainer);
        if (!container) return null;

        const slidesTrack = container.querySelector('.carousel-slides');
        const slides = Array.from(container.querySelectorAll('.slide'));
        const nextBtn = container.querySelector('.next');
        const prevBtn = container.querySelector('.prev');
        if (!slidesTrack || slides.length === 0) return null;

        let indexAtual = 0;
        let autoPlay = null;

        function mover(index) {
            indexAtual = (index + slides.length) % slides.length;
            slidesTrack.style.transform = `translateX(-${indexAtual * 100}%)`;
        }

        function pararAutoPlay() {
            if (autoPlay !== null) {
                window.clearInterval(autoPlay);
                autoPlay = null;
            }
        }

        function iniciarAutoPlay() {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            pararAutoPlay();
            autoPlay = window.setInterval(() => mover(indexAtual + 1), 3500);
        }

        nextBtn?.addEventListener('click', () => {
            pararAutoPlay();
            mover(indexAtual + 1);
        });

        prevBtn?.addEventListener('click', () => {
            pararAutoPlay();
            mover(indexAtual - 1);
        });

        iniciarAutoPlay();
        return { mover, pararAutoPlay };
    }

    function formatarDataLocal(data) {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }

    function mostrarMensagem(container, mensagem, erro = false) {
        if (!container) return;
        const paragrafo = document.createElement('p');
        paragrafo.textContent = mensagem;
        if (erro) paragrafo.classList.add('mensagem-erro');
        container.replaceChildren(paragrafo);
    }

    function fecharModal(id) {
        const modal = document.getElementById(id);
        modal?.classList.add('hidden');
        modal?.setAttribute('aria-hidden', 'true');
    }

    carrosseis.set('unhas', inicializarCarrossel('carousel-unhas'));
    carrosseis.set('sobrancelhas', inicializarCarrossel('carousel-sobrancelhas'));
    carrosseis.set('beleza', inicializarCarrossel('carousel-beleza'));

    function configurarAgendamento(config) {
        const selectServico = document.getElementById(config.select);
        const containerAgendamento = document.getElementById(config.agendamento);
        const inputData = document.getElementById(config.data);
        const gridHorarios = document.getElementById(config.horarios);
        const btnConfirmar = document.getElementById(config.botao);
        const carrossel = carrosseis.get(config.carrossel);

        if (!selectServico || !containerAgendamento || !inputData || !gridHorarios || !btnConfirmar) return;

        const hoje = new Date();
        const dataMaxima = new Date(hoje);
        dataMaxima.setMonth(dataMaxima.getMonth() + 1);
        inputData.min = formatarDataLocal(hoje);
        inputData.max = formatarDataLocal(dataMaxima);

        selectServico.addEventListener('change', () => {
            const opcaoSelecionada = selectServico.options[selectServico.selectedIndex];
            const chave = opcaoSelecionada?.dataset?.chave;
            const indice = chave ? config.indicesPorChave[chave] : undefined;

            carrossel?.pararAutoPlay();
            if (indice !== undefined) carrossel?.mover(indice);

            containerAgendamento.classList.remove('hidden');
            inputData.value = '';
            gridHorarios.replaceChildren();
            btnConfirmar.classList.add('hidden');
            btnConfirmar.dataset.hora = '';
        });

        inputData.addEventListener('change', () => {
            gerarHorarios(inputData.value);
            btnConfirmar.classList.add('hidden');
            btnConfirmar.dataset.hora = '';
        });

        btnConfirmar.addEventListener('click', () => {
            const hora = btnConfirmar.dataset.hora;
            if (!selectServico.value || !inputData.value || !hora) {
                alert('Selecione um serviço, uma data e um horário para continuar.');
                return;
            }

            agendamentoPendente = {
                id_servico: Number(selectServico.value),
                data_agenda: `${inputData.value} ${hora}:00`
            };

            const modal = document.getElementById('modal-agendamento');
            modal?.classList.remove('hidden');
            modal?.setAttribute('aria-hidden', 'false');
        });

        async function gerarHorarios(dataStr) {
            const indiceConsulta = (config.indiceConsulta || 0) + 1;
            config.indiceConsulta = indiceConsulta;
            gridHorarios.replaceChildren();

            if (!dataStr) return;

            const dataSelecionada = new Date(`${dataStr}T00:00:00`);
            const diaSemana = dataSelecionada.getDay();
            if (diaSemana === 1) {
                mostrarMensagem(gridHorarios, 'Estamos fechados às segundas-feiras.');
                return;
            }

            const agora = new Date();
            const dataHoje = formatarDataLocal(agora);
            const dataLimite = new Date(agora.getTime() + 2 * 60 * 60 * 1000);
            const horaMinima = dataStr === dataHoje
                ? dataLimite.getHours() + (dataLimite.getMinutes() > 0 || dataLimite.getSeconds() > 0 ? 1 : 0)
                : 0;
            const horaInicio = diaSemana === 0 || diaSemana === 6 ? 10 : 9;
            const horaFim = diaSemana === 0 || diaSemana === 6 ? 15 : 18;

            if (!selectServico.value) return;
            mostrarMensagem(gridHorarios, 'Verificando horários disponíveis...');

            try {
                const parametros = new URLSearchParams({
                    data: dataStr
                });
                const response = await fetch(`${apiBase}/horarios_ocupados?${parametros}`);
                const resultado = await response.json();
                if (!response.ok) {
                    throw new Error(resultado.erro || 'Não foi possível consultar os horários.');
                }

                if (indiceConsulta !== config.indiceConsulta) return;

                const horariosOcupados = new Set(resultado.horarios || []);
                gridHorarios.replaceChildren();

                for (let hora = horaInicio; hora < horaFim; hora += 1) {
                    if (hora === 13 || (dataStr === dataHoje && hora < horaMinima)) continue;

                    const botaoHora = document.createElement('button');
                    botaoHora.className = 'hora-btn';
                    botaoHora.type = 'button';
                    const horario = `${String(hora).padStart(2, '0')}:00`;
                    const ocupado = horariosOcupados.has(horario);
                    botaoHora.textContent = ocupado ? `${horario} · Ocupado` : horario;
                    botaoHora.disabled = ocupado;

                    if (ocupado) {
                        botaoHora.classList.add('ocupado');
                        botaoHora.setAttribute('aria-label', `${horario}, horário ocupado`);
                    }

                    botaoHora.addEventListener('click', () => {
                        gridHorarios.querySelectorAll('.hora-btn').forEach((botao) => botao.classList.remove('selected'));
                        botaoHora.classList.add('selected');
                        btnConfirmar.classList.remove('hidden');
                        btnConfirmar.dataset.hora = horario;
                    });

                    gridHorarios.appendChild(botaoHora);
                }

                if (!gridHorarios.querySelector('.hora-btn:not(:disabled)')) {
                    const mensagem = document.createElement('p');
                    mensagem.textContent = 'Não há horários disponíveis para esta data.';
                    gridHorarios.appendChild(mensagem);
                }
            } catch (error) {
                if (indiceConsulta !== config.indiceConsulta) return;
                console.error('Erro ao consultar horários ocupados:', error);
                mostrarMensagem(
                    gridHorarios,
                    error instanceof Error ? error.message : 'Não foi possível verificar os horários agora. Tente novamente.',
                    true
                );
            }
        }
    }

    configurarAgendamento({
        select: 'servico-unha',
        agendamento: 'agendamento-unha',
        data: 'data-unha',
        horarios: 'horarios-unha',
        botao: 'btn-agendar-unha',
        carrossel: 'unhas',
        indicesPorChave: {
            decorada: 0,
            peemao: 1,
            pedicure: 2,
            mao: 3,
            unhadegel: 4,
            unhadefibra: 5,
            unhaacrilico: 6
        }
    });

    configurarAgendamento({
        select: 'servico-sobrancelha',
        agendamento: 'agendamento-sobrancelha',
        data: 'data-sobrancelha',
        horarios: 'horarios-sobrancelha',
        botao: 'btn-agendar-sobrancelha',
        carrossel: 'sobrancelhas',
        indicesPorChave: {
            design: 0,
            henna: 1,
            microblading: 2,
            'sobrancelha-fio-a-fio': 3
        }
    });

    configurarAgendamento({
        select: 'servico-beleza',
        agendamento: 'agendamento-beleza',
        data: 'data-beleza',
        horarios: 'horarios-beleza',
        botao: 'btn-agendar-beleza',
        carrossel: 'beleza',
        indicesPorChave: {
            progressiva: 0,
            corte: 1,
            pintura: 2,
            maquiagem: 3,
            'penteado-noiva': 4,
            'penteado-debutante': 5
        }
    });

    const formColeta = document.getElementById('form-coleta-dados');
    const modalAgendamento = document.getElementById('modal-agendamento');
    const modalConfirmacao = document.getElementById('modal-confirmacao');
    const mensagemEmailConfirmacao = document.getElementById('mensagem-email-confirmacao');
    const erroAgendamento = document.getElementById('erro-agendamento');

    formColeta?.addEventListener('submit', async (event) => {
        event.preventDefault();
        erroAgendamento?.replaceChildren();

        if (!agendamentoPendente) {
            alert('Escolha um serviço, uma data e um horário antes de confirmar.');
            return;
        }

        const dados = {
            cliente_nome: document.getElementById('cli-nome').value.trim(),
            telefone: document.getElementById('cli-tel').value.trim(),
            email: document.getElementById('cli-email').value.trim(),
            endereco: document.getElementById('cli-end').value.trim(),
            cpf: document.getElementById('cli-cpf').value.trim(),
            cidade: document.getElementById('cli-cidade').value.trim(),
            cep: document.getElementById('cli-cep').value.trim(),
            ...agendamentoPendente
        };

        const nomeCompletoValido = /^[\p{L}][\p{L}\p{M}\s'.-]{1,99}$/u.test(dados.cliente_nome)
            && dados.cliente_nome.split(/\s+/).length >= 2;
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email);
        const cepValido = /^\d{5}-?\d{3}$/.test(dados.cep);

        if (!nomeCompletoValido) {
            mostrarMensagem(erroAgendamento, 'Informe seu nome completo, com pelo menos nome e sobrenome.', true);
            document.getElementById('cli-nome').focus();
            return;
        }

        if (!emailValido) {
            mostrarMensagem(erroAgendamento, 'Informe um endereço de e-mail válido.', true);
            document.getElementById('cli-email').focus();
            return;
        }

        if (!cepValido) {
            mostrarMensagem(erroAgendamento, 'Informe um CEP válido com 8 números.', true);
            document.getElementById('cli-cep').focus();
            return;
        }

        const botaoConfirmar = formColeta.querySelector('button[type="submit"]');
        botaoConfirmar && (botaoConfirmar.disabled = true);

        try {
            const response = await fetch(`${apiBase}/tbl_clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            const resultado = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(resultado.erro || 'Não foi possível confirmar o agendamento.');
            }

            fecharModal('modal-agendamento');
            formColeta.reset();
            agendamentoPendente = null;

            if (mensagemEmailConfirmacao) {
                mensagemEmailConfirmacao.textContent = `Seu agendamento foi registrado para ${dados.email}. O sistema ainda não está configurado para enviar e-mails automaticamente; por enquanto, você pode consultar sua reserva pelo botão “Consultar reserva” na página.`;
            }

            modalConfirmacao?.classList.remove('hidden');
            modalConfirmacao?.setAttribute('aria-hidden', 'false');
        } catch (error) {
            console.error('Erro ao confirmar agendamento:', error);
            mostrarMensagem(
                erroAgendamento,
                error instanceof Error ? error.message : 'Erro de conexão com o servidor. Verifique se a API está rodando.',
                true
            );
        } finally {
            if (botaoConfirmar) botaoConfirmar.disabled = false;
        }
    });

    document.querySelectorAll('[data-fechar-modal]').forEach((botao) => {
        botao.addEventListener('click', () => fecharModal(botao.dataset.fecharModal));
    });

    document.getElementById('btn-voltar-inicio')?.addEventListener('click', () => {
        fecharModal('modal-confirmacao');
        document.querySelectorAll('.container-servico select').forEach((select) => {
            select.selectedIndex = 0;
        });
        document.querySelectorAll('.agendamento-container').forEach((container) => {
            container.classList.add('hidden');
        });
        document.querySelectorAll('.horarios-grid').forEach((grid) => grid.replaceChildren());
        document.querySelectorAll('[id^="btn-agendar-"]').forEach((botao) => {
            botao.classList.add('hidden');
            botao.dataset.hora = '';
        });
    });

    const btnAbrirConsulta = document.getElementById('btn-consultar-reserva');
    const modalConsulta = document.getElementById('modal-consulta');
    const btnFecharConsulta = document.getElementById('fechar-consulta');
    const formConsulta = document.getElementById('form-consulta');
    const inputConsulta = document.getElementById('consulta-identificador');
    const divResultadoConsulta = document.getElementById('resultado-consulta');
    const btnBuscarReservas = formConsulta?.querySelector('button[type="submit"]');

    btnAbrirConsulta?.addEventListener('click', () => {
        modalConsulta?.classList.remove('hidden');
        modalConsulta?.setAttribute('aria-hidden', 'false');
        inputConsulta?.focus();
    });

    btnFecharConsulta?.addEventListener('click', () => {
        fecharModal('modal-consulta');
        divResultadoConsulta?.replaceChildren();
        if (inputConsulta) inputConsulta.value = '';
    });

    formConsulta?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const identificador = inputConsulta?.value.trim() || '';
        const pareceEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identificador);

        if (identificador.length < 2 || (identificador.includes('@') && !pareceEmail)) {
            mostrarMensagem(divResultadoConsulta, 'Informe um nome ou um e-mail válido.', true);
            return;
        }

        mostrarMensagem(divResultadoConsulta, 'Buscando suas reservas...');
        if (btnBuscarReservas) btnBuscarReservas.disabled = true;

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 15000);

        try {
            const parametros = new URLSearchParams({ busca: identificador, Nome: identificador });
            const response = await fetch(`${apiBase}/detalhe_agendamento?${parametros}`, {
                signal: controller.signal
            });
            const resultados = await response.json();

            if (!response.ok) {
                throw new Error(resultados.erro || 'Não foi possível consultar as reservas.');
            }

            exibirReservas(divResultadoConsulta, resultados);
        } catch (error) {
            console.error('Erro ao consultar reserva:', error);
            const mensagem = error instanceof DOMException && error.name === 'AbortError'
                ? 'A consulta demorou muito para responder. Confira se a API e o banco de dados estão ativos e tente novamente.'
                : error instanceof Error
                    ? error.message
                    : 'Erro de conexão com o servidor. Confira se a API está rodando.';
            mostrarMensagem(divResultadoConsulta, mensagem, true);
        } finally {
            window.clearTimeout(timeout);
            if (btnBuscarReservas) btnBuscarReservas.disabled = false;
        }
    });

    function formatarDataReserva(valor) {
        if (!valor) return 'Não informada';
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleString('pt-BR');
    }

    function exibirReservas(container, resultados) {
        if (!container) return;
        if (!Array.isArray(resultados) || resultados.length === 0) {
            mostrarMensagem(container, 'Nenhuma reserva encontrada. Confira os dados informados.');
            return;
        }

        const lista = document.createElement('ul');
        resultados.forEach((reserva) => {
            const item = document.createElement('li');
            item.className = 'resultado-reserva';
            const campos = [
                ['Cliente', reserva.cliente_nome || reserva.Nome],
                ['Serviço', reserva.nome_servico || reserva.Servico],
                ['Data e horário', formatarDataReserva(reserva.data_agenda || reserva.Data_servico)],
                ['Profissional', reserva.profissional || reserva.Profissional]
            ];

            campos.forEach(([rotulo, valor]) => {
                const linha = document.createElement('li');
                const destaque = document.createElement('strong');
                destaque.textContent = `${rotulo}: `;
                linha.append(destaque, document.createTextNode(valor ? String(valor) : 'Não informado'));
                item.appendChild(linha);
            });

            lista.appendChild(item);
        });

        container.replaceChildren(lista);
    }
});

