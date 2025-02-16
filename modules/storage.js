// modules/storage.js
const Storage = {
    // Uložení dat
    saveData: async (key, data) => {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(key, jsonData);
            return true;
        } catch (error) {
            console.error('Chyba při ukládání dat:', error);
            return false;
        }
    },

    // Načtení dat
    loadData: async (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Chyba při načítání dat:', error);
            return null;
        }
    },

    // Vytvoření klíče pro měsíční služby
    getMonthKey: (year, month) => {
        return `shifts_${year}_${month}`;
    },

    // Uložení služeb pro konkrétní měsíc
    saveMonthShifts: async (year, month, shifts) => {
        const key = Storage.getMonthKey(year, month);
        return Storage.saveData(key, shifts);
    },

    // Načtení služeb pro konkrétní měsíc
    loadMonthShifts: async (year, month) => {
        const key = Storage.getMonthKey(year, month);
        return Storage.loadData(key);
    },

    // Vymazání služeb pro konkrétní měsíc
    clearMonthShifts: async (year, month) => {
        const key = Storage.getMonthKey(year, month);
        localStorage.removeItem(key);
    }
};

// Export pro použití v jiných modulech
window.Storage = Storage;
