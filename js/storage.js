const Storage = {
    saveData() {
        try {
            const dataToSave = {
                routes: Routes.getAll(),
                points: Points.getAll()
            };
            localStorage.setItem('pleasantRoutesData', JSON.stringify(dataToSave));
            console.log('Data saved to localStorage.');
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
            UI.updateStatus('Error saving data!');
        }
    },

    loadData() {
        try {
            const savedData = localStorage.getItem('pleasantRoutesData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                Routes.setAll(parsedData.routes || []);
                Points.setAll(parsedData.points || []);
                console.log('Data loaded from localStorage.');
            } else {
                console.log('No saved data found.');
                Routes.setAll([]);
                Points.setAll([]);
            }
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            UI.updateStatus('Error loading saved data!');
            Routes.setAll([]);
            Points.setAll([]);
        }
    }
};