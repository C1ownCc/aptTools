(function() {
  const apiKey = (window.APP_CONFIG && window.APP_CONFIG.apiKey) || '';
  const baseApi = (window.APP_CONFIG && window.APP_CONFIG.baseApi) || '';

  function formatJSON(data) {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return String(data);
    }
  }

  function parseQueryString(raw) {
    const params = new URLSearchParams();
    if (!raw) return params;
    raw.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) params.append(k, v || '');
    });
    return params;
  }

  async function callApi(source) {
    const form = source.closest('form.api-form');
    const endpoint = (form && form.dataset.endpoint) || source.dataset.endpoint;
    const method = ((form && form.dataset.method) || source.dataset.method || 'GET').toUpperCase();
    const resultEl = (form && form.parentElement.querySelector('.result')) || document.querySelector('.result');

    if (!endpoint || !resultEl) return;

    let url = baseApi + endpoint;
    let fetchOptions = {
      method,
      headers: {
        'X-API-Key': apiKey || '',
      },
    };

    if (form) {
      const formData = new FormData(form);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });

      const queryField = form.dataset.queryField;
      if (queryField && data[queryField]) {
        const qs = parseQueryString(data[queryField]);
        url += (url.includes('?') ? '&' : '?') + qs.toString();
        delete data[queryField];
      }

      if (method === 'GET') {
        const qs = new URLSearchParams();
        Object.entries(data).forEach(([k, v]) => {
          if (v !== '') qs.append(k, v);
        });
        const queryString = qs.toString();
        if (queryString) {
          url += (url.includes('?') ? '&' : '?') + queryString;
        }
      } else if (form.dataset.rawBody === 'true') {
        fetchOptions.body = data.raw || '';
        fetchOptions.headers['Content-Type'] = 'application/json';
      } else {
        fetchOptions.body = JSON.stringify(data);
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }

    const started = performance.now();
    resultEl.textContent = 'Loading...';

    try {
      const res = await fetch(url, fetchOptions);
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (_) {
        parsed = { raw: text };
      }
      const duration = (performance.now() - started).toFixed(1);
      const display = {
        status: res.status,
        duration_ms_client: Number(duration),
        data: parsed,
      };
      resultEl.textContent = formatJSON(display);
    } catch (err) {
      resultEl.textContent = 'Error: ' + err;
    }
  }

  document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-action="call"]');
    if (target) {
      e.preventDefault();
      callApi(target);
    }
  });

  document.querySelectorAll('form.api-form').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      callApi(form);
    });
  });
})();
