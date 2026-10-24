(() => {
  'use strict';
  const key = 'teamlink-demo-v1';
  const stages = [['todo', 'A fazer'], ['doing', 'Em andamento'], ['done', 'Concluídas']];
  const people = ['', 'Lia Costa', 'Bruno Lima', 'Nina Reis'];
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
      if (Array.isArray(stored?.tasks) && Array.isArray(stored?.causes)) return stored;
    } catch {}
    return defaults();
  };
  let state = load();
  const save = () => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} };
  const announce = message => { $('#announcement').textContent = message; };
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
    const total = state.tasks.length;
    const doing = state.tasks.filter(task => task.status === 'doing').length;
    const done = state.tasks.filter(task => task.status === 'done').length;
    $('#metric-total').textContent = total;
    $('#metric-doing').textContent = doing;
    $('#metric-done').textContent = done;
    $('#metric-progress').textContent = `${total ? Math.round(done / total * 100) : 0}%`;
    const list = $('#next-tasks');
    list.replaceChildren();
    const pending = state.tasks.filter(task => task.status !== 'done').sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
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
      head.append(node('h3', '', title), node('span', '', String(state.tasks.filter(task => task.status === stage).length)));
      const body = node('div', 'lane-body');
      const tasks = state.tasks.filter(task => task.status === stage);
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
        assigneeLabel.append(select(people.map(person => [person, person || 'Atribuir depois']), task.assignee, event => {
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
    state.tasks.slice().sort((a, b) => a.due.localeCompare(b.due)).forEach(task => {
      const row = node('div', 'timeline-row');
      row.append(node('strong', '', task.title));
      for (let day = 0; day < 7; day++) {
        const cell = node('div', 'timeline-cell');
        if (dateAfter(day) === task.due) cell.append(node('span', 'timeline-dot due'));
        row.append(cell);
      }
      root.append(row);
    });
    if (state.tasks.some(task => task.due > dateAfter(6))) root.append(node('p', 'timeline-note', 'Atividades com prazo posterior aparecem no Kanban.'));
  };
  const renderGut = () => {
    const root = $('#gut-list');
    root.replaceChildren();
    state.tasks.slice().sort((a, b) => score(b) - score(a)).forEach(task => {
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
      const causes = state.causes.filter(cause => cause.category === category);
      if (!causes.length) card.append(node('p', 'none', 'Nenhuma causa registrada.'));
      else {
        const list = node('ul');
        causes.forEach(cause => list.append(node('li', '', cause.description)));
        card.append(list);
      }
      root.append(card);
    });
  };
  const render = () => { renderMetrics(); renderBoard(); renderTimeline(); renderGut(); renderCauses(); };
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
  const openDialog = () => { taskForm.reset(); taskForm.elements.due.value = dateAfter(2); dialog.showModal(); taskForm.elements.title.focus(); };
  $('#new-task').addEventListener('click', openDialog);
  $('.add-task').addEventListener('click', openDialog);
  $('#close-dialog').addEventListener('click', () => dialog.close());
  taskForm.addEventListener('submit', event => {
    event.preventDefault();
    const title = taskForm.elements.title.value.trim();
    if (title.length < 3) return;
    state.tasks.push({id: Math.max(0, ...state.tasks.map(task => task.id)) + 1, title, status: 'todo', assignee: taskForm.elements.assignee.value, due: taskForm.elements.due.value, gut: [3, 3, 3]});
    save(); render(); dialog.close(); location.hash = 'kanban'; announce(`${title} criada em A fazer.`);
  });
  $('#cause-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const description = form.elements.description.value.trim();
    if (description.length < 3) return;
    state.causes.push({category: form.elements.category.value, description});
    save(); renderCauses(); form.reset(); announce('Causa adicionada ao diagrama.');
  });
  render(); showView();
})();
