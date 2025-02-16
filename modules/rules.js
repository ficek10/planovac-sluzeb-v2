const RulesManager = {
    // Obecná pravidla
    generalRules: {
        minDayStaff: 4,
        minNightStaff: 1,
        maxConsecutiveShifts: 5,
        allowedNskDays: [2, 3, 8, 13],
        specialEmployee: "Vaněčková Dana"
    },

    // Kontrola obsazení služeb
    checkOccupancy(shifts, date) {
        const violations = [];
        const dayShifts = {
            R: 0,   // Ranní
            O: 0,   // Odpolední
            RO: 0,  // Ranní+Odpolední
            CH: 0   // Pro Vaněčkovou
        };
        const nightShifts = {
            N: 0,   // Noční
        };

        // Počítání směn
        Object.entries(shifts).forEach(([key, shift]) => {
            if (shift in dayShifts) {
                dayShifts[shift]++;
            }
            if (shift in nightShifts) {
                nightShifts[shift]++;
            }
        });

        // Základní kontrola denních směn
        const totalDayStaff = dayShifts.R + dayShifts.O + (dayShifts.RO * 2);
        if (totalDayStaff < this.generalRules.minDayStaff) {
            violations.push(`Nedostatečný počet denních služeb (${totalDayStaff}/${this.generalRules.minDayStaff})`);
        } else if (totalDayStaff > this.generalRules.minDayStaff) {
            violations.push(`Příliš mnoho denních služeb (${totalDayStaff}/${this.generalRules.minDayStaff})`);
        } else {
            // Kontrola správných kombinací pouze když je správný počet
            if (dayShifts.RO > 0) {
                // Kontrola kombinace s RO
                if (!(dayShifts.RO === 1 && dayShifts.R === 1 && dayShifts.O === 1)) {
                    violations.push('Při použití RO musí být kombinace: 1xRO + 1xR + 1xO');
                }
            } else {
                // Kontrola standardní kombinace
                if (!(dayShifts.R === 2 && dayShifts.O === 2)) {
                    violations.push('Bez RO musí být kombinace: 2xR + 2xO');
                }
            }
        }

        // Kontrola nočních směn
        const totalNightStaff = Object.values(nightShifts).reduce((a, b) => a + b, 0);
        if (totalNightStaff < this.generalRules.minNightStaff) {
            violations.push(`Nedostatečný počet nočních služeb (${totalNightStaff}/${this.generalRules.minNightStaff})`);
        } else if (totalNightStaff > this.generalRules.minNightStaff) {
            violations.push(`Příliš mnoho nočních služeb (${totalNightStaff}/${this.generalRules.minNightStaff})`);
        }

        return violations;
    },

    // Kontrola po sobě jdoucích směn
    checkConsecutiveShifts(shifts, employee) {
        const violations = [];
        let consecutive = 0;
        let lastShiftDay = 0;

        // Získání a seřazení směn zaměstnance
        const employeeShifts = Object.entries(shifts)
            .filter(([key]) => key.startsWith(employee))
            .sort((a, b) => {
                const dayA = parseInt(a[0].split('-')[1]);
                const dayB = parseInt(b[0].split('-')[1]);
                return dayA - dayB;
            });

        employeeShifts.forEach(([key, shift]) => {
            const currentDay = parseInt(key.split('-')[1]);
            
            if (shift && !['V', 'D'].includes(shift)) {
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
        
        Object.entries(shifts).forEach(([key, shift]) => {
            const [employee, day] = key.split('-');
            const dayNum = parseInt(day);
            
            if (employee === this.generalRules.specialEmployee) {
                // Kontrola NSK služeb
                if (shift === 'NSK' && !this.generalRules.allowedNskDays.includes(dayNum)) {
                    violations.push(`Vaněčková: NSK služba je ve špatný den (${day})`);
                }
                
                // Kontrola pátečních CH služeb
                const date = new Date(year, month - 1, dayNum);
                if (date.getDay() === 5 && shift !== 'CH') {
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

    // Validace všech pravidel
    validateAll(shifts, year, month) {
        try {
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

                const occupancyViolations = this.checkOccupancy(dayShifts, new Date(year, month - 1, day));
                violations.push(...occupancyViolations.map(v => `Den ${day}: ${v}`));
            }

            // Kontrola pravidel pro každého zaměstnance
            employees.forEach(employee => {
                const employeeViolations = EmployeeManager.checkEmployeeConstraints(employee, shifts, year, month);
                if (employeeViolations.length > 0) {
                    violations.push(...employeeViolations.map(v => `${employee}: ${v}`));
                }

                const consecutiveViolations = this.checkConsecutiveShifts(shifts, employee);
                if (consecutiveViolations.length > 0) {
                    violations.push(...consecutiveViolations.map(v => `${employee}: ${v}`));
                }
            });

            // Kontrola speciálních pravidel
            const specialViolations = this.checkSpecialRules(shifts, year, month);
            if (specialViolations.length > 0) {
                violations.push(...specialViolations);
            }

            return violations;
        } catch (error) {
            console.error('Chyba při validaci:', error);
            return [`Došlo k chybě při validaci: ${error.message}`];
        }
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
            try {
                this.generalRules = JSON.parse(savedRules);
            } catch (error) {
                console.error('Chyba při načítání pravidel:', error);
            }
        }
    }
};

// Export pro použití v jiných modulech
window.RulesManager = RulesManager;
