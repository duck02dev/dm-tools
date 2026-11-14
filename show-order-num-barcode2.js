javascript:(function() {
  const STYLE_ID = 'toggle-row-style';
  const HIDE_TBODY_CLS = 'hide-extra-row';
  const HIDE_TR_CLS = 'extra-row';
  const TOGGLE_BTN_ID = 'row-toggle-btn';
  
  function addStyle() {
    if (!document.getElementById(STYLE_ID)) {
      var style = document.createElement('style');
      style.id = STYLE_ID;
      style.innerHTML = `
        .${HIDE_TBODY_CLS} tr.${HIDE_TR_CLS} {
          visibility: collapse;
        }
        #${TOGGLE_BTN_ID} {
          position: fixed;
          top: 15px;
          left: 80px;
          z-index: 99999;
          padding: 8px 14px;
          background: #222;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        @media print {
          #${TOGGLE_BTN_ID} {
            display: none !important;
          }
        }
        `;
      document.head.appendChild(style);
    }
  }
  
  function run() {
    addStyle();

    var tbody = document.querySelector('table.info-table:nth-of-type(2) tbody');
    if (!tbody) return;

    tbody.classList.add(HIDE_TBODY_CLS);

    var rows = tbody.querySelectorAll('tr');
    rows.forEach(function(row) {
      var cells = row.cells;
      if (!cells) return;
      if (cells.length != 10 && cells.length != 6) {
        row.classList.add(HIDE_TR_CLS);
        return;
      }
      
      var orderNumIdx = (cells.length === 6) ? 0 : 4;
      if (cells && cells[orderNumIdx]) {
        var cell = cells[orderNumIdx];
        var orderNum = cell.innerText.split('\n')[0].trim();

        if (cell.querySelector('.b-code')) return;
        
        if (orderNum && !isNaN(orderNum)) {
          cell.innerHTML = `<svg class="b-code"></svg>`;
          try {
            JsBarcode(cell.querySelector('.b-code'), orderNum, {
              format: "CODE128", 
              width: 1.5, 
              height: 35, 
              displayValue: true 
            });
          } catch(e) {}
        }
      }
    });

    var oldBtn = document.getElementById('row-toggle-btn');
    if (oldBtn) oldBtn.remove();

    var btn = document.createElement('button');
    btn.id = 'row-toggle-btn';
    btn.innerText = '전체 보기';
    btn.onclick = function() {
      var isHidden = tbody.classList.toggle('hide-extra-row');
      btn.innerText = isHidden ? '전체 보기' : '바코드만 보기';
      btn.style.background = isHidden ? '#222' : '#06c';
    };
    document.body.appendChild(btn);
  };

  if (typeof JsBarcode !== 'undefined') {
    run();
  } else {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js';
    script.onload = run;
    document.head.appendChild(script);
  }
})();
