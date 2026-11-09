document.addEventListener('DOMContentLoaded', () => {
<<<<<<< HEAD
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
=======
    const API_BASE = window.API_BASE_URL || 'http://localhost:3000';
    const catalogUrl = `${API_BASE}/servicos`;
    const apiStatus = document.getElementById('api-status');
    const modalAgendamento = document.getElementById('modal-agendamento');
    const formColeta = document.getElementById('form-coleta-dados');
    const allowedCities = new Set(['Mauá', 'Santo André', 'São Caetano do Sul', 'Ribeirão Pires', 'Capuava']);
    let agendamentoPendente = null;

    const normalize = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const serviceGroups = {
        manicure: {
            selectId: 'servico-unha',
            services: [
                { label: 'Unha decorada', aliases: ['unha decorada'] },
                { label: 'Pé e mão simples', aliases: ['pe e mao simples', 'pe e mao'] },
                { label: 'Pé', aliases: ['pedicure', 'pe simples', 'pe'] },
                { label: 'Mão', aliases: ['mao simples', 'mao'] },
                { label: 'Unha em gel', aliases: ['unha em gel', 'unha de gel'] },
                { label: 'Unha de fibra', aliases: ['unha de fibra', 'fibra de vidro'] },
                { label: 'Unha de acrílico', aliases: ['unha de acrilico', 'acrilico'] }
            ]
        },
        sobrancelha: {
            selectId: 'servico-sobrancelha',
            services: [
                { label: 'Design de sobrancelha', aliases: ['design de sobrancelha', 'design sobrancelha'] },
                { label: 'Henna', aliases: ['henna'] },
                { label: 'Microblading', aliases: ['microblading'] },
                { label: 'Sobrancelha fio a fio', aliases: ['sobrancelha fio a fio', 'fio a fio'] }
            ]
        },
        maquiagem: {
            selectId: 'servico-maquiagem',
            variants: [
                { label: 'Maquiagem social', aliases: ['maquiagem'] },
                { label: 'Maquiagem para noiva', aliases: ['maquiagem'] },
                { label: 'Maquiagem para debutante', aliases: ['maquiagem'] }
            ]
        },
        cabelos: {
            selectId: 'servico-cabelos',
            services: [
                { label: 'Penteado', aliases: ['penteado', 'penteados'] },
                { label: 'Corte', aliases: ['cabelo'] },
                { label: 'Loiro iluminado', aliases: ['cabelo'] },
                { label: 'Morena iluminada', aliases: ['cabelo'] },
                { label: 'Luzes', aliases: ['cabelo'] }
            ]
>>>>>>> 3d23365bc154635428577a2225d9f06a99bafe91
        }
    };

<<<<<<< HEAD
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
            config.indiceConsulta = (config.indiceConsulta || 0) + 1;
            const opcaoSelecionada = selectServico.options[selectServico.selectedIndex];
            const chave = opcaoSelecionada.dataset.chave;
            const indice = config.indicesPorChave[chave];

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
            let horariosOcupados;
            try {
                const parametros = new URLSearchParams({
                    id_servico: selectServico.value,
                    data: dataStr
                });
                const response = await fetch(`http://localhost:3000/horarios_ocupados?${parametros}`);
                const resultado = await response.json();
                if (!response.ok) {
                    throw new Error(resultado.erro || 'Não foi possível consultar os horários.');
                }
                if (indiceConsulta !== config.indiceConsulta) return;
                horariosOcupados = new Set(resultado.horarios);
            } catch (error) {
                if (indiceConsulta !== config.indiceConsulta) return;
                console.error('Erro ao consultar horários ocupados:', error);
                mostrarMensagem(gridHorarios, 'Não foi possível verificar os horários agora. Tente novamente.', true);
                return;
            }

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
=======
    function findService(catalog, aliases) {
        const normalizedAliases = aliases.flatMap((alias) => {
            const normalizedAlias = normalize(alias);
            return [normalizedAlias, `${normalizedAlias}s`];
        });
        return catalog.find((service) => normalizedAliases.includes(normalize(service.nome_servico)));
    }

    function formatPrice(value) {
        const price = Number(value);
        return Number.isFinite(price)
            ? ` - ${price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
            : '';
    }

    function formatDuration(value) {
        if (!value) return '';
        const [hours = 0, minutes = 0] = String(value).split(':').map(Number);
        const duration = [hours ? `${hours} h` : '', minutes ? `${minutes} min` : ''].filter(Boolean).join(' ');
        return duration ? ` · ${duration}` : '';
    }

    function setServiceOption(select, service, label) {
        const option = document.createElement('option');
        option.value = String(service.id_servico);
        option.textContent = `${label}${formatPrice(service.preco)}${formatDuration(service.duracao_estimada)}`;
        option.dataset.serviceName = service.nome_servico;
        option.dataset.duration = String(durationSeconds(service.duracao_estimada));
        select.appendChild(option);
    }

    function durationSeconds(value) {
        const [hours = 0, minutes = 0, seconds = 0] = String(value || '').split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    function populateServiceSelects(catalog) {
        Object.entries(serviceGroups).forEach(([group, config]) => {
            const select = document.getElementById(config.selectId);
            select.replaceChildren(new Option('Escolha um serviço...', ''));

            if (group === 'maquiagem') {
                const service = findService(catalog, ['maquiagem']);
                if (service) {
                    config.variants.forEach((variant) => setServiceOption(select, service, variant.label));
                }
            } else {
                config.services.forEach((definition) => {
                    const service = findService(catalog, definition.aliases);
                    if (service) setServiceOption(select, service, definition.label);
                });
            }

            if (group === 'cabelos') {
                const penteados = findService(catalog, ['penteado', 'penteados']);
                if (penteados && !Array.from(select.options).some((option) => option.value === String(penteados.id_servico))) {
                    setServiceOption(select, penteados, 'Penteado');
                }
            }

            const hasServices = select.options.length > 1;
            select.disabled = !hasServices;
            if (!hasServices) {
                select.replaceChildren(new Option('Serviços indisponíveis no cadastro do banco', ''));
            }
        });
    }

    function initializeCarousel(container) {
        const track = container.querySelector('.carousel-slides');
        const slides = Array.from(container.querySelectorAll('.slide'));
        const previous = container.querySelector('.prev');
        const next = container.querySelector('.next');
        let current = 0;

        function moveTo(index) {
            current = (index + slides.length) % slides.length;
            track.style.transform = `translateX(-${current * 100}%)`;
        }

        previous.addEventListener('click', () => moveTo(current - 1));
        next.addEventListener('click', () => moveTo(current + 1));
    }

    document.querySelectorAll('.carousel-container').forEach(initializeCarousel);

    function localDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function configureScheduling(group, config) {
        const select = document.getElementById(config.selectId);
        const appointment = document.getElementById(`agendamento-${group === 'manicure' ? 'unha' : group === 'cabelos' ? 'cabelos' : group}`);
        const dateInput = document.getElementById(`data-${group === 'manicure' ? 'unha' : group}`);
        const timeGrid = document.getElementById(`horarios-${group === 'manicure' ? 'unha' : group}`);
        const continueButton = document.getElementById(`btn-agendar-${group === 'manicure' ? 'unha' : group}`);
        const today = new Date();
        const maxDate = new Date(today);
        maxDate.setMonth(maxDate.getMonth() + 1);
        dateInput.min = localDateString(today);
        dateInput.max = localDateString(maxDate);

        select.addEventListener('change', () => {
            appointment.classList.remove('hidden');
            dateInput.value = '';
            timeGrid.replaceChildren();
            continueButton.classList.add('hidden');
            delete continueButton.dataset.time;
        });

        dateInput.addEventListener('change', async () => {
            timeGrid.replaceChildren();
            continueButton.classList.add('hidden');
            delete continueButton.dataset.time;
            if (!dateInput.value) return;

            const selectedDate = new Date(`${dateInput.value}T00:00:00`);
            if (selectedDate.getDay() === 1) {
                timeGrid.append(document.createTextNode('Não abrimos às segundas-feiras.'));
                return;
            }

            const selectedService = select.options[select.selectedIndex];
            if (!select.value) return;
            timeGrid.append(document.createTextNode('Consultando horários...'));
            const checkDate = dateInput.value;
            const serviceId = select.value;
            let reservations;
            try {
                const response = await fetch(
                    `${API_BASE}/horarios?id_servico=${encodeURIComponent(serviceId)}&data=${encodeURIComponent(checkDate)}`
                );
                const result = await response.json();
                if (!response.ok) throw new Error(result.erro || 'Não foi possível consultar os horários.');
                reservations = result;
            } catch (error) {
                console.error('Erro ao carregar horários disponíveis:', error);
                timeGrid.replaceChildren(document.createTextNode('Não foi possível consultar os horários. Tente novamente.'));
                return;
            }

            if (dateInput.value !== checkDate || select.value !== serviceId) return;
            timeGrid.replaceChildren();
            const now = new Date();
            const startHour = selectedDate.getDay() === 0 || selectedDate.getDay() === 6 ? 10 : 9;
            const endHour = selectedDate.getDay() === 0 || selectedDate.getDay() === 6 ? 15 : 18;
            const earliestTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const serviceDuration = Number(selectedService.dataset.duration);
            let availableCount = 0;
            let offeredCount = 0;

            for (let hour = startHour; hour < endHour; hour += 1) {
                const time = `${String(hour).padStart(2, '0')}:00`;
                const slot = new Date(`${dateInput.value}T${time}:00`);
                if (hour === 13 || slot < earliestTime) continue;
                const slotEnd = new Date(slot.getTime() + serviceDuration * 1000);
                if (slotEnd.getHours() > endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)) continue;
                offeredCount += 1;
                const isReserved = reservations.some((reservation) => {
                    const [busyHour, busyMinute] = reservation.hora.split(':').map(Number);
                    const busyStart = new Date(`${dateInput.value}T${String(busyHour).padStart(2, '0')}:${String(busyMinute).padStart(2, '0')}:00`);
                    const busyEnd = new Date(busyStart.getTime() + Number(reservation.duracao_segundos) * 1000);
                    return slot < busyEnd && slotEnd > busyStart;
                });

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'hora-btn';
                button.textContent = time;
                if (isReserved) {
                    button.disabled = true;
                    button.classList.add('reservado');
                    button.textContent = `${time} · reservado`;
                    button.setAttribute('aria-label', `${time}, horário reservado`);
                }
                button.addEventListener('click', () => {
                    timeGrid.querySelectorAll('.hora-btn').forEach((item) => item.classList.remove('selected'));
                    button.classList.add('selected');
                    continueButton.dataset.time = time;
                    continueButton.classList.remove('hidden');
                });
                timeGrid.append(button);
                if (!isReserved) availableCount += 1;
            }

            if (!offeredCount) timeGrid.append(document.createTextNode('Não há horários disponíveis nesta data.'));
            else if (!availableCount) {
                const message = document.createElement('p');
                message.className = 'horarios-indisponiveis';
                message.textContent = 'Todos os horários deste serviço já estão reservados.';
                timeGrid.append(message);
            }
        });

        continueButton.addEventListener('click', () => {
            if (!select.value || !dateInput.value || !continueButton.dataset.time) return;
            const option = select.options[select.selectedIndex];
            agendamentoPendente = {
                id_servico: Number(select.value),
                data_agenda: `${dateInput.value} ${continueButton.dataset.time}:00`,
                servico: option.textContent,
                group
            };
            modalAgendamento.classList.remove('hidden');
            modalAgendamento.setAttribute('aria-hidden', 'false');
            document.getElementById('cli-nome').focus();
        });
    }

    Object.entries(serviceGroups).forEach(([group, config]) => configureScheduling(group, config));

    function closeModal(modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }

    document.querySelectorAll('.modal-fechar').forEach((button) => {
        button.addEventListener('click', () => closeModal(button.closest('.modal')));
    });

    document.querySelectorAll('.modal').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target !== modal) return;
            if (modal.id === 'modal-obrigado') returnToHome();
            else closeModal(modal);
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach((modal) => {
                if (modal.id === 'modal-obrigado') returnToHome();
                else closeModal(modal);
            });
>>>>>>> 3d23365bc154635428577a2225d9f06a99bafe91
        }
    });

<<<<<<< HEAD
        btnConfirmar.addEventListener('click', () => {
            const hora = btnConfirmar.dataset.hora;
            if (!selectServico.value || !inputData.value || !hora) {
                alert('Selecione o serviço, a data e um horário para continuar.');
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
        if (botaoConfirmar) botaoConfirmar.disabled = true;
        try {
            const response = await fetch('http://localhost:3000/tbl_clientes', {
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

    document.querySelectorAll('[data-fechar-modal]').forEach((botao) => {
        botao.addEventListener('click', () => fecharModal(botao.dataset.fecharModal));
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
            const response = await fetch(`http://localhost:3000/detalhe_agendamento?${parametros}`, {
                signal: controller.signal
            });
            const resultados = await response.json();
            if (!response.ok) {
                throw new Error(resultados.erro || 'Não foi possível consultar as reservas.');
=======
    function returnToHome() {
        closeModal(document.getElementById('modal-obrigado'));
        Object.entries(serviceGroups).forEach(([group, config]) => {
            const select = document.getElementById(config.selectId);
            const suffix = group === 'manicure' ? 'unha' : group;
            document.getElementById(`agendamento-${suffix}`).classList.add('hidden');
            document.getElementById(`data-${suffix}`).value = '';
            document.getElementById(`horarios-${suffix}`).replaceChildren();
            const continueButton = document.getElementById(`btn-agendar-${suffix}`);
            continueButton.classList.add('hidden');
            delete continueButton.dataset.time;
            select.selectedIndex = 0;
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.getElementById('btn-voltar-inicio').addEventListener('click', returnToHome);

    function inputValue(id) {
        return document.getElementById(id).value.trim();
    }

    if (formColeta) {
        formColeta.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!agendamentoPendente) {
                alert('Selecione um serviço, uma data e um horário antes de continuar.');
                return;
            }

            const city = inputValue('cli-cidade');
            if (!allowedCities.has(city)) {
                alert('No momento, atendemos somente Mauá, Santo André, São Caetano do Sul, Ribeirão Pires e Capuava.');
                return;
            }

            const submitButton = formColeta.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';
            const data = {
                cliente_nome: inputValue('cli-nome'),
                telefone: inputValue('cli-tel'),
                email: inputValue('cli-email'),
                endereco: inputValue('cli-end'),
                cpf: inputValue('cli-cpf'),
                cidade: city,
                cep: inputValue('cli-cep'),
                id_servico: agendamentoPendente.id_servico,
                data_agenda: agendamentoPendente.data_agenda
            };

            try {
                const response = await fetch(`${API_BASE}/tbl_clientes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) {
                    if (response.status === 409 && agendamentoPendente) {
                        const pending = agendamentoPendente;
                        const suffix = pending.group === 'manicure' ? 'unha' : pending.group;
                        document.getElementById(`data-${suffix}`).dispatchEvent(new Event('change'));
                    }
                    throw new Error(result.erro || 'Não foi possível concluir o agendamento.');
                }

                closeModal(modalAgendamento);
                formColeta.reset();
                agendamentoPendente = null;
                document.getElementById('modal-obrigado').classList.remove('hidden');
                document.getElementById('modal-obrigado').setAttribute('aria-hidden', 'false');
                document.getElementById('btn-voltar-inicio').focus();
            } catch (error) {
                console.error('Erro ao criar agendamento:', error);
                alert(error.message || 'Erro de conexão com o servidor. Verifique se a API está em execução.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Confirmar agendamento';
>>>>>>> 3d23365bc154635428577a2225d9f06a99bafe91
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

    function fecharModal(id) {
        const modal = document.getElementById(id);
        modal?.classList.add('hidden');
        modal?.setAttribute('aria-hidden', 'true');
    }

    function mostrarMensagem(container, mensagem, erro = false) {
        if (!container) return;
        const paragrafo = document.createElement('p');
        paragrafo.textContent = mensagem;
        if (erro) paragrafo.classList.add('mensagem-erro');
        container.replaceChildren(paragrafo);
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
            [
                ['Cliente', reserva.Nome],
                ['Serviço', reserva.Servico],
                ['Data e horário', formatarDataReserva(reserva.Data_servico)],
                ['Profissional', reserva.Profissional]
            ].forEach(([rotulo, valor]) => {
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

    function formatarDataReserva(valor) {
        if (!valor) return 'Não informada';
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleString('pt-BR');
    }

    function formatarDataLocal(data) {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }

    const consultationModal = document.getElementById('modal-consulta');
    const consultationButton = document.getElementById('btn-consultar-reserva');
    const consultationForm = document.getElementById('form-consulta');
    const consultationResult = document.getElementById('resultado-consulta');

    consultationButton.addEventListener('click', () => {
        consultationModal.classList.remove('hidden');
        consultationModal.setAttribute('aria-hidden', 'false');
        document.getElementById('consulta-nome').focus();
    });

    consultationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = inputValue('consulta-nome');
        consultationResult.textContent = 'Buscando reservas...';

        try {
            const response = await fetch(`${API_BASE}/detalhe_agendamento?Nome=${encodeURIComponent(name)}`);
            const result = await response.json();
            if (!response.ok) throw new Error(result.erro || 'Erro ao consultar reservas.');
            consultationResult.replaceChildren();
            if (!result.length) {
                consultationResult.textContent = 'Nenhuma reserva encontrada para este nome.';
                return;
            }

            result.forEach((reservation) => {
                const card = document.createElement('article');
                card.className = 'resultado-reserva';
                const fields = [
                    ['Cliente', reservation.Nome],
                    ['Serviço', reservation.Servico],
                    ['Data/Hora', reservation.Data_servico ? new Date(reservation.Data_servico).toLocaleString('pt-BR') : ''],
                    ['Profissional', reservation.Profissional]
                ];
                fields.forEach(([label, value]) => {
                    if (value === undefined || value === null || value === '') return;
                    const line = document.createElement('p');
                    const strong = document.createElement('strong');
                    strong.textContent = `${label}: `;
                    line.append(strong, document.createTextNode(String(value)));
                    card.append(line);
                });
                consultationResult.append(card);
            });
        } catch (error) {
            console.error('Erro ao consultar reservas:', error);
            consultationResult.textContent = error.message || 'Não foi possível consultar as reservas.';
        }
    });

    fetch(catalogUrl)
        .then(async (response) => {
            const result = await response.json();
            if (!response.ok) throw new Error(result.erro || 'Não foi possível carregar os serviços.');
            if (!Array.isArray(result)) throw new Error('A API retornou um catálogo de serviços inválido.');
            populateServiceSelects(result);
            apiStatus.textContent = result.length
                ? 'Valores e serviços atualizados conforme o cadastro do salão.'
                : 'Nenhum serviço foi encontrado no cadastro do banco.';
            if (!result.length) apiStatus.classList.add('error');
        })
        .catch((error) => {
            console.error('Erro ao carregar catálogo de serviços:', error);
            apiStatus.textContent = 'Não foi possível conectar ao catálogo de serviços. Verifique a API e o banco de dados.';
            apiStatus.classList.add('error');
            Object.values(serviceGroups).forEach((config) => {
                const select = document.getElementById(config.selectId);
                select.replaceChildren(new Option('Serviços indisponíveis — tente novamente mais tarde', ''));
                select.disabled = true;
            });
        });
});
