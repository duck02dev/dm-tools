(async () => {
  'use strict';

  const APP_VERSION = 'v1.0';
  const APP_TITLE = `SEARCH RC Vehicle · DUCK02 ${APP_VERSION}`;
  const DEFAULT_TO_CENTER_CODE = 'DON1CFC';
  const FIXED_TARGET_CENTERS = ['DON1', 'DON1CFC'];
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

  const QUICK_RANGES = [
    { value: '1', label: '오늘', days: 1 },
    { value: '2', label: '2일', days: 2 },
    { value: '3', label: '3일', days: 3 },
    { value: '4', label: '4일', days: 4 },
    { value: '5', label: '5일', days: 5 }
  ];

  // const TO_CENTER_OPTIONS = ['DON1CFC', 'DON1'];

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
          <label for="glv-vehicle-number">차량번호</label>
          <input id="glv-vehicle-number" placeholder="4자리 차량번호 입력" autocomplete="off" />
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
        <button type="button" class="glv-secondary" id="glv-copy-group" disabled>그룹 복사</button>
        <button type="button" class="glv-secondary" id="glv-copy-excel" disabled>엑셀용 복사</button>
      </div>
      <div class="glv-status" id="glv-status">차량번호 입력 후 조회하세요.</div>
      <div class="glv-summary" id="glv-summary"></div>
      <div id="glv-result"></div>
    `;

    document.body.appendChild(panel);

    return {
      panel,
      // toCenterInput: panel.querySelector('#glv-to-center'),
      vehicleNumberInput: panel.querySelector('#glv-vehicle-number'),
      rangeSelect: panel.querySelector('#glv-range'),
      searchButton: panel.querySelector('#glv-search'),
      stopButton: panel.querySelector('#glv-stop'),
      copyGroupButton: panel.querySelector('#glv-copy-group'),
      copyExcelButton: panel.querySelector('#glv-copy-excel'),
      status: panel.querySelector('#glv-status'),
      summary: panel.querySelector('#glv-summary'),
      result: panel.querySelector('#glv-result'),
      closeButton: panel.querySelector('.glv-close')
    };
  };

  const setStatus = (ui, message) => {
    ui.status.textContent = message;
  };

  const setBusy = (ui, isBusy) => {
    ui.searchButton.disabled = isBusy;
    ui.stopButton.disabled = !isBusy;
    ui.searchButton.textContent = isBusy ? '조회 중...' : '조회';
  };

  const buildListUrl = ({ pageNo, toCenterCode, vehicleNumber, startDate, endDate }) => {
    const url = new URL('/transfer/admin/operation/paging', location.origin);

    url.searchParams.set('page', String(pageNo));
    url.searchParams.set('pageSize', String(PAGE_SIZE));
    url.searchParams.set('skuBarcode', '');
    url.searchParams.set('skuExternalId', '');
    url.searchParams.set('skuId', '');
    url.searchParams.set('vehicleNumber', vehicleNumber);
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
    let containerBarcodeIndex = -1;
    let toteBarcodeIndex = -1;

    tables.some(tbl => {
      const headers = [...tbl.querySelectorAll('thead th')].map(th => clean(th.innerText || th.textContent));
      const fromCenterIdx = headers.findIndex(header => header.replace(/\s/g, '').includes('보내는센터'));
      const vehicleNumberIdx = headers.findIndex(header => header.replace(/\s/g, '').includes('차량번호'));
      const containerBarcodeIdx = headers.findIndex(header => header.replace(/\s/g, '').includes('컨테이너바코드'));
      const toteBarcodeIdx = headers.findIndex(header => header.replace(/\s/g, '').includes('토트바코드'));

      if (fromCenterIdx < 0 || vehicleNumberIdx < 0) return false;

      targetTable = tbl;
      fromCenterIndex = fromCenterIdx;
      vehicleNumberIndex = vehicleNumberIdx;
      containerBarcodeIndex = containerBarcodeIdx;
      toteBarcodeIndex = toteBarcodeIdx;
      return true;
    });

    if (!targetTable) return [];

    return [...targetTable.querySelectorAll('tbody tr')]
      .map(tr => {
        const cells = [...tr.querySelectorAll('td')];

        if (cells.length === 1 && cells[0].hasAttribute('colspan')) return null;

        return {
          fromCenter: clean(cells[fromCenterIndex]?.innerText || cells[fromCenterIndex]?.textContent),
          vehicleNumber: clean(cells[vehicleNumberIndex]?.innerText || cells[vehicleNumberIndex]?.textContent),
          containerBarcode: clean(cells[containerBarcodeIndex]?.innerText || cells[containerBarcodeIndex]?.textContent),
          toteBarcode: clean(cells[toteBarcodeIndex]?.innerText || cells[toteBarcodeIndex]?.textContent),
          rowSignature: clean(tr.innerText || tr.textContent)
        };
      })
      .filter(Boolean);
  };

  const makeRowKey = (row) => row.rowSignature || `${row.fromCenter}|${row.vehicleNumber}|${row.containerBarcode}|${row.toteBarcode}`;

  const fetchPageRows = async ({ pageNo, toCenterCode, vehicleNumber, startDate, endDate, signal }) => {
    const url = buildListUrl({ pageNo, toCenterCode, vehicleNumber, startDate, endDate });
    console.log(`[${APP_TITLE}] page=${pageNo}`, url);

    const html = await fetchHtml(url, signal);

    return {
      pageNo,
      rows: parseListRows(html)
    };
  };

  const collectRows = async ({ ui, runId, toCenterCode, vehicleNumber, startDate, endDate, signal }) => {
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
          fetchPageRows({ pageNo: currentPageNo, toCenterCode, vehicleNumber, startDate, endDate, signal })
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

        if (pageRows.length < PAGE_SIZE) return rows;
      }
    }

    return rows;
  };

  const groupBarcodesByCenter = (rows) => {
    const fromCenterMap = new Map();

    rows.forEach(row => {
      const fromCenter = row.fromCenter;
      const vehicleNumber = row.vehicleNumber;
      const containerBarcode = (!row.containerBarcode || row.containerBarcode === '-') ? row.toteBarcode : row.containerBarcode;  // 컨테이너 바코드가 없으면 토트 바코드를 사용

      if (!fromCenter || !vehicleNumber || !containerBarcode) return;

      if (!fromCenterMap.has(fromCenter)) {
        fromCenterMap.set(fromCenter, []);
      }

      const barcodeData = fromCenterMap.get(fromCenter);

      const existingData = barcodeData.find(b => b.containerBarcode === containerBarcode);
      if (existingData) {
        existingData.rowCount += 1;
      } else {
        barcodeData.push({
          fromCenter: fromCenter,
          vehicleNumber: vehicleNumber,
          containerBarcode: containerBarcode,
          rowCount: 1
        });
      }
    });

    for (const [fromCenter, barcodeData] of fromCenterMap.entries()) {
      barcodeData.sort((a, b) => b.rowCount - a.rowCount);
    }

    return fromCenterMap;
  };

  const renderGroups = (ui, groups, resultBarcodeCnt) => {
    ui.copyGroupButton.disabled = !resultBarcodeCnt;
    ui.copyExcelButton.disabled = !resultBarcodeCnt;

    // 1. 상단 요약 텍스트 출력
    // 전체 고정 센터 중 데이터가 존재하는 받는센터의 개수를 구합니다.
    let activeToCenterCount = 0;
    for (const fromCenterMap of toCenterRowsMap.values()) {
      if (fromCenterMap.size > 0) activeToCenterCount++;
    }

    ui.summary.textContent = resultBarcodeCnt
      ? `받는센터 ${activeToCenterCount}개 / 목록 ${resultBarcodeCnt}건`
      : '';

    // 2. 데이터가 없을 때 예외 처리
    if (!resultBarcodeCnt) {
      ui.result.innerHTML = '<div class="glv-empty">이동중 차량 정보가 없습니다.</div>';
      return;
    }

    // 3. 요청하신 트리 구조(받는센터 > 보내는센터 > 바코드)로 HTML 생성
    let htmlOutput = '';

    for (const [toCenterCode, fromCenterMap] of toCenterRowsMap.entries()) {
      // 해당 받는센터에 데이터가 없으면 패스
      if (fromCenterMap.size === 0) continue;

      htmlOutput += `
        <div class="glv-to-center-block" style="margin-bottom: 20px;">
          <!-- [1계층] 받는센터명 -->
          <div class="glv-to-center-title" style="font-weight: bold; font-size: 15px; color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 4px; margin-bottom: 10px;">
            ${escapeHtml(toCenterCode)}
          </div>
      `;

      for (const [fromCenter, barcodeList] of fromCenterMap.entries()) {
        // 해당 보내는센터에 바코드가 없으면 패스
        if (!barcodeList || barcodeList.length === 0) continue;

        htmlOutput += `
          <div class="glv-from-center-block" style="margin-bottom: 15px;">
            <!-- [2계층] 보내는 센터 -->
            <div class="glv-from-center-title" style="font-weight: bold; font-size: 13px; color: ##FFF; margin-bottom: 6px;">
              ${escapeHtml(fromCenter)}
            </div>
            
            <!-- [3계층] 컨테이너 바코드 리스트 -->
            <div class="glv-barcode-list" style="margin-left: 20px; display: flex; flex-direction: column; gap: 4px; background: #1f2937" border-radius: "7px">
              ${barcodeList.map(item => `
                <div class="glv-barcode-item" style="display: flex; justify-content: space-between; max-width: 400px; font-family: monospace; font-size: 12px; padding: 4px 8px;">
                  <span class="glv-barcode-text" style="color: #555;">${escapeHtml(item.containerBarcode)}</span>
                  <span class="glv-barcode-count" style="font-weight: bold; color: #e44d26;">${item.rowCount}건</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      htmlOutput += `</div>`; // 받는센터 블록 닫기
    }

    ui.result.innerHTML = htmlOutput;
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
  let toCenterRowsMap = new Map();  // 고정 센터들에서 가져온 전체 행 데이터를 저장하는 배열
  let resultBarcodeCnt = 0;

  const clearCurrentResult = () => {
    toCenterRowsMap = new Map();  // 고정 센터들에서 가져온 전체 행 데이터를 초기화 
    resultBarcodeCnt = 0;
    ui.summary.textContent = '';
    ui.result.innerHTML = '';
    ui.copyGroupButton.disabled = true;
    ui.copyExcelButton.disabled = true;
    setStatus(ui, '차량번호 입력 후 조회하세요.');
  };

  ui.closeButton.addEventListener('click', removeExistingPanel);

  ui.stopButton.addEventListener('click', () => {
    window[RUN_KEY] = '';
    window[ABORT_KEY]?.abort();
    setStatus(ui, '조회가 중지되었습니다.');
    setBusy(ui, false);
  });

  ui.copyGroupButton.addEventListener('click', async () => {
    await copyText(buildGroupText(toCenterRowsMap));
    setStatus(ui, '그룹 형식으로 복사했습니다.');
  });

  ui.copyExcelButton.addEventListener('click', async () => {
    await copyText(buildExcelText(toCenterRowsMap));
    setStatus(ui, '엑셀용 형식으로 복사했습니다.');
  });

  ui.vehicleNumberInput.addEventListener('change', clearCurrentResult);
  ui.rangeSelect.addEventListener('change', clearCurrentResult);

  ui.searchButton.addEventListener('click', async () => {
    const vehicleNumber = clean(ui.vehicleNumberInput.value);
    const rangeDays = Number(ui.rangeSelect.value || DEFAULT_RANGE_DAYS);

    if (!vehicleNumber) {
      setStatus(ui, '차량번호를 입력하세요.');
      ui.vehicleNumberInput.focus();
      return;
    }

    const runId = `${Date.now()}-${Math.random()}`;
    const abortController = new AbortController();

    window[ABORT_KEY]?.abort();
    window[RUN_KEY] = runId;
    window[ABORT_KEY] = abortController;

    toCenterRowsMap = new Map();  // 고정 센터들에서 가져온 전체 행 데이터를 초기화
    resultBarcodeCnt = 0;
    ui.summary.textContent = '';
    ui.result.innerHTML = '';
    ui.copyGroupButton.disabled = true;
    ui.copyExcelButton.disabled = true;

    setBusy(ui, true);

    try {
      const { startDate, endDate } = getDateRange(rangeDays);

      // 센터를 루프돌며 수집
      for (const toCenterCode of FIXED_TARGET_CENTERS) {
        setStatus(ui, `이동중 목록 조회 중 · ${toCenterCode} · ${startDate} ~ ${endDate}`);
        const rows = await collectRows({
          ui,
          runId,
          toCenterCode,
          vehicleNumber,
          startDate,
          endDate,
          signal: abortController.signal
        });
        const groupData = groupBarcodesByCenter(rows);
        toCenterRowsMap.set(toCenterCode, groupData);
        for (const barcodeData of groupData.values()) {
          resultBarcodeCnt += barcodeData.length;
        }
      }

      window.grabLoadVehicleVersion = APP_VERSION;
      window.grabLoadVehicleGroups = toCenterRowsMap;

      renderGroups(ui, toCenterRowsMap, resultBarcodeCnt);
      setStatus(ui, resultBarcodeCnt ? '조회 완료' : '조회 완료 · 표시할 차량 정보가 없습니다.');
    } catch (error) {
      if (!isAbortError(error)) {
        console.error(`[${APP_TITLE}]`, error);
      }

      ui.summary.textContent = '';
      ui.result.innerHTML = '';
      ui.copyGroupButton.disabled = true;
      ui.copyExcelButton.disabled = true;

      setStatus(ui, getFriendlyErrorMessage(error));
    } finally {
      if (window[RUN_KEY] === runId) {
        window[ABORT_KEY] = null;
        setBusy(ui, false);
      }
    }
  });

  clearCurrentResult();
})();
