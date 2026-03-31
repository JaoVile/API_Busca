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

(async function loadDashboard() {
  try {
    const credRes = await api('/credentials/status');
    const cred = await credRes.json();

    if (cred.whatsappNumber) {
      document.getElementById('whatsapp').value = cred.whatsappNumber;
    }
    if (cred.quepasaBaseUrl) {
      document.getElementById('quepasa-url').value = cred.quepasaBaseUrl;
    }

    const logRes = await api('/reports/last-status');
    const log = await logRes.json();

    const box = document.getElementById('last-status');

    if (log.executedAt) {
      const date = new Date(log.executedAt).toLocaleString('pt-BR');
      box.textContent = `Ultimo envio: ${log.status} — ${date}`;
      box.className = `status-box status-${log.status === 'SUCCESS' ? 'success' : 'failure'}`;
    } else {
      box.textContent = 'Nenhum relatorio gerado ainda';
      box.className = 'status-box status-none';
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
  } catch (err) {
    msg.textContent = err.message;
  }
}

async function triggerReport() {
  const msg = document.getElementById('dash-msg');
  msg.textContent = 'Gerando relatorio...';

  try {
    const res = await api('/reports/trigger', { method: 'POST' });
    const data = await res.json();
    msg.textContent = res.ok ? 'Relatorio disparado!' : data.error;

    setTimeout(() => window.location.reload(), 6000);
  } catch (err) {
    msg.textContent = err.message;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('companyName');
  window.location.href = '/';
}
