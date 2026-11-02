document.addEventListener('DOMContentLoaded', () => {
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
        }
    };

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
        }
    });

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
            }
        });
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
