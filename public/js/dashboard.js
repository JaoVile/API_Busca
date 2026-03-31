const token = localStorage.getItem('token');
if (!token) window.location.href = '/';

document.getElementById('company-name').textContent =
  localStorage.getItem('companyName') || 'Empresa';

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

// Load dashboard data
(async function loadDashboard() {
  try {
    // Credentials status
    const credRes = await api('/credentials/status');
    const cred = await credRes.json();
    const badge = document.getElementById('cred-badge');

    if (cred.whatsappNumber) {
      badge.textContent = 'Credenciais configuradas';
      badge.className = 'badge badge-ok';
      document.getElementById('whatsapp').value = cred.whatsappNumber;
    } else {
      badge.textContent = 'Credenciais pendentes';
      badge.className = 'badge badge-err';
    }

    if (cred.quepasaBaseUrl) {
      document.getElementById('quepasa-url').value = cred.quepasaBaseUrl;
    }

    // Last report log
    const logRes = await api('/reports/last-status');
    const log = await logRes.json();
    const detail = document.getElementById('last-status-detail');

    if (log.executedAt) {
      const date = new Date(log.executedAt).toLocaleString('pt-BR');
      detail.innerHTML = `
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="status-${log.status}">${log.status}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Data</span>
          <span>${date}</span>
        </div>
        ${log.errorDetail ? `
        <div class="info-row" style="flex-direction:column;">
          <span class="info-label">Erro</span>
          <span style="color:#f87171;font-size:0.85rem;margin-top:0.25rem;word-break:break-all;">${log.errorDetail}</span>
        </div>` : ''}
        ${log.message ? `
        <div class="info-row" style="flex-direction:column;">
          <span class="info-label">Mensagem enviada</span>
          <pre style="color:#94a3b8;font-size:0.8rem;margin-top:0.25rem;white-space:pre-wrap;">${log.message}</pre>
        </div>` : ''}
      `;
    } else {
      detail.innerHTML = '<span style="color:#94a3b8;">Nenhum relatorio gerado ainda</span>';
    }
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
  }
})();

async function saveCredentials(e) {
  e.preventDefault();
  const msg = document.getElementById('dash-msg');

  try {
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
    msg.textContent = res.ok ? 'Credenciais salvas!' : data.error;
    msg.style.color = res.ok ? '#34d399' : '#f87171';
    if (res.ok) setTimeout(() => location.reload(), 1000);
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = '#f87171';
  }
}

async function triggerReport() {
  const msg = document.getElementById('dash-msg');
  msg.textContent = 'Gerando relatorio...';
  msg.style.color = '#fbbf24';

  try {
    const res = await api('/reports/trigger', { method: 'POST' });
    const data = await res.json();
    msg.textContent = res.ok ? 'Relatorio disparado! Atualizando em 8s...' : data.error;
    msg.style.color = res.ok ? '#34d399' : '#f87171';
    if (res.ok) setTimeout(() => location.reload(), 8000);
  } catch (err) {
    msg.textContent = err.message;
    msg.style.color = '#f87171';
  }
}

async function loadHistory() {
  const section = document.getElementById('history-section');
  const list = document.getElementById('history-list');
  section.style.display = 'block';
  list.innerHTML = 'Carregando...';

  try {
    const res = await api('/reports/history');
    const logs = await res.json();

    if (!logs.length) {
      list.innerHTML = '<span style="color:#94a3b8;">Nenhum registro</span>';
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

    section.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    list.innerHTML = `<span style="color:#f87171;">${err.message}</span>`;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('companyName');
  window.location.href = '/';
}
