// modules/employees.js
const EmployeeManager = {
    // Seznam zaměstnanců a jejich pravidel
    employees: {
        "Kolářová Hana": { maxNights: 0, maxRO: 4, canNights: false, minFreeWeekends: 2 },
        "Králová Martina": { maxNights: 2, maxRO: 1, canNights: true, minFreeWeekends: 2 },
        "Vaněčková Dana": { maxNights: 0, maxRO: 0, canNights: false, minFreeWeekends: 2, specialRules: true },
        "Vaňková Vlaďena": { maxNights: 5, maxRO: 4, canNights: true, minFreeWeekends: 2 },
        "Vrkoslavová Irena": { maxNights: 5, maxRO: 4, canNights: true, minFreeWeekends: 1 },
        "Dianová Kristýna": { maxNights: 5, maxRO: 1, canNights: true, minFreeWeekends: 2 },
        "Dráb David": { maxNights: 5, maxRO: 1, canNights: true, minFreeWeekends: 2 },
        "Šáchová Kateřina": { maxNights: 5, maxRO: 4, canNights: true, minFreeWeekends: 2 },
        "Krejčová Zuzana": { maxNights: 2, maxRO: 1, canNights: true, minFreeWeekends: 2 },
        "Dráb Filip": { maxNights: 0, maxRO: 4, canNights: false, minFreeWeekends: 2 },
        "Růžek Přízemí": { maxNights: 31, maxRO: 0, canNights: true, minFreeWeekends: 0 }
    },

    // Získání seznamu zaměstnanců
    getEmployeesList() {
        return Object.keys(this.employees).filter(name => !this.employees[name].isFloor);
    },

    // Získání pravidel pro zaměstnance
    getEmployeeRules(employeeName) {
        return this.employees[employeeName] || null;
    },

    // Aktualizace pravidel zaměstnance
    updateEmployeeRules(employeeName, rules) {
        if (this.employees[employeeName]) {
            this.employees[employeeName] = { ...this.employees[employeeName], ...rules };
            return true;
        }
        return false;
    },

    // Kontrola omezení pro zaměstnance
    checkEmployeeConstraints(employeeName, shifts, year, month) {
        const rules = this.employees[employeeName];
        if (!rules) return [];

        const violations = [];
        let nightCount = 0;
        let roCount = 0;
        let freeWeekends = 0;

        // Procházení všech dnů v měsíci
        const daysInMonth = new Date(year, month, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const shift = shifts[`${employeeName}-${day}`];
            
            // Počítání nočních
            if (shift === 'N' || shift === 'NSK') {
                nightCount++;
            }
            
            // Počítání RO služeb
            if (shift === 'RO') {
                roCount++;
            }

            // Kontrola víkendů
            if (this.isWeekend(new Date(year, month - 1, day))) {
                if (day < daysInMonth && 
                    !shifts[`${employeeName}-${day}`] && 
                    !shifts[`${employeeName}-${day + 1}`]) {
                    freeWeekends++;
                }
            }
        }

        // Kontrola pravidel
        if (nightCount > rules.maxNights) {
            violations.push(`Překročen limit nočních služeb (${nightCount}/${rules.maxNights})`);
        }

        if (roCount > rules.maxRO) {
            violations.push(`Překročen limit RO služeb (${roCount}/${rules.maxRO})`);
        }

        if (!rules.canNights && nightCount > 0) {
            violations.push('Zaměstnanec nemůže mít noční služby');
        }

        if (freeWeekends < rules.minFreeWeekends) {
            violations.push(`Nedostatek volných víkendů (${freeWeekends}/${rules.minFreeWeekends})`);
        }

        return violations;
    },

    // Pomocná funkce pro kontrolu víkendu
    isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6;
    }
};

// Export pro použití v jiných modulech
window.EmployeeManager = EmployeeManager;
