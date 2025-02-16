// modules/rules.js
const RulesManager = {
    // Obecná pravidla
    generalRules: {
        minDayStaff: 4,
        minNightStaff: 1,
        maxConsecutiveShifts: 5
    },

    // Kontrola obsazení služeb
    checkOccupancy(shifts, date) {
        const violations = [];
        const dayShifts = {
            R: 0,  // Ranní
            O: 0,  // Odpolední
            RO: 0  // Ranní+Odpolední
        };
        const nightShifts = {
            N: 0,  // Noční
            NSK: 0 // Noční staniční
        };

        // Počítání směn
        Object.entries(shifts).forEach(([key, shift]) => {
            if (dayShifts.hasOwnProperty(shift)) {
                dayShifts[shift]++;
            }
            if (nightShifts.hasOwnProperty(shift)) {
                nightShifts[shift]++;
            }
        });

        // Kontrola denních směn
        const totalDayStaff = dayShifts.R + dayShifts.O + (dayShifts.RO * 2);
        if (totalDayStaff < this.generalRules.minDayStaff) {
            violations.push(`Nedostatečný počet denních služeb (${totalDayStaff}/${this.generalRules.minDayStaff})`);
        }

        // Kontrola nočních směn
        const totalNightStaff = Object.values(nightShifts).reduce((a, b) => a + b, 0);
        if (totalNightStaff < this.generalRules.minNightStaff) {
            violations.push(`Nedostatečný počet nočních služeb (${totalNightStaff}/${this.generalRules.minNightStaff})`);
        }

        return violations;
    },

    // Kontrola po sobě jdoucích směn
    checkConsecutiveShifts(shifts, employee) {
        const violations = [];
        let consecutive = 0;
        let lastShiftDay = 0;

        Object.entries(shifts)
            .filter(([key]) => key.startsWith(employee))
            .sort((a, b) => {
                const dayA = parseInt(a[0].split('-')[1]);
                const dayB = parseInt(b[0].split('-')[1]);
                return dayA - dayB;
            })
            .forEach(([key, shift]) => {
                const currentDay = parseInt(key.split('-')[1]);
                
                if (shift && shift !== 'V' && shift !== 'D') {
                    if (currentDay === lastShiftDay + 1) {
                        consecutive++;
                    } else {
                        consecutive = 1;
                    }
                    
                    if (consecutive > this.generalRules.maxConsecutiveShifts) {
                        violations.push(`Příliš mnoho po sobě jdoucích směn (${consecutive})`);
                    }
                    
                    lastShiftDay = currentDay;
                } else {
                    consecutive = 0;
                }
            });

        return violations;
    },

    // Kontrola speciálních pravidel pro Vaněčkovou
    checkSpecialRules(shifts, year, month) {
        const violations = [];
        const allowedNskDays = [2, 3, 8, 13];
        
        Object.entries(shifts).forEach(([key, shift]) => {
            const [employee, day] = key.split('-');
            
            if (employee === "Vaněčková Dana") {
                // Kontrola NSK služeb
                if (shift === 'NSK' && !allowedNskDays.includes(parseInt(day))) {
                    violations.push(`Vaněčková: NSK služba je ve špatný den (${day})`);
                }
                
                // Kontrola pátečních CH služeb
                const date = new Date(year, month - 1, parseInt(day));
                if (date.getDay() === 5 && shift !== 'CH') { // 5 = pátek
                    violations.push(`Vaněčková: Chybí CH služba v pátek (${day})`);
                }
            } else {
                // Kontrola zákazu NSK a CH pro ostatní
                if (shift === 'NSK' || shift === 'CH') {
                    violations.push(`${employee}: Nesmí mít ${shift} službu (pouze pro Vaněčkovou)`);
                }
            }
        });

        return violations;
    },

    // Uložení pravidel
    saveRules(rules) {
        this.generalRules = { ...this.generalRules, ...rules };
        localStorage.setItem('generalRules', JSON.stringify(this.generalRules));
    },

    // Načtení pravidel
    loadRules() {
        const savedRules = localStorage.getItem('generalRules');
        if (savedRules) {
            this.generalRules = JSON.parse(savedRules);
        }
    },

    // Kontrola všech pravidel
    validateAll(shifts, year, month) {
        const violations = [];
        const employees = EmployeeManager.getEmployeesList();

        // Kontrola pro každý den v měsíci
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const dayShifts = {};
            employees.forEach(employee => {
                const shift = shifts[`${employee}-${day}`];
                if (shift) {
                    dayShifts[employee] = shift;
                }
            });

            // Kontrola obsazení pro daný den
            const occupancyViolations = this.checkOccupancy(dayShifts, new Date(year, month - 1, day));
            violations.push(...occupancyViolations.map(v => `Den ${day}: ${v}`));
        }

        // Kontrola pravidel pro každého zaměstnance
        employees.forEach(employee => {
            const employeeViolations = EmployeeManager.checkEmployeeConstraints(employee, shifts, year, month);
            violations.push(...employeeViolations.map(v => `${employee}: ${v}`));

            const consecutiveViolations = this.checkConsecutiveShifts(shifts, employee);
            violations.push(...consecutiveViolations.map(v => `${employee}: ${v}`));
        });

        // Kontrola speciálních pravidel
        const specialViolations = this.checkSpecialRules(shifts, year, month);
        violations.push(...specialViolations);

        return violations;
    }
};

// Export pro použití v jiných modulech
window.RulesManager = RulesManager;
