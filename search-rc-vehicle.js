(async () => {
  'use strict';

  const APP_VERSION = 'v1.2';
  const APP_TITLE = `Search RC Vehicle · duck02 ${APP_VERSION}`;
  const FIXED_TARGET_CENTERS = ['DON1', 'DON1CFC'];
  const CFC_CENTER = 'DON1CFC';
  const RC_PLAN_CROSS_DOCK = 'CROSS_DOCK';
  const DEFAULT_RANGE_DAYS = 3;
  const STATUS_LOAD = 'LOAD';
  const SEARCH_DATE_TYPE = 'UPLOAD_COMPLETED_DATE';
  const PAGE_SIZE = 20;
  const PAGE_CONCURRENCY = 3;
  const MAX_PAGE = 400;
  const REQUEST_GAP_MS = 180;
  const PANEL_ID = 'search-rc-vehicle-panel';
  const STYLE_ID = 'search-rc-vehicle-style';
  const RUN_KEY = '__searchRcVehicleRunId';
  const ABORT_KEY = '__searchRcVehicleAbortController';

  const QUICK_RANGES = [
    { value: '1', label: '오늘', days: 1 },
    { value: '2', label: '2일', days: 2 },
    { value: '3', label: '3일', days: 3 },
    { value: '4', label: '4일', days: 4 },
    { value: '5', label: '5일', days: 5 }
  ];

  const clean = (text) =>
    text?.trim().replace(/\s+/g, ' ') ?? '';

  const getCellValue = (cells, index) => {
    if (index < 0 || !cells) return '';
    return clean(cells[index].innerText || cells[index].textContent);
  };

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
        top: 24px;
        z-index: 999999;
        width: 370px;
        max-height: calc(100vh - 48px);
        box-sizing: border-box;
        padding: 16px;
        overflow: auto;
        background: #121212;
        color: #E0E0E0;
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
      #${PANEL_ID} .srv-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      #${PANEL_ID} .srv-title {
        font-weight: 800;
        font-size: 16px;
        line-height: 1.25;
      }
      #${PANEL_ID} .srv-close {
        width: 28px;
        height: 28px;
        padding: 0;
        border: 1px solid #4b5563;
        border-radius: 6px;
        background: #1f2937;
        color: #f9fafb;
        font-size: 16px;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
      }
      #${PANEL_ID} .srv-input-row {
        display: grid;
        grid-template-columns: 1fr 70px auto;
        gap: 8px;
        margin-bottom: 10px;
      }
      #${PANEL_ID} .srv-summary-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        margin-bottom: 10px;
      }
      #${PANEL_ID} .srv-row {
        display: grid;
        grid-template-columns: 1fr 70px auto;
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
      #${PANEL_ID} .srv-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: flex-end;
        margin-top: 20px;
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
      #${PANEL_ID} .srv-primary {
        background: #2563eb;
        color: #E0E0E0;
      }
      #${PANEL_ID} .srv-secondary {
        background: #374151;
        color: #f9fafb;
      }
      #${PANEL_ID} .srv-secondary#srv-stop {
        background: #CF6679;
        color: #f9fafb;
      }
      #${PANEL_ID} .srv-status {
        min-height: 28px;
        margin: 8px 0;
        padding: 8px 10px;
        border-radius: 7px;
        background: #2C2C2C;
        color: #e5e7eb;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.4;
      }
      #${PANEL_ID} .srv-summary {
        margin: 10px 0;
        color: #d1d5db;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.35;
      }
      #${PANEL_ID} #srv-result {
        text-align: left;
      }
      #${PANEL_ID} .srv-to-center-title {
        font-weight: bold;
        font-size: 15px;
        color: #bb86fc;
        border-bottom: 2px solid #bb86fc;
        padding-bottom: 4px;
        margin-bottom: 10px;
      }
      #${PANEL_ID} .srv-barcode-count {
        font-weight: bold;
        color: #03dac5;
      }
      #${PANEL_ID} .srv-group {
        margin-top: var(--srv-group-gap, 10px);
        padding: var(--srv-group-padding, 10px);
        border: 1px solid #374151;
        border-radius: 8px;
        background: #0b1220;
      }
      #${PANEL_ID} .srv-group-head {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-weight: 800;
        font-size: var(--srv-group-font-size, 14px);
        line-height: 1.2;
      }
      #${PANEL_ID} .srv-count {
        color: #93c5fd;
        font-size: var(--srv-count-font-size, 13px);
        font-weight: 700;
      }
      #${PANEL_ID} .srv-vehicles {
        display: flex;
        flex-wrap: wrap;
        gap: var(--srv-vehicle-gap, 6px);
      }
      #${PANEL_ID} .srv-vehicle {
        display: inline-block;
        min-width: var(--srv-vehicle-min-width, 50px);
        padding: var(--srv-vehicle-padding, 5px 8px);
        color: #f9fafb;
        text-align: left;
        font-weight: 400;
        font-size: var(--srv-vehicle-font-size, 15px);
        line-height: 1.1;
        letter-spacing: 0;
      }
      #${PANEL_ID} .srv-vehicle-new {
        color: #fbbf24;
      }
      #${PANEL_ID} .srv-empty {
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
      <div class="srv-head">
        <div class="srv-title">${escapeHtml(APP_TITLE)}</div>
        <button type="button" class="srv-close" title="닫기">×</button>
      </div>
      <div class="srv-input-row">
        <div>
          <label for="srv-vehicle-number">차량번호</label>
          <input id="srv-vehicle-number" placeholder="4자리 차량번호 입력" autocomplete="off" />
        </div>
        <div>
          <label for="srv-range">기간</label>
          <select id="srv-range">
            ${QUICK_RANGES.map(option => `
              <option value="${option.value}" ${option.days === DEFAULT_RANGE_DAYS ? 'selected' : ''}>
                ${escapeHtml(option.label)}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="srv-actions" style="align-items: flex-end; margin-top: 20px;">
          <button type="button" class="srv-primary" id="srv-search">조회</button>
          <button type="button" class="srv-secondary" id="srv-stop" disabled>중지</button>
        </div>
      </div>
      <div class="srv-status" id="srv-status">차량번호 입력 후 조회하세요.</div>
      <div class="srv-summary-row">
        <div class="srv-summary" id="srv-summary"></div>
        <div class="srv-copy-btns">
          <button type="button" class="srv-secondary" id="srv-copy-barcode" disabled>바코드 복사</button>
          <button type="button" class="srv-secondary" id="srv-copy-excel" disabled>엑셀용 복사</button>
        </div>
      </div>
      
      <div id="srv-result"></div>
    `;

    document.body.appendChild(panel);

    return {
      panel,
      // toCenterInput: panel.querySelector('#srv-to-center'),
      vehicleNumberInput: panel.querySelector('#srv-vehicle-number'),
      rangeSelect: panel.querySelector('#srv-range'),
      searchButton: panel.querySelector('#srv-search'),
      stopButton: panel.querySelector('#srv-stop'),
      copyBarcodeButton: panel.querySelector('#srv-copy-barcode'),
      copyExcelButton: panel.querySelector('#srv-copy-excel'),
      status: panel.querySelector('#srv-status'),
      summary: panel.querySelector('#srv-summary'),
      result: panel.querySelector('#srv-result'),
      closeButton: panel.querySelector('.srv-close')
    };
  };

  const setStatus = (ui, message) => {
    ui.status.textContent = message;
  };

  const setBusy = (ui, isBusy) => {
    ui.searchButton.disabled = isBusy;
    ui.stopButton.disabled = !isBusy;
  };

  const buildListUrl = ({ pageNo, toCenter, vehicleNumber, startDate, endDate }) => {
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
    url.searchParams.set('toCenterCode', toCenter);
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

    // 💡 [로컬 테스트용 분기] 현재 접속 주소가 로컬인 경우 실제 fetch를 하지 않고 더미 HTML을 반환합니다.
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      console.log(`[LOCAL TEST] Dummy data returned for URL: ${url}`);
      
      // 테스트하고 싶은 WMS 결과 화면의 HTML 테이블 구조를 작성합니다.
      return `
        <table>
          <thead>
            <tr>
              <th>보내는센터</th>
              <th>차량번호</th>
              <th>컨테이너바코드</th>
              <th>토트바코드</th>
              <th>이관계획번호</th>
              <th>집품/분배수량</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>동탄1센터</td>
              <td>12가3456</td>
              <td>C-BARCODE-001</td>
              <td>T-BARCODE-001</td>
              <td>RC-PLAN-001</td>
              <td>2000</td>
            </tr>
            <tr>
              <td>동탄1센터</td>
              <td>12가3456</td>
              <td>C-BARCODE-001</td>
              <td>T-BARCODE-001</td>
              <td>CROSS_DOCK</td>
              <td>15</td>
            </tr>
            <tr>
              <td>동탄1센터</td>
              <td>12가3456</td>
              <td>C-BARCODE-002</td>
              <td>T-BARCODE-001</td>
              <td>RC-PLAN-003</td>
              <td>2000</td>
            </tr>
            <tr>
              <td>인천4센터</td>
              <td>12가3456</td>
              <td>C-BARCODE-002</td>
              <td>-</td>
              <td>-</td>
              <td>12</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>51</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>10</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>1002</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>51</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>10</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>1002</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>51</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>10</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>1002</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>51</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>10</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>1002</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>51</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>10</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>1002</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>51</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>10</td>
            </tr>
            <tr>
              <td>고양3센터</td>
              <td>12가3456</td>
              <td>-</td>
              <td>T-BARCODE-999</td>
              <td>-</td>
              <td>1002</td>
            </tr>
          </tbody>
        </table>
      `;
    }

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
    let rcPlanNumberIndex = -1;
    let fromCenterIndex = -1;
    let vehicleNumberIndex = -1;
    let ctBarcodeIndex = -1;
    let toteBarcodeIndex = -1;
    let unitCountIndex = -1;

    tables.some(tbl => {
      const headers = [...tbl.querySelectorAll('thead th')].map(th => clean(th.innerText || th.textContent));
      const rcPlanNumberIdx = headers.findIndex(header => header.replace(/\s/g, '').includes('이관계획번호'));
      const fromCenterIdx = headers.findIndex(header => header.replace(/\s/g, '').includes('보내는센터'));
      const vehicleNumberIdx = headers.findIndex(header => header.replace(/\s/g, '').includes('차량번호'));
      const ctBarcodeIdx = headers.findIndex(header => header.replace(/\s/g, '').includes('컨테이너바코드'));
      const toteBarcodeIdx = headers.findIndex(header => header.replace(/\s/g, '').includes('토트바코드'));
      const unitCountIdx = headers.findIndex(header => header.replace(/\s/g, '').includes('집품/분배수량'));

      if (fromCenterIdx < 0 || vehicleNumberIdx < 0) return false;

      targetTable = tbl;
      rcPlanNumberIndex = rcPlanNumberIdx;
      fromCenterIndex = fromCenterIdx;
      vehicleNumberIndex = vehicleNumberIdx;
      ctBarcodeIndex = ctBarcodeIdx;
      toteBarcodeIndex = toteBarcodeIdx;
      unitCountIndex = unitCountIdx;
      return true;
    });

    if (!targetTable) return [];

    return [...targetTable.querySelectorAll('tbody tr')]
      .map(tr => {
        const cells = [...tr.querySelectorAll('td')];
        
        if (cells.length === 0) return null;
        if (cells.length === 1 && cells[0].hasAttribute('colspan')) return null;

        return {
          rcPlanNumber: getCellValue(cells, rcPlanNumberIndex),
          fromCenter: getCellValue(cells, fromCenterIndex),
          vehicleNumber: getCellValue(cells, vehicleNumberIndex),
          ctBarcode: getCellValue(cells, ctBarcodeIndex),
          toteBarcode: getCellValue(cells, toteBarcodeIndex),
          unitCount: getCellValue(cells, unitCountIndex),
          rowSignature: clean(tr.innerText || tr.textContent)
        };
      })
      .filter(Boolean);
  };

  const makeRowKey = (row) => row.rowSignature || `${row.fromCenter}|${row.vehicleNumber}|${row.ctBarcode}|${row.toteBarcode}`;

  const fetchPageRows = async ({ pageNo, toCenter, vehicleNumber, startDate, endDate, signal }) => {
    const url = buildListUrl({ pageNo, toCenter, vehicleNumber, startDate, endDate });
    console.log(`[${APP_TITLE}] page=${pageNo}`, url);

    const html = await fetchHtml(url, signal);

    return {
      pageNo,
      rows: parseListRows(html)
    };
  };

  const collectRows = async ({ ui, runId, toCenter, vehicleNumber, startDate, endDate, signal }) => {
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
          fetchPageRows({ pageNo: currentPageNo, toCenter, vehicleNumber, startDate, endDate, signal })
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

  const resignRcDataList = (toCenter, rows) => {
    const fromCenterMap = new Map();

    rows.forEach(row => {
      const fromCenter = row.fromCenter;
      const vehicleNumber = row.vehicleNumber;
      // 컨테이너 바코드가 없으면 토트 바코드를 사용
      const ctBarcode = (!row.ctBarcode || row.ctBarcode === '-') ? row.toteBarcode : row.ctBarcode;
      const isCrossDock = row.rcPlanNumber.toUpperCase() === RC_PLAN_CROSS_DOCK;
      const unitCount = Number(row.unitCount) || 0;

      if (!fromCenter || !vehicleNumber || !ctBarcode) return;

      if (!fromCenterMap.has(fromCenter)) {
        fromCenterMap.set(fromCenter, {
          fromCenter,
          toCenter,
          isCrossDock: false,
          vehicleNumber,
          ctBarcodeMap: new Map(),
          palletCount: 0,
          singleSkuPalletCount: 0,
          largePalletCnt: 0,
        });
      }

      const data = fromCenterMap.get(fromCenter);
      if (isCrossDock) data.isCrossDock = true;

      const barcodeMap = data.ctBarcodeMap;
      if (!barcodeMap.has(ctBarcode)) {
        barcodeMap.set(ctBarcode, []);
      }
        barcodeMap.get(ctBarcode).push(unitCount);
    });

    for (const data of fromCenterMap.values()) {
      const sortedBarcodeMap = Array.from(data.ctBarcodeMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      data.ctBarcodeMap = new Map(sortedBarcodeMap);

      const barcodeMap = data.ctBarcodeMap;
      if (barcodeMap.size === 1) {  // 바코드가 하나만 존재하면, 전체 완적으로 판단
        const unitCounts = barcodeMap.values().next().value;
        data.palletCount = unitCounts.length;
        data.singleSkuPalletCount = data.palletCount;
        for (const unitCount of unitCounts) {
          if (unitCount >= 1000) {
            data.largePalletCnt++;
          }
        }
      } else {
        data.palletCount = barcodeMap.size;
        let singleSkuPalletCount = 0;
        for (const unitCounts of barcodeMap.values()) {
          if (unitCounts.length === 1) {
            singleSkuPalletCount++;
            if (unitCounts[0] >= 1000) {
              data.largePalletCnt++;
            }
          }
        }
        data.singleSkuPalletCount = singleSkuPalletCount;
      }
    }
    return Array.from(fromCenterMap.values()).sort((a, b) => a.fromCenter.localeCompare(b.fromCenter));
  };

  const renderGroups = (ui, rcDataListByToCenterMap, rcDataCnt) => {
    ui.copyBarcodeButton.disabled = !rcDataCnt;
    ui.copyExcelButton.disabled = !rcDataCnt;

    // 1. 상단 요약 텍스트 출력
    // 전체 고정 센터 중 데이터가 존재하는 받는센터의 개수를 구합니다.
    let activeToCenterCount = 0;
    for (const rcDataList of rcDataListByToCenterMap.values()) {
      if (rcDataList.length > 0) activeToCenterCount++;
    }

    ui.summary.textContent = rcDataCnt
      ? `받는센터 ${activeToCenterCount}개 / 목록 ${rcDataCnt}건`
      : '';

    // 2. 데이터가 없을 때 예외 처리
    if (!rcDataCnt) {
      ui.result.innerHTML = '<div class="srv-empty">이동중 차량 정보가 없습니다.</div>';
      return;
    }

    // 3. 요청하신 트리 구조(받는센터 > 보내는센터 > 바코드)로 HTML 생성
    let htmlOutput = '';

    for (const [toCenter, rcDataList] of rcDataListByToCenterMap.entries()) {
      // 해당 받는센터에 데이터가 없으면 패스
      if (rcDataList.size === 0) continue;

      htmlOutput += `
        <div class="srv-to-center-block" style="margin-bottom: 20px;">
          <!-- [1계층] 받는센터명 -->
          <div class="srv-to-center-title">
            ${escapeHtml(toCenter)}
          </div>
      `;
      
      for (const rcData of rcDataList) {

        htmlOutput += `
          <div class="srv-from-center-block" style="margin-bottom: 15px;">
            <!-- [2계층] 보내는 센터 -->
            <div class="srv-from-center-title" style="font-weight: bold; font-size: 13px; margin-bottom: 6px;">
              ${escapeHtml(rcData.fromCenter)}
            </div>
            
            <!-- [3계층] 컨테이너 바코드 리스트 -->
            <div class="srv-barcode-list" style="margin-left: 20px; display: flex; flex-direction: column; background: #2c2c2c; border-radius: 7px;">
              ${Array.from(rcData.ctBarcodeMap.entries()).map(([ctBarcode, unitCounts]) => `
                <div class="srv-barcode-item" style="display: flex; justify-content: space-between; max-width: 400px; font-size: 12px; padding: 4px 8px;">
                  <span class="srv-barcode-text">${escapeHtml(ctBarcode)}</span>
                  <span class="srv-barcode-count">${unitCounts.length}건</span>
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

  /**
   * 컨테이너 바코드만 줄바꿈으로 연결한 텍스트를 생성합니다.
   * 
   * @param {Map<string, Array>} map 
   * @returns {string}
   */
  const buildBarcodeText = (map) =>
    Array.from(map.values())
      .flatMap(rcDataList => rcDataList.flatMap(rcData => Array.from(rcData.ctBarcodeMap.keys())))
      .join('\n');

  const buildExcelText = (map) => 
    Array.from(map.values())
      .flatMap(rcDataList => 
        rcDataList.map(rcData => {
          const isCfc = rcData.toCenter === CFC_CENTER;
          const hasLargePallet = rcData.largePalletCnt > 0;

          const rowCells = [
            rcData.isCrossDock ? RC_PLAN_CROSS_DOCK : rcData.fromCenter,
            rcData.fromCenter,
            rcData.vehicleNumber,
            '',  // 예약시간
            '',  // 호출시간
            hasLargePallet ? '대량' + rcData.largePalletCnt + 'P' : '',  // 하차시간
            rcData.palletCount,
            rcData.singleSkuPalletCount,
            calcTons(rcData.palletCount),
            isCfc ? 'CFC' : '재고이관',
            isCfc || rcData.isCrossDock ? '2층' : '지하'
          ];
        return rowCells.join('\t');
      })
    ).join('\n');

  /**
   * 팔렛트 수량에 따라 톤수를 계산합니다.
   * @param {number} palletCount 
   * @returns {string}
   */
  const calcTons = (palletCount) => {
    if (palletCount > 18) return 'DDT';
    if (palletCount > 12) return '11';
    if (palletCount > 6) return '5';
    if (palletCount > 3) return '3.5';
    return '1';
  }

  /**
   * 텍스트를 클립보드에 복사합니다.
   * @param {*} text 
   * @returns 
   */
  const copyText = async (text) => {
    // Use the modern Clipboard API if available
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.style.fontSize = '12px'; // Prevent zooming on iOS
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices
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
  let rcDataListByToCenterMap = new Map();  // 고정 센터들에서 가져온 전체 행 데이터를 저장하는 배열
  let rcDataCnt = 0;

  const clearCurrentResult = () => {
    rcDataListByToCenterMap = new Map();  // 고정 센터들에서 가져온 전체 행 데이터를 초기화 
    rcDataCnt = 0;
    ui.summary.textContent = '';
    ui.result.innerHTML = '';
    ui.copyBarcodeButton.disabled = true;
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

  ui.copyBarcodeButton.addEventListener('click', async () => {
    await copyText(buildBarcodeText(rcDataListByToCenterMap));
    setStatus(ui, '컨테이너바코드를 복사했습니다.');
  });

  ui.copyExcelButton.addEventListener('click', async () => {
    await copyText(buildExcelText(rcDataListByToCenterMap));
    setStatus(ui, '엑셀용 형식으로 복사했습니다.');
  });

  ui.vehicleNumberInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      ui.searchButton.click();
    }
  });

  ui.searchButton.addEventListener('click', async () => {
    const vehicleNumber = clean(ui.vehicleNumberInput.value);
    const rangeDays = Number(ui.rangeSelect.value || DEFAULT_RANGE_DAYS);

    if (!vehicleNumber) {
      setStatus(ui, '차량번호를 입력하세요.');
      ui.vehicleNumberInput.focus();
      return;
    }

    const isFourDigits = /^\d{4}$/.test(vehicleNumber);
    if (!isFourDigits) {
      setStatus(ui, '4자리 숫자를 입력하세요.');
      ui.vehicleNumberInput.focus();
      return;
    }

    const runId = `${Date.now()}-${Math.random()}`;
    const abortController = new AbortController();

    window[ABORT_KEY]?.abort();
    window[RUN_KEY] = runId;
    window[ABORT_KEY] = abortController;

    rcDataListByToCenterMap = new Map();  // 고정 센터들에서 가져온 전체 행 데이터를 초기화
    rcDataCnt = 0;
    ui.summary.textContent = '';
    ui.result.innerHTML = '';
    ui.copyBarcodeButton.disabled = true;
    ui.copyExcelButton.disabled = true;

    setBusy(ui, true);

    try {
      const { startDate, endDate } = getDateRange(rangeDays);

      // 센터를 루프돌며 수집
      for (const toCenter of FIXED_TARGET_CENTERS) {
        setStatus(ui, `이동중 목록 조회 중 · ${toCenter} · ${startDate} ~ ${endDate}`);
        const rows = await collectRows({
          ui,
          runId,
          toCenter,
          vehicleNumber,
          startDate,
          endDate,
          signal: abortController.signal
        });
        const rcDataList = resignRcDataList(toCenter, rows);
        rcDataListByToCenterMap.set(toCenter, rcDataList);
        for (const rcData of rcDataList) {
          rcDataCnt++;
        }
      }

      window.searchRcVehicleVersion = APP_VERSION;
      window.searchRcVehicleResult = rcDataListByToCenterMap;

      renderGroups(ui, rcDataListByToCenterMap, rcDataCnt);
      setStatus(ui, rcDataCnt ? '조회 완료' : '조회 완료 · 표시할 차량 정보가 없습니다.');
    } catch (error) {
      if (!isAbortError(error)) {
        console.error(`[${APP_TITLE}]`, error);
      }

      ui.summary.textContent = '';
      ui.result.innerHTML = '';
      ui.copyBarcodeButton.disabled = true;
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
  ui.vehicleNumberInput.focus();
})();
