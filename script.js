// script.js
document.addEventListener('DOMContentLoaded', () => {
    // Inicializace aplikace
    initializeApp();
    
    // Registrace service workeru pro offline funkcionalitu
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registrován');
            })
            .catch(error => {
                console.error('Chyba při registraci Service Workeru:', error);
            });
    }
});

// Inicializace aplikace
function initializeApp() {
    // Inicializace výběru měsíce a roku
    initializeMonthYearSelect();
    
    // Vytvoření tabulky služeb
    createShiftTable();
    
    // Načtení uložených dat
    loadSavedData();
    
    // Přidání event listenerů pro tlačítka
    setupEventListeners();
}

// Inicializace výběru měsíce a roku
function initializeMonthYearSelect() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    // Nastavení měsíců
    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(2024, i);
        return {
            value: i + 1,
            label: date.toLocaleString('cs', { month: 'long' })
        };
    });
    
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month.value;
        option.textContent = month.label;
        monthSelect.appendChild(option);
    });
    
    // Nastavení roků
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    // Nastavení aktuálního měsíce a roku
    const currentMonth = new Date().getMonth() + 1;
    monthSelect.value = currentMonth;
    yearSelect.value = currentYear;
    
    // Event listeners pro změnu měsíce/roku
    monthSelect.addEventListener('change', refreshTable);
    yearSelect.addEventListener('change', refreshTable);
}

// Vytvoření tabulky služeb
function createShiftTable() {
    const table = document.getElementById('shiftTable');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    // Vyčištění tabulky
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Vytvoření hlavičky
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th class="fixed-column bg-gray-50">Jméno</th>';
    
    const daysInMonth = getDaysInMonth();
    for (let day = 1; day <= daysInMonth; day++) {
        const th = document.createElement('th');
        th.textContent = day;
        if (isWeekend(day)) {
            th.classList.add('weekend');
        }
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    
    // Vytvoření řádků pro zaměstnance
    EmployeeManager.getEmployeesList().forEach(employee => {
        const tr = document.createElement('tr');
        
        // Jméno zaměstnance
        const tdName = document.createElement('td');
        tdName.className = 'fixed-column';
        tdName.textContent = employee;
        tr.appendChild(tdName);
        
        // Buňky pro služby
        for (let day = 1; day <= daysInMonth; day++) {
            tr.appendChild(ShiftManager.createShiftCell(employee, day));
        }
        
        tbody.appendChild(tr);
    });
}

// Načtení uložených dat
async function loadSavedData() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    const shifts = await Storage.loadMonthShifts(
        yearSelect.value,
        monthSelect.value
    );
    
    if (shifts) {
        Object.entries(shifts).forEach(([key, shift]) => {
            const [employee, day] = key.split('-');
            const select = document.querySelector(
                `select[data-employee="${employee}"][data-day="${day}"]`
            );
            if (select) {
                select.value = shift;
                if (shift) {
                    select.style.backgroundColor = ShiftManager.shiftTypes[shift].color;
                }
            }
        });
    }
}

// Nastavení event listenerů
function setupEventListeners() {
    // Export do Wordu
    document.querySelector('#exportBtn')?.addEventListener('click', exportToWord);
    
    // Vymazání služeb
    document.querySelector('#clearBtn')?.addEventListener('click', () => {
        if (confirm('Opravdu chcete vymazat všechny služby pro tento měsíc?')) {
            clearCurrentMonthShifts();
        }
    });
}

// Export do Wordu
function exportToWord() {
    const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word'
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Rozpis služeb</title>
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 4px; }
                .weekend { background-color: #fffde7; }
            </style>
        </head>
        <body>
    `;

    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const monthName = monthSelect.options[monthSelect.selectedIndex].text;
    
    let content = `
        <h1>${monthName} ${yearSelect.value}</h1>
        <table>
            <tr>
                <th>Jméno</th>
    `;

    const daysInMonth = getDaysInMonth();
    for (let i = 1; i <= daysInMonth; i++) {
        content += `<th class="${isWeekend(i) ? 'weekend' : ''}">${i}</th>`;
    }
    content += '</tr>';

    // Data zaměstnanců
    EmployeeManager.getEmployeesList().forEach(employee => {
        content += `<tr><td>${employee}</td>`;
        for (let day = 1; day <= daysInMonth; day++) {
            const select = document.querySelector(
                `select[data-employee="${employee}"][data-day="${day}"]`
            );
            content += `<td>${select?.value || ''}</td>`;
        }
        content += '</tr>';
    });

    content += '</table>';
    const footer = '</body></html>';

    // Vytvoření a stažení souboru
    const blob = new Blob([header + content + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rozpis_${yearSelect.value}_${monthSelect.value}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Vymazání služeb aktuálního měsíce
async function clearCurrentMonthShifts() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    await Storage.clearMonthShifts(yearSelect.value, monthSelect.value);
    refreshTable();
}

// Pomocné funkce
function getDaysInMonth() {
    const year = document.getElementById('yearSelect').value;
    const month = document.getElementById('monthSelect').value;
    return new Date(year, month, 0).getDate();
}

function isWeekend(day) {
    const year = document.getElementById('yearSelect').value;
    const month = document.getElementById('monthSelect').value;
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0 || date.getDay() === 6;
}

function refreshTable() {
    createShiftTable();
    loadSavedData();
    ShiftManager.updateStats();
}
// Validace služeb
function validateShifts() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    const shifts = ShiftManager.getShifts(); // Předpokládejme, že tato metoda existuje a vrací aktuální stav služeb
    const year = yearSelect.value;
    const month = monthSelect.value;

    const violations = RulesManager.validateAll(shifts, year, month);
    
    // Zpracování a zobrazení porušení pravidel uživateli
    if (violations.length > 0) {
        alert(`Nalezena porušení pravidel:\n${violations.join('\n')}`);
    } else {
        alert('Žádná porušení pravidel nebyla nalezena.');
    }
}
