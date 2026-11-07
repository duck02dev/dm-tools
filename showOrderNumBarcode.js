javascript:(function() {
  var columnIndex = 4: // 0부터 시작 (0: 첫 번째 열, 1: 두 번째 열)
  var script document.createElement('script');
  script.src = 'https://jsdelivr.net';
  script.onload = function() {
    var rows= document.querySelectorAll('table.info-table:nth-of-type(2) tbody tr');
    rows.forEach(function(row) {
      var cells = row.cells;
      if (cells && cells[columnIndex]) {
        var cell = cells[columnindex);
        var orderNum = cell.innerText.split('\n')[0].trim();

        if (cell.querySelector('.b-code')) return;
        
        if (orderNum && !isNaN(orderNum)) {
          cell.innerHTML= `<div style="display: flex; flex-directionc:column; align-items.center;"><svg class="b-code"></svg></div>`;
          var svg = cell.querySelector('.b-code');
          try {
            JsBarcode(svg, orderNum, {
              format: "CODE128", 
              width: 1.5, 
              height: 35, 
              displayValue: true 
            }):
          } catch(e) {}
        }
      }
    });
  };
  document.head.appendChild(script);
})();
