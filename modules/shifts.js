// modules/shifts.js
const ShiftManager = {
    // Typy služeb
    shiftTypes: {
        'R': { name: 'Ranní', color: '#ADD8E6', hours: 7.5 },
        'O': { name: 'Odpolední', color: '#90EE90', hours: 7.5 },
        'L': { name: 'Lékař', color: '#FFB6C1', hours: 7.5 },
        'IP': { name: 'Individuální péče', color: '#FFDAB9', hours: 7.5 },
        'RO': { name: 'Ranní+Odpolední', color: '#DDA0DD', hours: 11.5 },
        'NSK': { name: 'Noční služba staniční', color: '#FFFF99', hours: 12, nightStart: 19, nightEnd: 7 },
        'CH': { name: 'Chráněné bydlení', color: '#FFA07A', hours: 7.5 },
        'V': { name: 'Volno', color: '#D3D3D3', hours: 0 },
        'N': { name: 'Noční', color: '#B0C4DE', hours: 9, nightStart: 21, nightEnd: 6 },
        'S': { name: 'Služba', color: '#98FB98', hours: 7.5 },
        'D': { name: 'Dovolená', color: '#F0E68C', hours: 7.5 },
        'IV': { name: 'Individuální výchova', color: '#E6E6FA', hours: 7.5 },
        'ŠK': { name: 'Školení', color: '#FFE4B5', hours: 7.5 }
    },

    // Vytvoření buňky pro službu
    createShiftCell(employee, day, currentShift = '') {
        const cell = document.createElement('td');
        cell.className = 'shift-cell';

        const select = document.createElement('select');
        select.className = 'shift-select';
        select.dataset.employee = employee;
        select.dataset.day = day;

        // Prázdná možnost
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '';
        select.appendChild(emptyOption);

        // Přidání všech typů služeb
        Object.entries(this.shiftTypes).forEach(([code, info]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = code;
            if (code === currentShift) {
                option.selected = true;
                select.style.backgroundColor = info.color;
            }
            select.appendChild(option);
        });

        // Event listener pro změnu služby
        select.addEventListener('change', async (e) => {
            const shift = e.target.value;
            if (shift) {
                e.target.style.backgroundColor = this.shiftTypes[shift].color;
            } else {
                e.target.style.backgroundColor = '';
            }
            await this.updateShift(employee, day, shift);
        });

        cell.appendChild(select);
        return cell;
    },

    // Aktualizace služby
    async updateShift(employee, day, shift) {
        const currentYear = document.getElementById('yearSelect').value;
        const currentMonth = document.getElementById('monthSelect').value;
        
        let shifts = await Storage.loadMonthShifts(currentYear, currentMonth) || {};
        
        if (shift) {
            shifts[`${employee}-${day}`] = shift;
        } else {
            delete shifts[`${employee}-${day}`];
        }
        
        await Storage.saveMonthShifts(currentYear, currentMonth, shifts);
        await this.updateStats();
    },

    // Získání aktuálního stavu služeb
    getShifts() {
        const shifts = {};
        const monthSelect = document.getElementById('monthSelect');
        const yearSelect = document.getElementById('yearSelect');
        
        EmployeeManager.getEmployeesList().forEach(employee => {
            const daysInMonth = new Date(yearSelect.value, monthSelect.value, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const select = document.querySelector(
                    `select[data-employee="${employee}"][data-day="${day}"]`
                );
                if (select) {
                    shifts[`${employee}-${day}`] = select.value;
                }
            }
        });

        return shifts;
    },

    // Výpočet statistik
    async updateStats() {
        const currentYear = document.getElementById('yearSelect').value;
        const currentMonth = document.getElementById('monthSelect').value;
        const shifts = await Storage.loadMonthShifts(currentYear, currentMonth) || {};
        const stats = {};
        
        // Výpočet pracovních dnů v měsíci
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        let workDays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            if (!this.isWeekend(new Date(currentYear, currentMonth - 1, day))) {
                workDays++;
            }
        }

        // Výpočet statistik pro každého zaměstnance
        EmployeeManager.getEmployeesList().forEach(employee => {
            let totalHours = 0;
            let weekendHours = 0;
            const shiftCounts = {};

            // Inicializace počítadel pro každý typ služby
            Object.keys(this.shiftTypes).forEach(type => {
                shiftCounts[type] = 0;
            });

            // Procházení všech dnů v měsíci
            for (let day = 1; day <= daysInMonth; day++) {
                const shift = shifts[`${employee}-${day}`];
                if (shift && this.shiftTypes[shift]) {
                    shiftCounts[shift]++;
                    let hours = this.shiftTypes[shift].hours;

                    // Počítání víkendových hodin
                    if (this.isWeekend(new Date(currentYear, currentMonth - 1, day))) {
                        weekendHours += hours;
                    }

                    totalHours += hours;
                }
            }

            stats[employee] = {
                totalHours,
                weekendHours,
                fundHours: workDays * 7.5,
                overtime: totalHours - (workDays * 7.5),
                shiftCounts
            };
        });

        this.displayStats(stats);
    },

    // Zobrazení statistik
    displayStats(stats) {
        const statsDiv = document.getElementById('stats');
        if (!statsDiv) return;

        statsDiv.innerHTML = '';
        statsDiv.classList.remove('hidden');

        Object.entries(stats).forEach(([name, stat]) => {
            const employeeStats = document.createElement('div');
            employeeStats.className = 'stats-card';
            employeeStats.innerHTML = `
                <h4 class="font-semibold">${name}</h4>
                <div class="grid grid-cols-2 gap-2 mt-2">
                    <div>
                        <p>Celkem hodin: ${stat.totalHours.toFixed(1)}</p>
                        <p>Fond pracovní doby: ${stat.fundHours.toFixed(1)}</p>
                        <p class="${stat.overtime >= 0 ? 'text-green-600' : 'text-red-600'}">
                            Přesčas: ${stat.overtime.toFixed(1)}
                        </p>
                        <p>Víkendové hodiny: ${stat.weekendHours.toFixed(1)}</p>
                    </div>
                    <div>
                        <p class="font-semibold">Počty služeb:</p>
                        ${Object.entries(stat.shiftCounts)
                            .filter(([_, count]) => count > 0)
                            .map(([type, count]) => `
                                <p>${type}: ${count}</p>
                            `).join('')}
                    </div>
                </div>
            `;
            statsDiv.appendChild(employeeStats);
        });
    },

    // Pomocná funkce pro kontrolu víkendu
    isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6;
    }
};

// Export pro použití v jiných modulech
window.ShiftManager = ShiftManager;
