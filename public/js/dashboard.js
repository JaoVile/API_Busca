const token = localStorage.getItem('token');
if (!token) window.location.href = '/';

const companyName = localStorage.getItem('companyName') || 'Empresa';

// ── API helper ──
async function api(path, options = {}) {
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

// ── State ──
let credentialsData = null;   // { whatsappNumber, quepasaBaseUrl, updatedAt }
let lastReport = null;        // last report log
let isEditing = false;

// ── Load everything ──
(async function loadDashboard() {
  try {
    const [credRes, logRes] = await Promise.all([
      api('/credentials/status'),
      api('/reports/last-status'),
    ]);

    credentialsData = await credRes.json();
    lastReport = await logRes.json();

    renderCompanyList();
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
    document.getElementById('company-list').innerHTML =
      '<div class="section" style="color:#f87171;text-align:center;">Erro ao carregar dados</div>';
  }
})();

// ── Render ──
function renderCompanyList() {
  const container = document.getElementById('company-list');

  const hasCredentials = credentialsData && credentialsData.whatsappNumber;

  if (!hasCredentials) {
    container.innerHTML = `
      <div class="section empty-state">
        <h3>Nenhuma empresa configurada</h3>
        <p>Clique em "+ Nova Empresa" para comecar</p>
      </div>
    `;
    return;
  }

  // Build the company card
  const statusBadge = getStatusBadge();
  const lastDate = lastReport && lastReport.executedAt
    ? new Date(lastReport.executedAt).toLocaleString('pt-BR')
    : 'Nunca';
  const lastStatus = lastReport && lastReport.status
    ? lastReport.status
    : 'N/A';

  container.innerHTML = `
    <div class="company-card" id="card-main">
      <!-- Header -->
      <div class="company-header">
        <div>
          <h2>${companyName}</h2>
          ${statusBadge}
        </div>
        <div class="company-actions">
          <button class="btn-trigger btn-sm" onclick="triggerReport()" id="btn-trigger">
            Testar Envio
          </button>
          <button class="btn-edit btn-sm" onclick="openCredentialModal(true)">Editar</button>
          <button class="btn-delete btn-sm" onclick="confirmDelete()">Excluir</button>
        </div>
      </div>

      <!-- Quick stats strip -->
      <div class="status-strip">
        <div class="stat">
          <span class="stat-label">Ultimo Envio</span>
          <span class="stat-value status-${lastStatus}">${lastStatus}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Data</span>
          <span class="stat-value">${lastDate}</span>
        </div>
        <div class="stat">
          <span class="stat-label">WhatsApp</span>
          <span class="stat-value">${formatPhone(credentialsData.whatsappNumber)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Quepasa</span>
          <span class="stat-value" style="font-size:0.8rem;">${credentialsData.quepasaBaseUrl || 'N/A'}</span>
        </div>
      </div>

      <!-- Card message area -->
      <p class="card-msg" id="card-msg"></p>

      <!-- Last report detail -->
      <div class="company-body" id="report-detail">
        ${renderLastReport()}
      </div>

      <!-- History toggle -->
      <div style="padding: 0 1.5rem 1rem; text-align: center;">
        <button style="background:#334155; font-size:0.85rem;" onclick="loadHistory()">
          Ver Historico Completo
        </button>
      </div>
    </div>
  `;
}

function getStatusBadge() {
  if (!lastReport || !lastReport.status) {
    return '<span class="badge badge-none">Sem envios</span>';
  }
  const map = {
    SUCCESS: { cls: 'badge-ok', text: 'Funcionando' },
    PARTIAL_FAILURE: { cls: 'badge-warn', text: 'Parcial' },
    FAILURE: { cls: 'badge-err', text: 'Erro' },
  };
  const b = map[lastReport.status] || { cls: 'badge-none', text: lastReport.status };
  return `<span class="badge ${b.cls}">${b.text}</span>`;
}

function renderLastReport() {
  if (!lastReport || !lastReport.executedAt) {
    return '<p style="color:#64748b;text-align:center;padding:1rem;">Nenhum relatorio gerado ainda. Clique em "Testar Envio".</p>';
  }

  const date = new Date(lastReport.executedAt).toLocaleString('pt-BR');
  let html = `
    <div class="info-row">
      <span class="info-label">Status</span>
      <span class="status-${lastReport.status}">${lastReport.status}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Data</span>
      <span>${date}</span>
    </div>
  `;

  if (lastReport.errorDetail) {
    html += `
    <div class="info-row" style="flex-direction:column;">
      <span class="info-label">Erro</span>
      <span style="color:#f87171;font-size:0.85rem;margin-top:0.25rem;word-break:break-all;">${lastReport.errorDetail}</span>
    </div>`;
  }

  if (lastReport.message) {
    html += `
    <div class="info-row" style="flex-direction:column;">
      <span class="info-label">Mensagem enviada</span>
      <pre style="color:#94a3b8;font-size:0.8rem;margin-top:0.25rem;white-space:pre-wrap;">${lastReport.message}</pre>
    </div>`;
  }

  return html;
}

// ── Format phone ──
function formatPhone(num) {
  if (!num) return 'N/A';
  // 5581999430696 → +55 81 99943-0696
  if (num.length === 13) {
    return `+${num.slice(0,2)} ${num.slice(2,4)} ${num.slice(4,9)}-${num.slice(9)}`;
  }
  return num;
}

// ── Credential Modal ──
function openCredentialModal(editing = false) {
  isEditing = editing;
  const modal = document.getElementById('cred-modal');
  const title = document.getElementById('modal-title');
  const msg = document.getElementById('modal-msg');
  msg.textContent = '';

  title.textContent = editing ? 'Editar Credenciais' : 'Configurar Credenciais';

  // Clear fields when adding new
  if (!editing) {
    document.getElementById('cred-form').reset();
    document.getElementById('quepasa-url').value = 'http://localhost:31000';
  } else {
    // Pre-fill non-secret fields
    if (credentialsData) {
      document.getElementById('whatsapp').value = credentialsData.whatsappNumber || '';
      document.getElementById('quepasa-url').value = credentialsData.quepasaBaseUrl || 'http://localhost:31000';
    }
    // Passwords stay empty — user must re-enter tokens
  }

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('cred-modal').classList.remove('active');
}

async function saveCredentials(e) {
  e.preventDefault();
  const msg = document.getElementById('modal-msg');

  try {
    msg.textContent = 'Salvando...';
    msg.style.color = '#fbbf24';

    const res = await api('/credentials', {
      method: 'PUT',
      body: JSON.stringify({
        providerToken: document.getElementById('provider-token').value,
        providerUser: document.getElementById('provider-user').value,
        providerPass: document.getElementById('provider-pass').value,
        quepasaToken: document.getElementById('quepasa-token').value,
        quepasaBaseUrl: document.getElementById('quepasa-url').value,
        whatsappNumber: document.getElementById('whatsapp').value,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      msg.textContent = 'Credenciais salvas!';
      msg.style.color = '#34d399';
      setTimeout(() => {
        closeModal();
        location.reload();
      }, 1000);
    } else {
      msg.textContent = data.error || 'Erro ao salvar';
      msg.style.color = '#f87171';
    }
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = '#f87171';
  }
}

// ── Trigger Report ──
async function triggerReport() {
  const msg = document.getElementById('card-msg');
  const btn = document.getElementById('btn-trigger');

  btn.disabled = true;
  btn.textContent = 'Enviando...';
  msg.textContent = 'Gerando relatorio...';
  msg.style.color = '#fbbf24';

  try {
    const res = await api('/reports/trigger', { method: 'POST' });
    const data = await res.json();

    if (res.ok) {
      msg.textContent = 'Relatorio disparado! Atualizando em 8s...';
      msg.style.color = '#34d399';
      setTimeout(() => location.reload(), 8000);
    } else {
      msg.textContent = data.error || 'Erro ao disparar';
      msg.style.color = '#f87171';
      btn.disabled = false;
      btn.textContent = 'Testar Envio';
    }
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = '#f87171';
    btn.disabled = false;
    btn.textContent = 'Testar Envio';
  }
}

// ── Delete credentials ──
function confirmDelete() {
  if (!confirm(`Tem certeza que deseja excluir as credenciais de "${companyName}"?\n\nIsso removerá todas as configurações e histórico.`)) {
    return;
  }
  deleteCredentials();
}

async function deleteCredentials() {
  try {
    const res = await api('/credentials', { method: 'DELETE' });

    if (res.ok) {
      location.reload();
    } else {
      const data = await res.json();
      alert(data.error || 'Erro ao excluir');
    }
  } catch (err) {
    alert(err.message);
  }
}

// ── History ──
async function loadHistory() {
  const modal = document.getElementById('history-modal');
  const list = document.getElementById('history-list');
  modal.classList.add('active');
  list.innerHTML = '<p style="color:#94a3b8;text-align:center;">Carregando...</p>';

  try {
    const res = await api('/reports/history');
    const logs = await res.json();

    if (!logs.length) {
      list.innerHTML = '<p style="color:#94a3b8;text-align:center;">Nenhum registro</p>';
      return;
    }

    list.innerHTML = logs.map(log => {
      const date = new Date(log.executedAt).toLocaleString('pt-BR');
      return `
        <div class="log-item">
          <span class="status status-${log.status}">${log.status}</span>
          <span class="date"> — ${date}</span>
          ${log.errorDetail ? `<div class="error">${log.errorDetail}</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    list.innerHTML = `<p style="color:#f87171;">${err.message}</p>`;
  }
}

function closeHistoryModal() {
  document.getElementById('history-modal').classList.remove('active');
}

// ── Logout ──
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('companyName');
  window.location.href = '/';
}
