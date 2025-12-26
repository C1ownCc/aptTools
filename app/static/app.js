(function() {
  const translations = {
    en: {
      title: 'Toolbox',
      nav: {
        home: 'Home',
        ip: 'IP',
        time: 'Time',
        uuid: 'UUID',
        json: 'JSON',
        hash: 'Hash',
        jwt: 'JWT',
        echo: 'Echo',
      },
      common: {
        loading: 'Loading...',
        api_key: 'API Key',
        version: 'Version',
        result: {
          summary: 'Summary',
          status: 'Status',
          client: 'Client (ms)',
          server: 'Server (ms)',
          request_id: 'Request ID',
          title_visual: 'Visual',
          title_raw: 'Raw JSON',
          no_structure: 'Response has no structured data',
        },
      },
      home: {
        heading: 'API Toolbox',
        description: 'FastAPI utilities with simple UI. Use the menu to access tools.',
        health: {
          title: 'Health',
          button: 'Check Health',
        },
      },
      pages: {
        ip: { title: 'IP Lookup', button: 'Get IP' },
        time: { title: 'Time', button: 'Get Time' },
        uuid: { title: 'UUID Generator', count: 'Count (1-20)', button: 'Generate' },
        json: { title: 'JSON Formatter', label: 'JSON Input', placeholder: '{"hello": "world"}', button: 'Format' },
        hash: {
          title: 'Hash',
          text: 'Text',
          placeholder: 'hello',
          algo: 'Algorithm',
          md5: 'md5',
          sha256: 'sha256',
          button: 'Hash It',
        },
        jwt: { title: 'JWT Decode', label: 'JWT Token', placeholder: 'eyJ...', button: 'Decode' },
        echo: {
          title: 'Echo',
          query: 'Query Params (key=value&foo=bar)',
          body: 'Body (text)',
          placeholder_query: 'foo=bar',
          placeholder_body: 'any text',
          button: 'Send',
        },
      },
    },
    zh: {
      title: '工具箱',
      nav: {
        home: '主页',
        ip: 'IP',
        time: '时间',
        uuid: 'UUID',
        json: 'JSON',
        hash: '哈希',
        jwt: 'JWT',
        echo: '回显',
      },
      common: {
        loading: '加载中...',
        api_key: 'API 密钥',
        version: '版本',
        result: {
          summary: '概览',
          status: '状态码',
          client: '客户端耗时 (毫秒)',
          server: '服务端耗时 (毫秒)',
          request_id: '请求 ID',
          title_visual: '可视化',
          title_raw: '原始 JSON',
          no_structure: '响应无可视化结构',
        },
      },
      home: {
        heading: 'API 工具箱',
        description: '基于 FastAPI 的小工具集合。使用左侧菜单访问不同工具。',
        health: {
          title: '健康检查',
          button: '检查服务',
        },
      },
      pages: {
        ip: { title: 'IP 查询', button: '获取 IP' },
        time: { title: '时间', button: '获取时间' },
        uuid: { title: 'UUID 生成器', count: '数量 (1-20)', button: '生成' },
        json: { title: 'JSON 格式化', label: 'JSON 输入', placeholder: '{"hello": "world"}', button: '格式化' },
        hash: {
          title: '哈希',
          text: '文本',
          placeholder: 'hello',
          algo: '算法',
          md5: 'md5',
          sha256: 'sha256',
          button: '生成哈希',
        },
        jwt: { title: 'JWT 解码', label: 'JWT Token', placeholder: 'eyJ...', button: '解码' },
        echo: {
          title: '回显',
          query: '查询参数 (key=value&foo=bar)',
          body: '请求体 (文本)',
          placeholder_query: 'foo=bar',
          placeholder_body: '任意文本',
          button: '发送',
        },
      },
    },
  };

  const apiKey = (window.APP_CONFIG && window.APP_CONFIG.apiKey) || '';
  const baseApi = (window.APP_CONFIG && window.APP_CONFIG.baseApi) || '';
  const DEFAULT_LANG = 'en';
  let currentLang = DEFAULT_LANG;

  function resolveTranslation(path, lang) {
    const parts = path.split('.');
    let value = translations[lang] || translations[DEFAULT_LANG];
    for (const part of parts) {
      value = value ? value[part] : undefined;
    }
    return typeof value === 'string' ? value : null;
  }

  function applyTranslations(lang) {
    const activeLang = translations[lang] ? lang : DEFAULT_LANG;
    currentLang = activeLang;
    localStorage.setItem('toolbox_lang', activeLang);
    document.documentElement.setAttribute('lang', activeLang);
    document.documentElement.dataset.lang = activeLang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const text = resolveTranslation(el.dataset.i18n, activeLang);
      if (text) el.textContent = text;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const text = resolveTranslation(el.dataset.i18nPlaceholder, activeLang);
      if (text) el.setAttribute('placeholder', text);
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === activeLang);
    });
  }

  function detectInitialLang() {
    const saved = localStorage.getItem('toolbox_lang');
    if (saved && translations[saved]) return saved;
    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('zh')) return 'zh';
    return DEFAULT_LANG;
  }

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

  function createStructuredList(data) {
    if (data === null) return null;

    const container = document.createElement('div');
    container.className = 'kv-list';
    const entries = Array.isArray(data) ? data.map((value, index) => [`[${index}]`, value]) : Object.entries(data);

    entries.forEach(([key, value]) => {
      const row = document.createElement('div');
      row.className = 'kv-row';

      const keyEl = document.createElement('div');
      keyEl.className = 'kv-key';
      keyEl.textContent = key;

      const valueEl = document.createElement('div');
      valueEl.className = 'kv-value';

      if (value !== null && typeof value === 'object') {
        const nested = createStructuredList(value);
        if (nested) valueEl.appendChild(nested);
      } else {
        valueEl.textContent = String(value);
        valueEl.classList.add('kv-leaf');
      }

      row.appendChild(keyEl);
      row.appendChild(valueEl);
      container.appendChild(row);
    });

    return container;
  }

  function buildResultLayout(resultEl, responseData, statusCode, durationMsClient) {
    const translate = (path) => resolveTranslation(path, currentLang) || path;
    resultEl.innerHTML = '';

    const summary = document.createElement('div');
    summary.className = 'result-summary';

    const statusChip = document.createElement('span');
    statusChip.className = `result-chip status-${statusCode >= 200 && statusCode < 300 ? 'ok' : 'error'}`;
    statusChip.textContent = `${translate('common.result.status')}: ${statusCode}`;
    summary.appendChild(statusChip);

    const clientChip = document.createElement('span');
    clientChip.className = 'result-chip';
    clientChip.textContent = `${translate('common.result.client')}: ${durationMsClient}`;
    summary.appendChild(clientChip);

    const serverDuration = typeof responseData?.duration_ms === 'number' ? responseData.duration_ms : null;
    if (serverDuration !== null) {
      const serverChip = document.createElement('span');
      serverChip.className = 'result-chip';
      serverChip.textContent = `${translate('common.result.server')}: ${serverDuration}`;
      summary.appendChild(serverChip);
    }

    const requestId = responseData?.request_id;
    if (requestId) {
      const idChip = document.createElement('span');
      idChip.className = 'result-chip';
      idChip.textContent = `${translate('common.result.request_id')}: ${requestId}`;
      summary.appendChild(idChip);
    }

    const visualSection = document.createElement('div');
    visualSection.className = 'result-section';

    const visualTitle = document.createElement('div');
    visualTitle.className = 'result-title';
    visualTitle.textContent = translate('common.result.title_visual');

    const visualContent = document.createElement('div');
    visualContent.className = 'result-body';

    if (responseData && typeof responseData === 'object') {
      const structured = createStructuredList(responseData);
      if (structured) {
        visualContent.appendChild(structured);
      } else {
        const empty = document.createElement('div');
        empty.className = 'result-empty';
        empty.textContent = translate('common.result.no_structure');
        visualContent.appendChild(empty);
      }
    } else {
      const empty = document.createElement('div');
      empty.className = 'result-empty';
      empty.textContent = translate('common.result.no_structure');
      visualContent.appendChild(empty);
    }

    const rawSection = document.createElement('div');
    rawSection.className = 'result-section';

    const rawTitle = document.createElement('div');
    rawTitle.className = 'result-title';
    rawTitle.textContent = translate('common.result.title_raw');

    const pre = document.createElement('pre');
    pre.textContent = formatJSON({ status: statusCode, duration_ms_client: durationMsClient, data: responseData });

    rawSection.appendChild(rawTitle);
    rawSection.appendChild(pre);

    visualSection.appendChild(visualTitle);
    visualSection.appendChild(visualContent);

    resultEl.appendChild(summary);
    resultEl.appendChild(visualSection);
    resultEl.appendChild(rawSection);
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
    resultEl.textContent = resolveTranslation('common.loading', currentLang) || 'Loading...';

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
      const durationMsClient = Number(duration);
      buildResultLayout(resultEl, parsed, res.status, durationMsClient);
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

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTranslations(btn.dataset.lang);
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    applyTranslations(detectInitialLang());
  });
})();
