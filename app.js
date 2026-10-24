(() => {
  'use strict';
  const key = 'teamlink-demo-v1';
  const stages = [['todo', 'A fazer'], ['doing', 'Em andamento'], ['done', 'Concluídas']];
  const people = () => ['', ...state.members.map(member => member.name)];
  const categories = ['Pessoas', 'Processos', 'Ferramentas', 'Materiais', 'Ambiente', 'Gestão'];
  const $ = selector => document.querySelector(selector);
  const node = (tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  };
  const dateAfter = days => {
    const value = new Date();
    value.setDate(value.getDate() + days);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  };
  const readableDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}) : 'Sem prazo';
  const defaults = () => ({
    activeProjectId: 'aurora',
    projects: [{id: 'aurora', name: 'Estúdio Aurora', description: 'Lançamento do aplicativo'}],
    teams: [{id: 'produto', name: 'Produto digital'}],
    members: [
      {id: 1, name: 'Lia Costa', role: 'Coordenação', teamId: 'produto'},
      {id: 2, name: 'Bruno Lima', role: 'Design', teamId: 'produto'},
      {id: 3, name: 'Nina Reis', role: 'Desenvolvimento', teamId: 'produto'}
    ],
    messages: [{id: 1, projectId: 'aurora', text: 'Alinhar a validação do protótipo antes da entrega.', createdAt: new Date().toISOString()}],
    tasks: [
      {id: 1, title: 'Mapear necessidades dos usuários', status: 'done', assignee: 'Lia Costa', due: dateAfter(1), gut: [3, 3, 2]},
      {id: 2, title: 'Criar identidade visual do aplicativo', status: 'doing', assignee: 'Bruno Lima', due: dateAfter(2), gut: [3, 4, 3]},
      {id: 3, title: 'Construir protótipo navegável', status: 'doing', assignee: 'Nina Reis', due: dateAfter(3), gut: [4, 4, 3]},
      {id: 4, title: 'Validar fluxo com cinco usuários', status: 'todo', assignee: 'Lia Costa', due: dateAfter(4), gut: [5, 5, 4]},
      {id: 5, title: 'Revisar acessibilidade das telas', status: 'todo', assignee: 'Bruno Lima', due: dateAfter(5), gut: [4, 3, 4]},
      {id: 6, title: 'Preparar apresentação de lançamento', status: 'todo', assignee: '', due: dateAfter(6), gut: [2, 3, 2]}
    ],
    causes: [
      {category: 'Pessoas', description: 'Pouco tempo para validação com usuários'},
      {category: 'Processos', description: 'Aprovações concentradas no fim do projeto'},
      {category: 'Ferramentas', description: 'Ambiente de testes ainda incompleto'},
      {category: 'Gestão', description: 'Dependências sem prazo combinado'}
    ]
  });
  const load = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(stored?.tasks) && Array.isArray(stored?.causes)) {
        const initial = defaults();
        const projects = Array.isArray(stored.projects) && stored.projects.length ? stored.projects : initial.projects;
        return {
          ...initial, ...stored, projects,
          activeProjectId: projects.some(project => project.id === stored.activeProjectId) ? stored.activeProjectId : projects[0].id,
          tasks: stored.tasks.map(task => ({...task, projectId: task.projectId || 'aurora'})),
          causes: stored.causes.map(cause => ({...cause, projectId: cause.projectId || 'aurora'})),
          teams: Array.isArray(stored.teams) ? stored.teams : initial.teams,
          members: Array.isArray(stored.members) ? stored.members : initial.members,
          messages: Array.isArray(stored.messages) ? stored.messages : initial.messages
        };
      }
    } catch {}
    return defaults();
  };
  let state = load();
  const save = () => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} };
  const announce = message => { $('#announcement').textContent = message; };
  const activeProject = () => state.projects.find(project => project.id === state.activeProjectId) || state.projects[0];
  const activeTasks = () => state.tasks.filter(task => (task.projectId || 'aurora') === state.activeProjectId);
  const nextId = items => Math.max(0, ...items.map(item => Number(item.id) || 0)) + 1;
  const taskById = id => state.tasks.find(task => task.id === id);
  const labelFor = value => stages.find(([id]) => id === value)?.[1] || 'A fazer';
  const score = task => task.gut.reduce((total, value) => total * value, 1);
  const select = (values, selected, onChange, accessibleName) => {
    const element = node('select');
    element.setAttribute('aria-label', accessibleName);
    values.forEach(([value, label]) => {
      const option = node('option', '', label);
      option.value = value;
      option.selected = value === selected;
      element.append(option);
    });
    element.addEventListener('change', onChange);
    return element;
  };
  const renderMetrics = () => {
    const tasks = activeTasks();
    const total = tasks.length;
    const doing = tasks.filter(task => task.status === 'doing').length;
    const done = tasks.filter(task => task.status === 'done').length;
    $('#metric-total').textContent = total;
    $('#metric-doing').textContent = doing;
    $('#metric-done').textContent = done;
    $('#metric-progress').textContent = `${total ? Math.round(done / total * 100) : 0}%`;
    const list = $('#next-tasks');
    list.replaceChildren();
    const pending = tasks.filter(task => task.status !== 'done').sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
    if (!pending.length) list.append(node('p', 'timeline-note', 'Todas as atividades foram concluídas.'));
    pending.forEach(task => {
      const row = node('div', 'next-row');
      const text = node('div');
      text.append(node('strong', '', task.title), node('small', '', task.assignee || 'Sem responsável'));
      row.append(text, node('span', '', readableDate(task.due)));
      list.append(row);
    });
  };
  const renderBoard = () => {
    const board = $('#board');
    board.replaceChildren();
    stages.forEach(([stage, title]) => {
      const lane = node('section', 'lane');
      lane.dataset.stage = stage;
      lane.setAttribute('aria-label', title);
      const head = node('header', 'lane-head');
      head.append(node('h3', '', title), node('span', '', String(activeTasks().filter(task => task.status === stage).length)));
      const body = node('div', 'lane-body');
      const tasks = activeTasks().filter(task => task.status === stage);
      if (!tasks.length) body.append(node('p', 'empty-lane', 'Solte uma atividade aqui.'));
      tasks.forEach(task => {
        const card = node('article', 'task-card');
        card.draggable = true;
        card.dataset.id = String(task.id);
        card.addEventListener('dragstart', event => {
          if (event.target.closest('select')) { event.preventDefault(); return; }
          event.dataTransfer.setData('text/plain', String(task.id));
          event.dataTransfer.effectAllowed = 'move';
          card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        const top = node('div', 'task-card-top');
        const severity = score(task) >= 50 ? 'high' : score(task) < 15 ? 'low' : '';
        top.append(node('span', '', `TL-${String(task.id).padStart(2, '0')}`), node('span', `priority ${severity}`, `GUT ${score(task)}`));
        const meta = node('div', 'task-card-meta');
        meta.append(node('span', '', task.assignee || 'Sem responsável'), node('span', '', readableDate(task.due)));
        const assigneeLabel = node('label', '', 'Responsável');
        assigneeLabel.append(select(people().map(person => [person, person || 'Atribuir depois']), task.assignee, event => {
          task.assignee = event.target.value;
          save(); render(); announce(`${task.title}: responsável atualizado.`);
        }, `Responsável de ${task.title}`));
        const stageLabel = node('label', '', 'Etapa');
        stageLabel.append(select(stages, task.status, event => {
          task.status = event.target.value;
          save(); render(); announce(`${task.title} movida para ${labelFor(task.status)}.`);
        }, `Etapa de ${task.title}`));
        card.append(top, node('h4', '', task.title), meta, assigneeLabel, stageLabel);
        body.append(card);
      });
      lane.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; lane.classList.add('drop-target'); });
      lane.addEventListener('dragleave', event => { if (!lane.contains(event.relatedTarget)) lane.classList.remove('drop-target'); });
      lane.addEventListener('drop', event => {
        event.preventDefault();
        lane.classList.remove('drop-target');
        const id = Number(event.dataTransfer.getData('text/plain'));
        const task = taskById(id);
        if (!task || task.status === stage) return;
        task.status = stage;
        save(); render(); announce(`${task.title} movida para ${title}.`);
      });
      lane.append(head, body);
      board.append(lane);
    });
  };
  const renderTimeline = () => {
    const root = $('#timeline');
    root.replaceChildren();
    const head = node('div', 'timeline-head');
    head.append(node('span', '', 'ATIVIDADE'));
    for (let day = 0; day < 7; day++) head.append(node('span', '', readableDate(dateAfter(day))));
    root.append(head);
    activeTasks().slice().sort((a, b) => a.due.localeCompare(b.due)).forEach(task => {
      const row = node('div', 'timeline-row');
      row.append(node('strong', '', task.title));
      for (let day = 0; day < 7; day++) {
        const cell = node('div', 'timeline-cell');
        if (dateAfter(day) === task.due) cell.append(node('span', 'timeline-dot due'));
        row.append(cell);
      }
      root.append(row);
    });
    if (activeTasks().some(task => task.due > dateAfter(6))) root.append(node('p', 'timeline-note', 'Atividades com prazo posterior aparecem no Kanban.'));
  };
  const renderGut = () => {
    const root = $('#gut-list');
    root.replaceChildren();
    activeTasks().slice().sort((a, b) => score(b) - score(a)).forEach(task => {
      const row = node('div', 'gut-row');
      const title = node('div');
      title.append(node('h3', '', task.title), node('small', '', `${task.assignee || 'Sem responsável'} · ${labelFor(task.status)}`));
      row.append(title);
      ['Gravidade', 'Urgência', 'Tendência'].forEach((name, index) => {
        const label = node('label', '', name);
        const options = Array.from({length: 5}, (_, i) => [String(i + 1), String(i + 1)]);
        label.append(select(options, String(task.gut[index]), event => {
          task.gut[index] = Number(event.target.value);
          save(); renderGut(); renderBoard(); announce(`Prioridade de ${task.title}: ${score(task)} pontos.`);
        }, `${name} de ${task.title}`));
        row.append(label);
      });
      const output = node('output', '', String(score(task)));
      output.setAttribute('aria-label', `Pontuação GUT de ${task.title}`);
      row.append(output);
      root.append(row);
    });
  };
  const renderCauses = () => {
    const root = $('#cause-grid');
    root.replaceChildren();
    categories.forEach(category => {
      const card = node('section', 'cause-category');
      card.append(node('h3', '', category));
      const causes = state.causes.filter(cause => cause.category === category && (cause.projectId || 'aurora') === state.activeProjectId);
      if (!causes.length) card.append(node('p', 'none', 'Nenhuma causa registrada.'));
      else {
        const list = node('ul');
        causes.forEach(cause => list.append(node('li', '', cause.description)));
        card.append(list);
      }
      root.append(card);
    });
  };
  const renderProjects = () => {
    const pickers = [$('#project-switcher'), $('#mobile-project-switcher')];
    pickers.forEach(picker => {
      picker.replaceChildren();
      state.projects.forEach(project => {
        const option = node('option', '', project.name);
        option.value = project.id;
        picker.append(option);
      });
      picker.value = state.activeProjectId;
    });
    $('#workspace-name').textContent = activeProject().name;
    $('#workspace-description').textContent = activeProject().description || 'Espaço de trabalho';
    $('.crumb').textContent = `/ ${activeProject().name} / Demonstração`;
    const list = $('#project-list');
    list.replaceChildren();
    state.projects.forEach(project => {
      const tasks = state.tasks.filter(task => (task.projectId || 'aurora') === project.id);
      const card = node('article', `panel feature-card${project.id === state.activeProjectId ? ' selected' : ''}`);
      card.append(node('span', 'kicker', project.id === state.activeProjectId ? 'PROJETO ATIVO' : 'PROJETO'), node('h3', '', project.name), node('p', '', project.description || 'Sem descrição.'));
      const progress = tasks.length ? Math.round(tasks.filter(task => task.status === 'done').length / tasks.length * 100) : 0;
      card.append(node('small', '', `${tasks.length} atividades · ${progress}% concluído`));
      const button = node('button', 'button subtle', project.id === state.activeProjectId ? 'Projeto ativo' : 'Abrir projeto →');
      button.type = 'button';
      button.disabled = project.id === state.activeProjectId;
      button.addEventListener('click', () => { state.activeProjectId = project.id; save(); render(); location.hash = 'visao-geral'; announce(`${project.name} selecionado.`); });
      card.append(button);
      list.append(card);
    });
  };
  const renderTeam = () => {
    $('#member-count').textContent = `${state.members.length} pessoas`;
    $('#team-count').textContent = `${state.teams.length} ${state.teams.length === 1 ? 'equipe' : 'equipes'}`;
    const members = $('#member-list');
    members.replaceChildren();
    state.members.forEach(member => {
      const row = node('div', 'team-person');
      const initials = member.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
      const detail = node('div');
      detail.append(node('strong', '', member.name), node('small', '', member.role));
      row.append(node('span', '', initials), detail, select([['', 'Sem equipe'], ...state.teams.map(team => [team.id, team.name])], member.teamId || '', event => {
        member.teamId = event.target.value; save(); renderTeam(); announce(`Equipe de ${member.name} atualizada.`);
      }, `Equipe de ${member.name}`));
      members.append(row);
    });
    const teams = $('#team-list');
    teams.replaceChildren();
    state.teams.forEach(team => {
      const row = node('div', 'team-person');
      row.append(node('span', '', team.name.slice(0, 2).toUpperCase()));
      const detail = node('div');
      detail.append(node('strong', '', team.name), node('small', '', `${state.members.filter(member => member.teamId === team.id).length} participantes`));
      row.append(detail);
      teams.append(row);
    });
    const overview = $('.overview-grid .panel:nth-child(2)');
    overview.querySelector('.panel-title span').textContent = `${state.members.length} PESSOAS`;
    overview.querySelectorAll('.team-person').forEach(row => row.remove());
    state.members.forEach(member => {
      const row = node('div', 'team-person');
      const detail = node('div');
      detail.append(node('strong', '', member.name), node('small', '', member.role));
      row.append(node('span', '', member.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()), detail);
      overview.append(row);
    });
  };
  let calendarDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    $('#calendar-month').textContent = calendarDate.toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'});
    const grid = $('#calendar-grid');
    grid.replaceChildren();
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(day => grid.append(node('strong', 'calendar-weekday', day)));
    const days = new Date(year, month + 1, 0).getDate();
    for (let blank = 0; blank < new Date(year, month, 1).getDay(); blank++) grid.append(node('div', 'calendar-cell outside'));
    for (let day = 1; day <= days; day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const due = activeTasks().filter(task => task.due === date);
      const cell = node('div', `calendar-cell${date === dateAfter(0) ? ' today' : ''}`);
      cell.append(node('span', '', String(day)));
      due.slice(0, 2).forEach(task => cell.append(node('small', '', task.title)));
      if (due.length > 2) cell.append(node('small', '', `+ ${due.length - 2} atividade(s)`));
      grid.append(cell);
    }
    const agenda = $('#calendar-agenda');
    agenda.replaceChildren(node('h3', '', 'Entregas do mês'));
    const tasks = activeTasks().filter(task => task.due?.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).sort((a, b) => a.due.localeCompare(b.due));
    if (!tasks.length) agenda.append(node('p', '', 'Nenhuma entrega prevista neste mês.'));
    tasks.forEach(task => {
      const row = node('div', 'next-row');
      row.append(node('strong', '', task.title), node('span', '', readableDate(task.due)));
      agenda.append(row);
    });
  };
  const renderConversations = () => {
    const list = $('#conversation-list');
    list.replaceChildren();
    const messages = state.messages.filter(message => message.projectId === state.activeProjectId).slice().reverse();
    if (!messages.length) list.append(node('p', 'timeline-note', 'Nenhuma conversa registrada para este projeto.'));
    messages.forEach(message => {
      const item = node('article', 'conversation-item');
      item.append(node('small', '', new Date(message.createdAt).toLocaleString('pt-BR')), node('p', '', message.text));
      list.append(item);
    });
  };
  const renderReports = () => {
    const tasks = activeTasks();
    const done = tasks.filter(task => task.status === 'done').length;
    const metrics = [['Atividades', tasks.length], ['Concluídas', done], ['Progresso', `${tasks.length ? Math.round(done / tasks.length * 100) : 0}%`], ['Pessoas', state.members.length]];
    const root = $('#report-metrics');
    root.replaceChildren();
    metrics.forEach(([label, value]) => {
      const card = node('article');
      card.append(node('span', '', label), node('strong', '', String(value)));
      root.append(card);
    });
    const stageList = $('#report-stages');
    stageList.replaceChildren();
    stages.forEach(([id, label]) => {
      const count = tasks.filter(task => task.status === id).length;
      const row = node('div', 'report-row');
      row.append(node('span', '', label));
      const track = node('i', 'report-track');
      const fill = node('b');
      fill.style.width = `${tasks.length ? count / tasks.length * 100 : 0}%`;
      track.append(fill);
      row.append(track, node('strong', '', String(count)));
      stageList.append(row);
    });
    const personList = $('#report-people');
    personList.replaceChildren();
    state.members.forEach(member => {
      const assigned = tasks.filter(task => task.assignee === member.name);
      const row = node('div', 'report-row');
      row.append(node('span', '', member.name), node('strong', '', `${assigned.filter(task => task.status === 'done').length}/${assigned.length}`));
      personList.append(row);
    });
  };
  const renderData = () => {
    const bytes = new Blob([JSON.stringify(state)]).size;
    $('#data-summary').textContent = `${state.projects.length} projetos · ${state.tasks.length} atividades · ${state.members.length} pessoas · ${(bytes / 1024).toFixed(1)} KB de dados locais`;
  };
  const render = () => { renderProjects(); renderMetrics(); renderBoard(); renderTimeline(); renderGut(); renderCauses(); renderTeam(); renderCalendar(); renderConversations(); renderReports(); renderData(); };
  const showView = () => {
    const requested = location.hash.slice(1);
    const view = document.getElementById(requested)?.classList.contains('view') ? requested : 'visao-geral';
    document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === view));
    document.querySelectorAll('[data-view]').forEach(link => {
      link.classList.toggle('active', link.dataset.view === view);
      if (link.dataset.view === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };
  window.addEventListener('hashchange', showView);
  $('#reset-demo').addEventListener('click', () => {
    if (!confirm('Reiniciar a demonstração e descartar suas alterações neste navegador?')) return;
    state = defaults(); save(); render(); announce('Demonstração reiniciada.');
  });
  const dialog = $('#task-dialog');
  const taskForm = $('#task-form');
  const openDialog = () => {
    taskForm.reset();
    taskForm.elements.due.value = dateAfter(2);
    const assignees = taskForm.elements.assignee;
    assignees.replaceChildren();
    people().forEach(person => {
      const option = node('option', '', person || 'Atribuir depois');
      option.value = person;
      assignees.append(option);
    });
    dialog.showModal();
    taskForm.elements.title.focus();
  };
  $('#new-task').addEventListener('click', openDialog);
  $('.add-task').addEventListener('click', openDialog);
  $('#close-dialog').addEventListener('click', () => dialog.close());
  taskForm.addEventListener('submit', event => {
    event.preventDefault();
    const title = taskForm.elements.title.value.trim();
    if (title.length < 3) return;
    state.tasks.push({id: nextId(state.tasks), projectId: state.activeProjectId, title, status: 'todo', assignee: taskForm.elements.assignee.value, due: taskForm.elements.due.value, gut: [3, 3, 3]});
    save(); render(); dialog.close(); location.hash = 'kanban'; announce(`${title} criada em A fazer.`);
  });
  $('#cause-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const description = form.elements.description.value.trim();
    if (description.length < 3) return;
    state.causes.push({projectId: state.activeProjectId, category: form.elements.category.value, description});
    save(); renderCauses(); form.reset(); announce('Causa adicionada ao diagrama.');
  });
  [$('#project-switcher'), $('#mobile-project-switcher')].forEach(picker => picker.addEventListener('change', event => {
    state.activeProjectId = event.target.value;
    save(); render(); announce(`${activeProject().name} selecionado.`);
  }));
  $('#project-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    if (name.length < 3) return;
    const id = `project-${Date.now()}`;
    state.projects.push({id, name, description: form.elements.description.value.trim()});
    state.activeProjectId = id;
    save(); render(); form.reset(); announce(`${name} criado.`);
  });
  $('#member-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    const role = form.elements.role.value.trim();
    if (name.length < 2 || !role || state.members.some(member => member.name.toLowerCase() === name.toLowerCase())) return;
    state.members.push({id: nextId(state.members), name, role, teamId: state.teams[0]?.id || ''});
    save(); render(); form.reset(); announce(`${name} adicionado à equipe.`);
  });
  $('#team-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    if (name.length < 2) return;
    state.teams.push({id: `team-${Date.now()}`, name});
    save(); render(); form.reset(); announce(`Equipe ${name} criada.`);
  });
  $('#conversation-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = form.elements.message.value.trim();
    if (message.length < 3) return;
    state.messages.push({id: nextId(state.messages), projectId: state.activeProjectId, text: message, createdAt: new Date().toISOString()});
    save(); renderConversations(); renderData(); form.reset(); announce('Mensagem registrada.');
  });
  $('#calendar-prev').addEventListener('click', () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1); renderCalendar(); });
  $('#calendar-next').addEventListener('click', () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1); renderCalendar(); });
  $('#export-data').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({product: 'TeamLink', version: 2, exportedAt: new Date().toISOString(), data: state}, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = node('a');
    link.href = url;
    link.download = `teamlink-backup-${dateAfter(0)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Backup exportado.');
  });
  $('#import-trigger').addEventListener('click', () => $('#import-data').click());
  $('#import-data').addEventListener('change', async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('Arquivo acima de 2 MB.');
      const backup = JSON.parse(await file.text());
      const data = backup?.product === 'TeamLink' ? backup.data : null;
      const valid = data && Array.isArray(data.tasks) && data.tasks.every(task => Number.isFinite(Number(task.id)) && typeof task.title === 'string' && stages.some(([id]) => id === task.status) && typeof task.due === 'string' && Array.isArray(task.gut) && task.gut.length === 3 && task.gut.every(value => Number.isInteger(value) && value >= 1 && value <= 5))
        && Array.isArray(data.causes) && data.causes.every(cause => typeof cause.category === 'string' && typeof cause.description === 'string')
        && Array.isArray(data.projects) && data.projects.length > 0 && data.projects.every(project => typeof project.id === 'string' && typeof project.name === 'string' && project.name.trim())
        && Array.isArray(data.members) && data.members.every(member => typeof member.name === 'string' && typeof member.role === 'string')
        && Array.isArray(data.teams) && data.teams.every(team => typeof team.id === 'string' && typeof team.name === 'string')
        && Array.isArray(data.messages) && data.messages.every(message => typeof message.projectId === 'string' && typeof message.text === 'string' && typeof message.createdAt === 'string' && !Number.isNaN(Date.parse(message.createdAt)));
      if (!valid) throw new Error('Arquivo de backup inválido.');
      if (!confirm('Importar este backup e substituir os dados desta demonstração?')) return;
      localStorage.setItem(key, JSON.stringify(data));
      state = load();
      save(); render(); announce('Backup importado com sucesso.');
    } catch (error) { alert(error.message || 'Não foi possível importar o backup.'); }
    finally { input.value = ''; }
  });
  render(); showView();
})();
