let originalData = [];
let headers = [];

const toggleTableBtn = document.getElementById('toggleTableBtn');
const tableContainer = document.getElementById('tableContainer');
const goFirstRowBtn = document.getElementById('goFirstRowBtn');
const goLastRowBtn = document.getElementById('goLastRowBtn');

const pivotContainer = document.getElementById('pivotContainer');
const pivotBtn = document.getElementById('pivotBtn');

// Initially hide the table and both "Go to First Row" and "Go to Last Row" buttons
tableContainer.style.display = 'none';
goFirstRowBtn.style.display = 'none';
goLastRowBtn.style.display = 'none';

let pivotGenerated = false;
let pivotVisible = false;


toggleTableBtn.addEventListener('click', () => {
  const isVisible = tableContainer.style.display === 'block';
  tableContainer.style.display = isVisible ? 'none' : 'block';
  toggleTableBtn.textContent = isVisible ? 'Show Table' : 'Hide Table';

  if (!isVisible) {
    goFirstRowBtn.style.display = 'inline-block';
    goLastRowBtn.style.display = 'inline-block';
  } else {
    goFirstRowBtn.style.display = 'none';
    goLastRowBtn.style.display = 'none';
  }
});

document.getElementById('csvFile').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const rows = text.trim().split('\n').map(r => r.split(','));
    headers = rows[0];
    headers = [...headers];

    const rawData = rows.slice(1).map(r => {
      const obj = Object.fromEntries(r.map((v, i) => [headers[i], v]));

      headers.forEach(h => {
        const val = obj[h];
        const isDateField = /date|created|timestamp/i.test(h);
        if (!isDateField) return;

        const date = new Date(val);
        if (!isNaN(date)) {
          obj[`${h}_Year`] = date.getFullYear();
          obj[`${h}_Month`] = date.toLocaleString('default', { month: 'long' });
          obj[`${h}_Day`] = date.getDate();
        }
      });

      return obj;
    });

    rawData.length && Object.keys(rawData[0]).forEach(k => {
      if (!headers.includes(k)) headers.push(k);
    });

    originalData = rawData;

    displayTable([rows[0], ...rows.slice(1)]);
    setupPivotControls(headers);
    document.getElementById('pivotControls').style.display = 'flex';

    toggleTableBtn.style.display = 'inline-block';
    toggleTableBtn.textContent = 'Show Table';
    tableContainer.style.display = 'none';
    goFirstRowBtn.style.display = 'none';
    goLastRowBtn.style.display = 'none';
  };
  reader.readAsText(file);
});

function setupPivotControls(headers) {
  ['groupByRowsSelect', 'groupByColsSelect', 'valueColumnSelect'].forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = '';
    headers.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      select.appendChild(opt);
    });
  });
}

function clearSelection(selectId) {
  const select = document.getElementById(selectId);
  Array.from(select.options).forEach(opt => opt.selected = false);
}

function scrollToLastRow() {
  const pivotTable = document.querySelector('#pivotContainer table');
  const regularTable = document.querySelector('#tableContainer table');
  const targetTable = (pivotTable && pivotTable.offsetParent !== null) ? pivotTable : regularTable;
  if (targetTable && targetTable.rows.length > 0) {
    targetTable.rows[targetTable.rows.length - 1].scrollIntoView({ behavior: 'smooth' });
  }
}

function scrollToFirstRow() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function displayTable(dataRows) {
  const container = document.getElementById('tableContainer');
  container.innerHTML = '';
  const table = document.createElement('table');
  dataRows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const cellElem = document.createElement(idx === 0 ? 'th' : 'td');
      cellElem.textContent = cell;
      tr.appendChild(cellElem);
    });
    table.appendChild(tr);
  });
  container.appendChild(table);
}

function aggregate(values, type) {
  if (type === 'sum') return values.reduce((a, b) => a + parseFloat(b || 0), 0);
  if (type === 'avg') return values.reduce((a, b) => a + parseFloat(b || 0), 0) / values.length;
  if (type === 'count') return values.length;
  return '';
}

pivotBtn.addEventListener('click', () => {
  if (!pivotGenerated) {
    const rowFields = Array.from(document.getElementById('groupByRowsSelect').selectedOptions).map(o => o.value);
    const colFields = Array.from(document.getElementById('groupByColsSelect').selectedOptions).map(o => o.value);
    const valueField = document.getElementById('valueColumnSelect').value;
    const agg = document.getElementById('aggregationSelect').value;

    const pivotData = {};
    const rowKeys = new Set();
    const colKeys = new Set();

    originalData.forEach(row => {
      const rowKey = rowFields.map(f => row[f] || 'N/A').join(' | ') || 'Total';
      const colKey = colFields.map(f => row[f] || 'N/A').join(' | ') || 'Total';
      const val = row[valueField];

      if (!pivotData[rowKey]) pivotData[rowKey] = {};
      if (!pivotData[rowKey][colKey]) pivotData[rowKey][colKey] = [];
      pivotData[rowKey][colKey].push(val);

      rowKeys.add(rowKey);
      colKeys.add(colKey);
    });

    const rowKeysSorted = [...rowKeys];
    const colKeysSorted = [...colKeys];

    pivotContainer.innerHTML = '';

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');

    headRow.innerHTML = `<th>${rowFields.join(' | ') || 'Row'}</th>`;
    colKeysSorted.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col;
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rowKeysSorted.forEach(rowKey => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${rowKey}</td>`;

      colKeysSorted.forEach(colKey => {
        const vals = pivotData[rowKey][colKey] || [];
        const aggVal = vals.length ? aggregate(vals, agg) : 0;
        const td = document.createElement('td');
        td.textContent = aggVal.toFixed(2);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    const grandRow = document.createElement('tr');
    grandRow.innerHTML = `<td><strong>Grand Total</strong></td>`;
    colKeysSorted.forEach(colKey => {
      let colSum = 0;
      rowKeysSorted.forEach(rowKey => {
        const vals = pivotData[rowKey][colKey] || [];
        colSum += aggregate(vals, agg);
      });
      const td = document.createElement('td');
      td.textContent = colSum.toFixed(2);
      td.style.fontWeight = 'bold';
      grandRow.appendChild(td);
    });

    tbody.appendChild(grandRow);
    table.appendChild(tbody);
    pivotContainer.appendChild(table);

    pivotGenerated = true;
    pivotVisible = true;
    pivotBtn.textContent = 'Hide Pivot';

    goLastRowBtn.style.display = 'inline-block';
    goFirstRowBtn.style.display = 'inline-block';
  } else {
    pivotVisible = !pivotVisible;
    pivotContainer.style.display = pivotVisible ? 'block' : 'none';
    pivotBtn.textContent = pivotVisible ? 'Hide Pivot' : 'Show Pivot';
  }
});