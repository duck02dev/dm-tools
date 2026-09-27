(async () => {
  'use strict';

  const APP_VERSION = 'v0.9';
  const APP_TITLE = `Search RC Vehicle ${APP_VERSION}`;
  const DEFAULT_TO_CENTER_CODE = 'DON1CFC';
  const DEFAULT_RANGE_DAYS = 3;
  const STATUS_LOAD = 'LOAD';
  const SEARCH_DATE_TYPE = 'UPLOAD_COMPLETED_DATE';
  const PAGE_SIZE = 20;
  const PAGE_CONCURRENCY = 3;
  const MAX_PAGE = 400;
  const REQUEST_GAP_MS = 180;
  const PANEL_ID = 'grab-load-vehicle-panel';
  const STYLE_ID = 'grab-load-vehicle-style';
  const RUN_KEY = '__grabLoadVehicleRunId';
  const ABORT_KEY = '__grabLoadVehicleAbortController';
  const SNAPSHOT_KEY_PREFIX = 'grab-load-vehicle:previous:v1';

  const QUICK_RANGES = [
    { value: '1', label: '오늘', days: 1 },
    { value: '2', label: '2일', days: 2 },
    { value: '3', label: '3일', days: 3 },
    { value: '4', label: '4일', days: 4 },
    { value: '5', label: '5일', days: 5 }
  ];

  const TO_CENTER_OPTIONS = ['DON1CFC', 'DON1'];

  const RESULT_FONT_LEVELS = [
    {
      label: '작게',
      groupFontSize: 13,
      vehicleFontSize: 13,
      countFontSize: 12,
      vehicleMinWidth: 44,
      groupPadding: '8px',
      groupGap: '8px',
      vehicleGap: '5px',
      vehiclePadding: '2px 0'
    },
    {
      label: '기본',
      groupFontSize: 14,
      vehicleFontSize: 15,
      countFontSize: 13,
      vehicleMinWidth: 50,
      groupPadding: '10px',
      groupGap: '10px',
      vehicleGap: '6px',
      vehiclePadding: '2px 0'
    },
    {
      label: '크게',
      groupFontSize: 16,
      vehicleFontSize: 18,
      countFontSize: 14,
      vehicleMinWidth: 58,
      groupPadding: '12px',
      groupGap: '12px',
      vehicleGap: '8px',
      vehiclePadding: '3px 0'
    },
    {
      label: '매우 크게',
      groupFontSize: 18,
      vehicleFontSize: 22,
      countFontSize: 15,
      vehicleMinWidth: 70,
      groupPadding: '14px',
      groupGap: '14px',
      vehicleGap: '10px',
      vehiclePadding: '4px 0'
    }
  ];

  const DEFAULT_RESULT_FONT_LEVEL = 1;

  const clean = (text) =>
    (text || '')
      .replace(/\s+/g, ' ')
      .trim();

  const createAbortError = () => {
    const error = new Error('조회가 중지되었습니다.');
    error.name = 'AbortError';
    return error;
  };

  const isAbortError = (error) => error?.name === 'AbortError';

  const sleep = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timerId = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timerId);
      reject(createAbortError());
    }, { once: true });
  });

  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const getDateRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - Math.max(days - 1, 0));

    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    };
  };

  const removeExistingPanel = () => {
    window[ABORT_KEY]?.abort();
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
  };

  const injectStyle = () => {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 999999;
        width: 420px;
        max-height: calc(100vh - 48px);
        box-sizing: border-box;
        padding: 16px;
        overflow: auto;
        background: #111827;
        color: #f9fafb;
        border: 1px solid #374151;
        border-radius: 10px;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.38);
        font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", Arial, sans-serif;
        font-size: 13px;
        line-height: 1.45;
        letter-spacing: 0;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }
      #${PANEL_ID} * {
        box-sizing: border-box;
      }
      #${PANEL_ID} .glv-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      #${PANEL_ID} .glv-title {
        font-weight: 800;
        font-size: 16px;
        line-height: 1.25;
      }
      #${PANEL_ID} .glv-close {
        width: 28px;
        height: 28px;
        border: 1px solid #4b5563;
        border-radius: 6px;
        background: #1f2937;
        color: #f9fafb;
        font-size: 16px;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
      }
      #${PANEL_ID} .glv-row {
        display: grid;
        grid-template-columns: 1fr 110px;
        gap: 8px;
        margin-bottom: 10px;
      }
      #${PANEL_ID} label {
        display: block;
        margin-bottom: 5px;
        color: #d1d5db;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.25;
      }
      #${PANEL_ID} input,
      #${PANEL_ID} select {
        width: 100%;
        height: 36px;
        border: 1px solid #4b5563;
        border-radius: 7px;
        padding: 0 10px;
        background: #030712;
        color: #f9fafb;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
      }
      #${PANEL_ID} .glv-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 12px 0;
      }
      #${PANEL_ID} button {
        height: 34px;
        border: 0;
        border-radius: 7px;
        padding: 0 12px;
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
        letter-spacing: 0;
        cursor: pointer;
      }
      #${PANEL_ID} button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      #${PANEL_ID} .glv-primary {
        background: #2563eb;
        color: #ffffff;
      }
      #${PANEL_ID} .glv-secondary {
        background: #374151;
        color: #f9fafb;
      }
      #${PANEL_ID} .glv-status {
        min-height: 28px;
        margin: 8px 0;
        padding: 8px 10px;
        border-radius: 7px;
        background: #1f2937;
        color: #e5e7eb;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.4;
      }
      #${PANEL_ID} .glv-summary {
        margin: 10px 0;
        color: #d1d5db;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.35;
      }
      #${PANEL_ID} .glv-group {
        margin-top: var(--glv-group-gap, 10px);
        padding: var(--glv-group-padding, 10px);
        border: 1px solid #374151;
        border-radius: 8px;
        background: #0b1220;
      }
      #${PANEL_ID} .glv-group-head {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-weight: 800;
        font-size: var(--glv-group-font-size, 14px);
        line-height: 1.2;
      }
      #${PANEL_ID} .glv-count {
        color: #93c5fd;
        font-size: var(--glv-count-font-size, 13px);
        font-weight: 700;
      }
      #${PANEL_ID} .glv-vehicles {
        display: flex;
        flex-wrap: wrap;
        gap: var(--glv-vehicle-gap, 6px);
      }
      #${PANEL_ID} .glv-vehicle {
        display: inline-block;
        min-width: var(--glv-vehicle-min-width, 50px);
        padding: var(--glv-vehicle-padding, 5px 8px);
        color: #f9fafb;
        text-align: left;
        font-weight: 400;
        font-size: var(--glv-vehicle-font-size, 15px);
        line-height: 1.1;
        letter-spacing: 0;
      }
      #${PANEL_ID} .glv-vehicle-new {
        color: #fbbf24;
      }
      #${PANEL_ID} .glv-empty {
        padding: 18px 10px;
        border: 1px dashed #4b5563;
        border-radius: 8px;
        color: #9ca3af;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.4;
        text-align: center;
      }
    `;

    document.head.appendChild(style);
  };

  const createPanel = () => {
    removeExistingPanel();
    injectStyle();

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="glv-head">
        <div class="glv-title">${escapeHtml(APP_TITLE)}</div>
        <button type="button" class="glv-close" title="닫기">×</button>
      </div>
      <div class="glv-row">
        <div>
          <label for="glv-to-center">받는센터</label>
          <input id="glv-to-center" list="glv-to-center-list" value="${DEFAULT_TO_CENTER_CODE}" autocomplete="off" />
          <datalist id="glv-to-center-list">
            ${TO_CENTER_OPTIONS.map(code => `<option value="${escapeHtml(code)}"></option>`).join('')}
          </datalist>
        </div>
        <div>
          <label for="glv-range">기간</label>
          <select id="glv-range">
            ${QUICK_RANGES.map(option => `
              <option value="${option.value}" ${option.days === DEFAULT_RANGE_DAYS ? 'selected' : ''}>
                ${escapeHtml(option.label)}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="glv-actions">
        <button type="button" class="glv-primary" id="glv-search">조회</button>
        <button type="button" class="glv-secondary" id="glv-stop" disabled>중지</button>
        <button type="button" class="glv-secondary" id="glv-size-down" title="결과 글자 작게">A-</button>
        <button type="button" class="glv-secondary" id="glv-size-up" title="결과 글자 크게">A+</button>
        <button type="button" class="glv-secondary" id="glv-copy-group" disabled>그룹 복사</button>
        <button type="button" class="glv-secondary" id="glv-copy-excel" disabled>엑셀용 복사</button>
      </div>
      <div class="glv-status" id="glv-status">받는센터 선택 후 조회하세요.</div>
      <div class="glv-summary" id="glv-summary"></div>
      <div id="glv-result"></div>
    `;

    document.body.appendChild(panel);

    return {
      panel,
      toCenterInput: panel.querySelector('#glv-to-center'),
      rangeSelect: panel.querySelector('#glv-range'),
      searchButton: panel.querySelector('#glv-search'),
      stopButton: panel.querySelector('#glv-stop'),
      sizeDownButton: panel.querySelector('#glv-size-down'),
      sizeUpButton: panel.querySelector('#glv-size-up'),
      copyGroupButton: panel.querySelector('#glv-copy-group'),
      copyExcelButton: panel.querySelector('#glv-copy-excel'),
      status: panel.querySelector('#glv-status'),
      summary: panel.querySelector('#glv-summary'),
      result: panel.querySelector('#glv-result'),
      closeButton: panel.querySelector('.glv-close')
    };
  };

  let resultFontLevelIndex = DEFAULT_RESULT_FONT_LEVEL;

  const applyResultFontLevel = (ui, levelIndex) => {
    const nextIndex = Math.max(0, Math.min(levelIndex, RESULT_FONT_LEVELS.length - 1));
    const level = RESULT_FONT_LEVELS[nextIndex];

    resultFontLevelIndex = nextIndex;

    ui.panel.style.setProperty('--glv-group-font-size', `${level.groupFontSize}px`);
    ui.panel.style.setProperty('--glv-vehicle-font-size', `${level.vehicleFontSize}px`);
    ui.panel.style.setProperty('--glv-count-font-size', `${level.countFontSize}px`);
    ui.panel.style.setProperty('--glv-vehicle-min-width', `${level.vehicleMinWidth}px`);
    ui.panel.style.setProperty('--glv-group-padding', level.groupPadding);
    ui.panel.style.setProperty('--glv-group-gap', level.groupGap);
    ui.panel.style.setProperty('--glv-vehicle-gap', level.vehicleGap);
    ui.panel.style.setProperty('--glv-vehicle-padding', level.vehiclePadding);
    ui.sizeDownButton.disabled = nextIndex === 0;
    ui.sizeUpButton.disabled = nextIndex === RESULT_FONT_LEVELS.length - 1;
    ui.panel.dataset.resultFontSize = level.label;
  };

  const fitResultFontToPanel = (ui) => {
    requestAnimationFrame(() => {
      while (resultFontLevelIndex > 0 && ui.panel.scrollHeight > ui.panel.clientHeight + 2) {
        applyResultFontLevel(ui, resultFontLevelIndex - 1);
      }
    });
  };

  const setStatus = (ui, message) => {
    ui.status.textContent = message;
  };

  const setBusy = (ui, isBusy) => {
    ui.searchButton.disabled = isBusy;
    ui.stopButton.disabled = !isBusy;
    ui.searchButton.textContent = isBusy ? '조회 중...' : '조회';
  };

  const buildListUrl = ({ pageNo, toCenterCode, startDate, endDate }) => {
    const url = new URL('/transfer/admin/operation/paging', location.origin);

    url.searchParams.set('page', String(pageNo));
    url.searchParams.set('pageSize', String(PAGE_SIZE));
    url.searchParams.set('skuBarcode', '');
    url.searchParams.set('skuExternalId', '');
    url.searchParams.set('skuId', '');
    url.searchParams.set('vehicleNumber', '');
    url.searchParams.set('status', STATUS_LOAD);
    url.searchParams.set('containerBarcode', '');
    url.searchParams.set('transferCartPriority', '');
    url.searchParams.set('toCenterCode', toCenterCode);
    url.searchParams.set('centerCode', '');
    url.searchParams.set('transferAllocationType', '');
    url.searchParams.set('transferPlanExternalId', '');
    url.searchParams.set('cartBarcode', '');
    url.searchParams.set('searchDateType', SEARCH_DATE_TYPE);
    url.searchParams.set('end', endDate);
    url.searchParams.set('start', startDate);

    return url.href;
  };

  const fetchHtml = async (url, signal) => {
    await sleep(REQUEST_GAP_MS, signal);

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal,
      headers: {
        Accept: 'text/html, */*'
      }
    });

    const html = await response.text();

    if (!response.ok) {
      throw new Error(`WMS 조회에 실패했습니다. 잠시 후 다시 시도하세요. (${response.status})`);
    }

    if (html.includes('<input') && html.includes('password')) {
      throw new Error('WMS 로그인이 필요합니다. 새로고침 또는 재로그인 후 다시 실행하세요.');
    }

    return html;
  };

  const parseListRows = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tables = [...doc.querySelectorAll('table')];

    let targetTable = null;
    let fromCenterIndex = -1;
    let vehicleNumberIndex = -1;
    let loadedAtIndex = -1;

    tables.some(tbl => {
      const headers = [...tbl.querySelectorAll('thead th')].map(th => clean(th.innerText || th.textContent));
      const fromIndex = headers.findIndex(header => header.includes('보내는') && header.includes('센터'));
      const vehicleIndex = headers.findIndex(header => header.replace(/\s/g, '').includes('차량번호'));
      const loadedIndex = headers.findIndex(header => header.replace(/\s/g, '').includes('상차완료시간'));

      if (fromIndex < 0 || vehicleIndex < 0) return false;

      targetTable = tbl;
      fromCenterIndex = fromIndex;
      vehicleNumberIndex = vehicleIndex;
      loadedAtIndex = loadedIndex;
      return true;
    });

    if (!targetTable) return [];

    return [...targetTable.querySelectorAll('tbody tr')]
      .map(tr => {
        const cells = [...tr.querySelectorAll('td')];

        if (cells.length === 1 && cells[0].hasAttribute('colspan')) return null;

        const loadedAtText = loadedAtIndex >= 0
          ? clean(cells[loadedAtIndex]?.innerText || cells[loadedAtIndex]?.textContent)
          : '';

        return {
          fromCenter: clean(cells[fromCenterIndex]?.innerText || cells[fromCenterIndex]?.textContent),
          vehicleNumber: extractVehicleNumber(cells[vehicleNumberIndex]?.innerText || cells[vehicleNumberIndex]?.textContent),
          loadedAtTime: parseDateTimeValue(loadedAtText),
          rowSignature: clean(tr.innerText || tr.textContent)
        };
      })
      .filter(Boolean);
  };

  const extractVehicleNumber = (text) => {
    const value = clean(text);
    const match = value.match(/\d{4}/);
    return match ? match[0] : '';
  };

  const parseDateTimeValue = (text) => {
    const match = clean(text).match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);

    if (!match) return Number.MAX_SAFE_INTEGER;

    const [, yyyy, mm, dd, hh, mi, ss = '0'] = match;

    return new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(mi),
      Number(ss)
    ).getTime();
  };

  const normalizeCenterCode = (centerCode) => clean(centerCode).replace(/\s+/g, '').toUpperCase();

  const shouldExcludeFromCenter = (fromCenter) => normalizeCenterCode(fromCenter) === 'DON1';

  const makeRowKey = (row) => row.rowSignature || `${row.fromCenter}|${row.vehicleNumber}`;

  const fetchPageRows = async ({ pageNo, toCenterCode, startDate, endDate, signal }) => {
    const url = buildListUrl({ pageNo, toCenterCode, startDate, endDate });
    console.log(`[${APP_TITLE}] page=${pageNo}`, url);

    const html = await fetchHtml(url, signal);

    return {
      pageNo,
      rows: parseListRows(html)
    };
  };

  const collectRows = async ({ ui, runId, toCenterCode, startDate, endDate, signal, onProgress }) => {
    const rows = [];
    const seenPages = new Set();

    for (let pageNo = 0; pageNo < MAX_PAGE; pageNo += PAGE_CONCURRENCY) {
      if (signal.aborted || window[RUN_KEY] !== runId) {
        throw createAbortError();
      }

      const batchPages = Array.from(
        { length: Math.min(PAGE_CONCURRENCY, MAX_PAGE - pageNo) },
        (_, index) => pageNo + index
      );

      setStatus(ui, `목록 조회 중 · page ${batchPages[0] + 1}~${batchPages[batchPages.length - 1] + 1}`);

      const batchResults = await Promise.all(
        batchPages.map(currentPageNo =>
          fetchPageRows({ pageNo: currentPageNo, toCenterCode, startDate, endDate, signal })
        )
      );

      for (const result of batchResults.sort((a, b) => a.pageNo - b.pageNo)) {
        if (signal.aborted || window[RUN_KEY] !== runId) {
          throw createAbortError();
        }

        const pageRows = result.rows;

        if (!pageRows.length) return rows;

        const signature = pageRows.map(makeRowKey).join('|');

        if (seenPages.has(signature)) return rows;
        seenPages.add(signature);

        rows.push(...pageRows);
        onProgress?.(rows);

        if (pageRows.length < PAGE_SIZE) return rows;
      }
    }

    return rows;
  };

  const groupRows = (rows) => {
    const groups = new Map();

    rows.forEach(row => {
      const fromCenter = row.fromCenter;
      const vehicleNumber = row.vehicleNumber;

      if (!fromCenter || !vehicleNumber) return;
      if (shouldExcludeFromCenter(fromCenter)) return;

      if (!groups.has(fromCenter)) {
        groups.set(fromCenter, new Map());
      }

      const vehicleMap = groups.get(fromCenter);
      const loadedAtTime = row.loadedAtTime ?? Number.MAX_SAFE_INTEGER;
      const currentVehicle = vehicleMap.get(vehicleNumber);

      if (!currentVehicle || loadedAtTime < currentVehicle.loadedAtTime) {
        vehicleMap.set(vehicleNumber, {
          vehicleNumber,
          loadedAtTime
        });
      }
    });

    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fromCenter, vehicleMap]) => ({
        fromCenter,
        vehicles: [...vehicleMap.values()]
          .sort((a, b) =>
            a.loadedAtTime - b.loadedAtTime ||
            a.vehicleNumber.localeCompare(b.vehicleNumber)
          )
          .map(vehicle => vehicle.vehicleNumber)
      }));
  };

  const makeVehicleKey = (fromCenter, vehicleNumber) =>
    `${normalizeCenterCode(fromCenter)}|${clean(vehicleNumber)}`;

  const getSnapshotKey = (toCenterCode, rangeDays) =>
    `${SNAPSHOT_KEY_PREFIX}:${STATUS_LOAD}:${normalizeCenterCode(toCenterCode)}:${rangeDays}`;

  const loadVehicleSnapshot = (toCenterCode, rangeDays) => {
    try {
      const saved = localStorage.getItem(getSnapshotKey(toCenterCode, rangeDays));
      if (!saved) return null;

      const snapshot = JSON.parse(saved);

      if (Array.isArray(snapshot)) {
        return {
          vehicleKeys: new Set(snapshot),
          groups: null,
          sourceRowsLength: 0,
          savedAt: ''
        };
      }

      if (!snapshot || !Array.isArray(snapshot.vehicleKeys)) return null;

      return {
        vehicleKeys: new Set(snapshot.vehicleKeys),
        groups: Array.isArray(snapshot.groups) ? snapshot.groups : null,
        sourceRowsLength: Number(snapshot.sourceRowsLength) || 0,
        savedAt: snapshot.savedAt || ''
      };
    } catch (error) {
      console.warn(`[${APP_TITLE}] 이전 조회 결과를 불러오지 못했습니다.`, error);
      return null;
    }
  };

  const saveVehicleSnapshot = (toCenterCode, rangeDays, groups, sourceRowsLength) => {
    const vehicleKeys = groups.flatMap(group =>
      group.vehicles.map(vehicle => makeVehicleKey(group.fromCenter, vehicle))
    );

    try {
      localStorage.setItem(
        getSnapshotKey(toCenterCode, rangeDays),
        JSON.stringify({
          vehicleKeys,
          groups,
          sourceRowsLength,
          savedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      console.warn(`[${APP_TITLE}] 현재 조회 결과를 저장하지 못했습니다.`, error);
    }
  };

  const getNewVehicleKeys = (groups, previousVehicleKeys) => {
    if (previousVehicleKeys === null) return new Set();

    return new Set(
      groups.flatMap(group =>
        group.vehicles
          .map(vehicle => makeVehicleKey(group.fromCenter, vehicle))
          .filter(vehicleKey => !previousVehicleKeys.has(vehicleKey))
      )
    );
  };

  const formatSnapshotTime = (savedAt) => {
    const savedDate = new Date(savedAt);
    if (Number.isNaN(savedDate.getTime())) return '';

    const now = new Date();
    const hh = String(savedDate.getHours()).padStart(2, '0');
    const mm = String(savedDate.getMinutes()).padStart(2, '0');
    const isToday =
      savedDate.getFullYear() === now.getFullYear() &&
      savedDate.getMonth() === now.getMonth() &&
      savedDate.getDate() === now.getDate();

    if (isToday) return `${hh}:${mm}`;

    return `${savedDate.getMonth() + 1}/${savedDate.getDate()} ${hh}:${mm}`;
  };

  const renderGroups = (ui, groups, sourceRowsLength, newVehicleKeys = new Set()) => {
    const vehicleCount = groups.reduce((sum, group) => sum + group.vehicles.length, 0);
    const newVehicleCount = newVehicleKeys.size;

    ui.copyGroupButton.disabled = !groups.length;
    ui.copyExcelButton.disabled = !groups.length;

    ui.summary.textContent = groups.length
      ? `보내는센터 ${groups.length}개 / 차량 ${vehicleCount}대 / 신규 ${newVehicleCount}대 / 목록 ${sourceRowsLength}건`
      : '';

    if (!groups.length) {
      ui.result.innerHTML = '<div class="glv-empty">이동중 차량 정보가 없습니다.</div>';
      return;
    }

    ui.result.innerHTML = groups.map(group => {
      const groupNewVehicleCount = group.vehicles.filter(vehicle =>
        newVehicleKeys.has(makeVehicleKey(group.fromCenter, vehicle))
      ).length;

      return `
        <div class="glv-group">
          <div class="glv-group-head">
            <span>${escapeHtml(group.fromCenter)}</span>
            <span class="glv-count">
              ${group.vehicles.length}대${groupNewVehicleCount ? ` · 신규 ${groupNewVehicleCount}대` : ''}
            </span>
          </div>
          <div class="glv-vehicles">
            ${group.vehicles.map(vehicle => {
              const isNew = newVehicleKeys.has(makeVehicleKey(group.fromCenter, vehicle));
              return `<span class="glv-vehicle${isNew ? ' glv-vehicle-new' : ''}">${escapeHtml(vehicle)}</span>`;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    fitResultFontToPanel(ui);
  };

  const buildGroupText = (groups) =>
    groups
      .map(group => `${group.fromCenter}\n${group.vehicles.join(' ')}`)
      .join('\n\n');

  const buildExcelText = (groups) => [
    '보내는센터\t차량번호',
    ...groups.flatMap(group => group.vehicles.map(vehicle => `${group.fromCenter}\t${vehicle}`))
  ].join('\n');

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  const getFriendlyErrorMessage = (error) => {
    if (isAbortError(error)) {
      return '조회가 중지되었습니다.';
    }

    const message = error?.message || String(error);

    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return 'WMS 또는 네트워크 연결을 확인하세요.';
    }

    return message;
  };

  const ui = createPanel();
  let latestGroups = [];
  let latestNewVehicleKeys = new Set();
  let latestSourceRowsLength = 0;
  let hasDisplayedResult = false;

  const showCachedResult = () => {
    const toCenterCode = clean(ui.toCenterInput.value).toUpperCase();
    const rangeDays = Number(ui.rangeSelect.value || DEFAULT_RANGE_DAYS);
    const snapshot = toCenterCode ? loadVehicleSnapshot(toCenterCode, rangeDays) : null;

    latestGroups = [];
    latestNewVehicleKeys = new Set();
    latestSourceRowsLength = 0;
    hasDisplayedResult = false;

    if (!snapshot || snapshot.groups === null) {
      ui.summary.textContent = '';
      ui.result.innerHTML = '';
      ui.copyGroupButton.disabled = true;
      ui.copyExcelButton.disabled = true;
      setStatus(ui, '이전 결과가 없습니다.');
      return;
    }

    latestGroups = snapshot.groups;
    latestSourceRowsLength = snapshot.sourceRowsLength;
    hasDisplayedResult = true;

    window.grabLoadVehicleVersion = APP_VERSION;
    window.grabLoadVehicleGroups = latestGroups;
    window.grabLoadVehicleNewKeys = [];

    renderGroups(ui, latestGroups, latestSourceRowsLength, latestNewVehicleKeys);

    const savedTime = formatSnapshotTime(snapshot.savedAt);
    setStatus(ui, savedTime ? `이전 결과 · ${savedTime}` : '이전 결과');
  };

  applyResultFontLevel(ui, resultFontLevelIndex);

  ui.closeButton.addEventListener('click', removeExistingPanel);

  ui.stopButton.addEventListener('click', () => {
    window[RUN_KEY] = '';
    window[ABORT_KEY]?.abort();
    setStatus(ui, '조회가 중지되었습니다.');
    setBusy(ui, false);
  });

  ui.sizeDownButton.addEventListener('click', () => {
    applyResultFontLevel(ui, resultFontLevelIndex - 1);
  });

  ui.sizeUpButton.addEventListener('click', () => {
    applyResultFontLevel(ui, resultFontLevelIndex + 1);
    fitResultFontToPanel(ui);
  });

  ui.copyGroupButton.addEventListener('click', async () => {
    await copyText(buildGroupText(latestGroups));
    setStatus(ui, '그룹 형식으로 복사했습니다.');
  });

  ui.copyExcelButton.addEventListener('click', async () => {
    await copyText(buildExcelText(latestGroups));
    setStatus(ui, '엑셀용 형식으로 복사했습니다.');
  });

  ui.toCenterInput.addEventListener('change', showCachedResult);
  ui.rangeSelect.addEventListener('change', showCachedResult);

  ui.searchButton.addEventListener('click', async () => {
    const toCenterCode = clean(ui.toCenterInput.value).toUpperCase();
    const rangeDays = Number(ui.rangeSelect.value || DEFAULT_RANGE_DAYS);

    if (!toCenterCode) {
      setStatus(ui, '받는센터를 입력하세요.');
      ui.toCenterInput.focus();
      return;
    }

    const runId = `${Date.now()}-${Math.random()}`;
    const abortController = new AbortController();

    window[ABORT_KEY]?.abort();
    window[RUN_KEY] = runId;
    window[ABORT_KEY] = abortController;

    const previousDisplay = {
      groups: latestGroups,
      newVehicleKeys: latestNewVehicleKeys,
      sourceRowsLength: latestSourceRowsLength,
      hasResult: hasDisplayedResult
    };

    latestNewVehicleKeys = new Set();

    if (hasDisplayedResult) {
      renderGroups(ui, latestGroups, latestSourceRowsLength, latestNewVehicleKeys);
    } else {
      latestGroups = [];
      latestSourceRowsLength = 0;
      ui.summary.textContent = '';
      ui.result.innerHTML = '';
      ui.copyGroupButton.disabled = true;
      ui.copyExcelButton.disabled = true;
    }

    setBusy(ui, true);

    try {
      const { startDate, endDate } = getDateRange(rangeDays);
      const previousSnapshot = loadVehicleSnapshot(toCenterCode, rangeDays);
      const previousVehicleKeys = previousSnapshot?.vehicleKeys ?? null;

      setStatus(ui, `이동중 목록 조회 중 · ${toCenterCode} · ${startDate} ~ ${endDate}`);

      const rows = await collectRows({
        ui,
        runId,
        toCenterCode,
        startDate,
        endDate,
        signal: abortController.signal,
        onProgress: (currentRows) => {
          latestGroups = groupRows(currentRows);
          latestNewVehicleKeys = getNewVehicleKeys(latestGroups, previousVehicleKeys);
          latestSourceRowsLength = currentRows.length;
          renderGroups(ui, latestGroups, latestSourceRowsLength, latestNewVehicleKeys);
        }
      });
      latestGroups = groupRows(rows);
      latestNewVehicleKeys = getNewVehicleKeys(latestGroups, previousVehicleKeys);
      latestSourceRowsLength = rows.length;
      hasDisplayedResult = true;

      window.grabLoadVehicleVersion = APP_VERSION;
      window.grabLoadVehicleRows = rows;
      window.grabLoadVehicleGroups = latestGroups;
      window.grabLoadVehicleNewKeys = [...latestNewVehicleKeys];

      renderGroups(ui, latestGroups, latestSourceRowsLength, latestNewVehicleKeys);
      saveVehicleSnapshot(toCenterCode, rangeDays, latestGroups, latestSourceRowsLength);
      setStatus(ui, latestGroups.length ? '조회 완료' : '조회 완료 · 표시할 차량 정보가 없습니다.');
    } catch (error) {
      if (!isAbortError(error)) {
        console.error(`[${APP_TITLE}]`, error);
      }

      latestGroups = previousDisplay.groups;
      latestNewVehicleKeys = previousDisplay.newVehicleKeys;
      latestSourceRowsLength = previousDisplay.sourceRowsLength;
      hasDisplayedResult = previousDisplay.hasResult;

      if (hasDisplayedResult) {
        renderGroups(ui, latestGroups, latestSourceRowsLength, latestNewVehicleKeys);
      } else {
        ui.summary.textContent = '';
        ui.result.innerHTML = '';
        ui.copyGroupButton.disabled = true;
        ui.copyExcelButton.disabled = true;
      }

      setStatus(ui, getFriendlyErrorMessage(error));
    } finally {
      if (window[RUN_KEY] === runId) {
        window[ABORT_KEY] = null;
        setBusy(ui, false);
      }
    }
  });

  showCachedResult();
})();
