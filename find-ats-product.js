(async () => {
  'use strict';

  const APP_VERSION = 'v1.0';
  const APP_TITLE = `Find ATS Product · duck02 ${APP_VERSION}`;
  const PANEL_ID = 'find-ats-product-panel';
  const STYLE_ID = 'find-ats-product-style';

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
      #${PANEL_ID} .fap-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      #${PANEL_ID} .fap-title {
        font-weight: 800;
        font-size: 16px;
        line-height: 1.25;
      }
      #${PANEL_ID} .fap-close {
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
      #${PANEL_ID} .fap-input-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        margin-bottom: 10px;
      }
      #${PANEL_ID} .fap-summary-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        margin-bottom: 10px;
      }
      #${PANEL_ID} .fap-row {
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
      #${PANEL_ID} textarea,
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
      #${PANEL_ID} textarea {
        height: 100px;
        overflow: auto;
        padding: 5px;
        resize: none;
        white-space: pre;
        cursor: auto;
      }
      #${PANEL_ID} textarea::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }
      #${PANEL_ID} textarea::-webkit-scrollbar-thumb {
        border-radius: 8px;
        border: 3px solid transparent;
        background-clip: content-box;
        background-color: #bb86fc;
      }
      #${PANEL_ID} textarea::-webkit-scrollbar-corner {
        background-color: #030712;
      }
      #${PANEL_ID} .fap-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: baseline;
        margin-top: 19px;
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
      #${PANEL_ID} .fap-primary {
        background: #2563eb;
        color: #E0E0E0;
      }
      #${PANEL_ID} .fap-secondary {
        background: #374151;
        color: #f9fafb;
      }
      #${PANEL_ID} .fap-status {
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
      #${PANEL_ID} .fap-summary {
        margin: 10px 0;
        color: #d1d5db;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.35;
      }
      #${PANEL_ID} #fap-result {
        text-align: left;
      }
      #${PANEL_ID} .fap-to-center-title {
        font-weight: bold;
        font-size: 15px;
        color: #bb86fc;
        border-bottom: 2px solid #bb86fc;
        padding-bottom: 4px;
        margin-bottom: 10px;
      }
      #${PANEL_ID} .fap-barcode-count {
        font-weight: bold;
        color: #03dac5;
      }
      #${PANEL_ID} .fap-group {
        margin-top: var(--fap-group-gap, 10px);
        padding: var(--fap-group-padding, 10px);
        border: 1px solid #374151;
        border-radius: 8px;
        background: #0b1220;
      }
      #${PANEL_ID} .fap-group-head {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-weight: 800;
        font-size: var(--fap-group-font-size, 14px);
        line-height: 1.2;
      }
      #${PANEL_ID} .fap-count {
        color: #93c5fd;
        font-size: var(--fap-count-font-size, 13px);
        font-weight: 700;
      }
      #${PANEL_ID} .fap-vehicles {
        display: flex;
        flex-wrap: wrap;
        gap: var(--fap-vehicle-gap, 6px);
      }
      #${PANEL_ID} .fap-vehicle {
        display: inline-block;
        min-width: var(--fap-vehicle-min-width, 50px);
        padding: var(--fap-vehicle-padding, 5px 8px);
        color: #f9fafb;
        text-align: left;
        font-weight: 400;
        font-size: var(--fap-vehicle-font-size, 15px);
        line-height: 1.1;
        letter-spacing: 0;
      }
      #${PANEL_ID} .fap-vehicle-new {
        color: #fbbf24;
      }
      #${PANEL_ID} .fap-empty {
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
      <div class="fap-head">
        <div class="fap-title">${escapeHtml(APP_TITLE)}</div>
        <button type="button" class="fap-close" title="닫기">×</button>
      </div>
      <div class="fap-input-row">
        <div>
          <label for="fap-ats-lists">ATS 제품 리스트</label>
          <textarea id="fap-ats-lists" placeholder="하차페이지의 ATS 제품리스트 입력" autocomplete="off"></textarea>
        </div>
        <div class="fap-actions">
          <button type="button" class="fap-primary" id="fap-search">찾기</button>
        </div>
      </div>
      <div class="fap-status" id="fap-status">차량번호 입력 후 조회하세요.</div>
      <div class="fap-summary-row">
        <div class="fap-summary" id="fap-summary"></div>
        <div class="fap-copy-btns">
          <button type="button" class="fap-secondary" id="fap-copy-barcode" disabled>바코드 복사</button>
          <button type="button" class="fap-secondary" id="fap-copy-excel" disabled>엑셀용 복사</button>
        </div>
      </div>
      
      <div id="fap-result"></div>
    `;

    document.body.appendChild(panel);

    return {
      panel,
      atsLists: panel.querySelector('#fap-ats-lists'),
      searchButton: panel.querySelector('#fap-search'),
      copyBarcodeButton: panel.querySelector('#fap-copy-barcode'),
      copyExcelButton: panel.querySelector('#fap-copy-excel'),
      status: panel.querySelector('#fap-status'),
      summary: panel.querySelector('#fap-summary'),
      result: panel.querySelector('#fap-result'),
      closeButton: panel.querySelector('.fap-close')
    };
  };

  const setStatus = (ui, message) => {
    ui.status.textContent = message;
  };

  const setBusy = (ui, isBusy) => {
    ui.searchButton.disabled = isBusy;
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

  /**
   * WMS 조회 결과 HTML을 가져옵니다.
   * @param {string} url - WMS 조회 URL
   * @param {AbortSignal} signal - 중단 신호
   * @returns {Promise<string>} WMS 조회 결과 HTML 문자열
   */
  const fetchHtml = async (url, signal) => {
    await sleep(REQUEST_GAP_MS, signal);

    // 로컬 테스트 환경에서는 실제 WMS URL 대신 test.html을 사용합니다.
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      console.log(`[LOCAL TEST] Original URL bypassed. Fetching test asset instead.`);
      url = '/find-ats-product-dummy.html'; // Live Server의 루트 디렉토리에 있는 test.html을 바라봅니다.
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

    if (!response.ok) {
      throw new Error(`WMS 조회에 실패했습니다. 잠시 후 다시 시도하세요. (${response.status})`);
    }

    const html = await response.text();
    if (html.includes('<input') && html.includes('password')) {
      throw new Error('WMS 로그인이 필요합니다. 새로고침 또는 재로그인 후 다시 실행하세요.');
    }

    return html;
  };

  /**
   * WMS 조회 결과 HTML에서 데이터를 파싱하여 행 객체 배열을 생성합니다.
   * @param {string} html - WMS 조회 결과 HTML 문자열
   * @returns {Array} 행 객체 배열
   */
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

  /**
   * 행 객체를 고유하게 식별할 수 있는 키를 생성합니다.
   * @param {Object} row - 행 객체
   * @returns {string} 고유 키 문자열
   */
  const makeRowKey = (row) => row.rowSignature || `${row.fromCenter}|${row.vehicleNumber}|${row.ctBarcode}|${row.toteBarcode}`;

  /**
   * WMS에서 특정 페이지의 데이터를 조회합니다.
   * @param {Object} params - 조회 파라미터 객체
   * @returns {Promise<Object>} 조회 결과 객체 (pageNo, rows)
   */
  const fetchPageRows = async ({ pageNo, toCenter, vehicleNumber, startDate, endDate, signal }) => {
    const url = buildListUrl({ pageNo, toCenter, vehicleNumber, startDate, endDate });
    console.log(`[${APP_TITLE}] page=${pageNo}`, url);

    const html = await fetchHtml(url, signal);

    return {
      pageNo,
      rows: parseListRows(html)
    };
  };

  /**
   * WMS에서 차량번호 기준으로 데이터를 조회하고, 중복 페이지를 제거하여 모든 행을 수집합니다.
   * @param {Object} params - 조회 파라미터 객체
   * @returns {Promise<Array>} 수집된 데이터 배열
   */
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

  /**
   * 조회된 데이터를 보내는 센터 기준으로 그룹화하고, 바코드별로 집계합니다.
   * @param {string} toCenter - 받는 센터 코드
   * @param {Array} rows - 조회된 데이터 배열
   * @returns {Array} 그룹화된 데이터 배열
   */
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

  /**
   * 데이터를 받는센터 기준으로 그룹화하고, HTML을 생성하여 화면에 출력합니다.
   * @param {Object} ui - UI 요소 객체
   * @param {Map<string, Array>} rcDataListByToCenterMap - 받는센터 기준으로 그룹화된 데이터 맵
   * @param {number} rcDataCnt - 총 데이터 개수
   */
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
      ui.result.innerHTML = '<div class="fap-empty">이동중 차량 정보가 없습니다.</div>';
      return;
    }

    // 3. 요청하신 트리 구조(받는센터 > 보내는센터 > 바코드)로 HTML 생성
    let htmlOutput = '';

    for (const [toCenter, rcDataList] of rcDataListByToCenterMap.entries()) {
      // 해당 받는센터에 데이터가 없으면 패스
      if (rcDataList.size === 0) continue;

      htmlOutput += `
        <div class="fap-to-center-block" style="margin-bottom: 20px;">
          <!-- [1계층] 받는센터명 -->
          <div class="fap-to-center-title">
            ${escapeHtml(toCenter)}
          </div>
      `;
      
      for (const rcData of rcDataList) {

        htmlOutput += `
          <div class="fap-from-center-block" style="margin-bottom: 15px;">
            <!-- [2계층] 보내는 센터 -->
            <div class="fap-from-center-title" style="font-weight: bold; font-size: 13px; margin-bottom: 6px;">
              ${escapeHtml(rcData.fromCenter)}
            </div>
            
            <!-- [3계층] 컨테이너 바코드 리스트 -->
            <div class="fap-barcode-list" style="margin-left: 20px; display: flex; flex-direction: column; background: #2c2c2c; border-radius: 7px;">
              ${Array.from(rcData.ctBarcodeMap.entries()).map(([ctBarcode, unitCounts]) => `
                <div class="fap-barcode-item" style="display: flex; justify-content: space-between; max-width: 400px; font-size: 12px; padding: 4px 8px;">
                  <span class="fap-barcode-text">${escapeHtml(ctBarcode)}</span>
                  <span class="fap-barcode-count">${unitCounts.length}건</span>
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
   * @param {Map<string, Array>} map 
   * @returns {string}
   */
  const buildBarcodeText = (map) =>
    Array.from(map.values())
      .flatMap(rcDataList => rcDataList.flatMap(rcData => Array.from(rcData.ctBarcodeMap.keys())))
      .join('\n');

  /**
   * 엑셀용 탭 구분 텍스트를 생성합니다.
   * @param {Map<string, Array>} map
   * @returns {string}
   */
  const buildExcelText = (map) => 
    Array.from(map.values())
      .flatMap(rcDataList => 
        rcDataList.map(rcData => {
          const isCfc = rcData.toCenter === CFC_CENTER;
          const hasLargePallet = rcData.largePalletCnt > 0;

          const rowCells = [
            (!isCfc && rcData.isCrossDock) ? RC_PLAN_CROSS_DOCK : rcData.fromCenter,
            rcData.fromCenter,
            rcData.vehicleNumber,
            '',  // 예약시간
            '',  // 호출시간
            hasLargePallet ? '대량' + rcData.largePalletCnt + 'P' : '',  // 하차시간
            rcData.palletCount,
            isCfc ? 0 : rcData.singleSkuPalletCount,
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
    if (palletCount > 2) return '3.5';
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

  /**
   * 에러 객체를 받아서 사용자 친화적인 메시지를 반환합니다.
   * @param {Error} error 
   * @returns {string}
   */
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

  /**
   * 현재 조회 결과를 초기화합니다.
   */
  const clearCurrentResult = () => {
    rcDataListByToCenterMap = new Map();  // 고정 센터들에서 가져온 전체 행 데이터를 초기화 
    rcDataCnt = 0;
    ui.summary.textContent = '';
    ui.result.innerHTML = '';
    ui.copyBarcodeButton.disabled = true;
    ui.copyExcelButton.disabled = true;
    setStatus(ui, '차량번호 입력 후 조회하세요.');
  };

  // Execute the main function to initialize the UI and set up event listeners
  const ui = createPanel();
  let rcDataListByToCenterMap = new Map();  // 고정 센터들에서 가져온 전체 행 데이터를 저장하는 배열
  let rcDataCnt = 0;

  ui.closeButton.addEventListener('click', removeExistingPanel);

  ui.copyBarcodeButton.addEventListener('click', async () => {
    await copyText(buildBarcodeText(rcDataListByToCenterMap));
    setStatus(ui, '컨테이너바코드를 복사했습니다.');
  });

  ui.copyExcelButton.addEventListener('click', async () => {
    await copyText(buildExcelText(rcDataListByToCenterMap));
    setStatus(ui, '엑셀용 형식으로 복사했습니다.');
  });

  ui.searchButton.addEventListener('click', async () => {
    const atsProducts = clean(ui.vehicleNumberInput.value);

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

  const scrapeTruckContainerList = () => {
    const table = document.getElementById('truckContainerList');
    if (!table) return [];

    const ROWSPAN_OFFSET = 4;

    const rows = table.querySelectorAll('tbody tr');

    return Array.from(rows).reduce((acc, row) => {
      const cells = row.querySelectorAll('td');

      if (cells.length === 9) {
        acc.push({
          name: cells[1].innerText.trim(),
          qty: getCellInt(cells, 3),
          skus: [{
            name: cells[5].innerText.trim(),
            qty: getCellInt(cells, 7)
          }]
        });
      } else if (acc.length > 0) {
        const current = acc[acc.length - 1];
        if (current.qty === 1) {
          current.skus.push({
            name: cells[5 - ROWSPAN_OFFSET].innerText.trim(),
            qty: getCellInt(cells, 7 - ROWSPAN_OFFSET)
          });
        }
      }
      return acc;
    }, []);
  }

  document.addEventListener('paste', (event) => {
    event.preventDefault();

    const clipboardData = event.clipboardData || window.clipboardData;
    const atsTexts = clipboardData.getData('text');
    if (!atsTexts) return;

    const atsProducts = atsTexts
      .split(\(/\r\)?\n/)
      .map(term => term.trim())
      .filter(term => term.length > 0);
    if (atsProducts.length === 0) return;

    const containerTable = document.getElementById('truckContainerList');
    if (!containerTable) return;

    const existingHighlights = containerTable.querySelectorAll('.highlight');
    existingHighlights.forEach(span => {
      span.outerHTML = span.textContent;
    });

    containerTable.normalize();

    const textNodes = [];
    const walk = document.createTreeWalker(containerTable, NodeFilter.SHOW_TEXT, null, false);
    let currentNode;
    while (currentNode = walk.nextNode()) {
      if (currentNode.nodeValue.trim().length > 0) {
        textNodes.push(currentNode);
      }
    }
    const escapedTerms = atsProducts.map(term => term.replace(/[-\/\\^\$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'g');
    
    // 6. 각 텍스트 노드를 순회하며 매칭되는 단어를 <span> 태그로 치환
    // 뒤에서부터 순회해야 노드가 쪼개져도 인덱스가 들어지지 않습니다.
    for (let i textNodes.length - 1; i >= 0; i--) {
      const node = textNodes[i];
      const text = node.nodeValue;

      if (regex.test(text)) {
        // 정규식 위치를 리셋하고 매칭 실행
        regex.lastIndex = 0;
        
        // 안전하게 HTML 요소를 생성하기 위해 임시 div 활용
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text.replace(regex, '<span class="highlight">\$1</span>');
        
        // 기존 텍스트 노드가 있던 자리에 하이라이트된 새 노드들을 삽입
        while (tempDiv.firstChild) {
          node.parentNode.insertBefore(tempDiv.firstChild, node);
        }
        // 기존 원본 텍스트 노드는 삭제
        node.parentNode.removeChild(node);
      }
    }
  });
})();
