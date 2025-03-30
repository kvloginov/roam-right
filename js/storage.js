const Storage = {
    saveData() {
        try {
            const dataToSave = {
                routes: Routes.getAll(),
                points: Points.getAll()
            };
            localStorage.setItem('pleasantRoutesData', JSON.stringify(dataToSave));
            console.log('Данные сохранены в localStorage.');
        } catch (error) {
            console.error('Ошибка сохранения данных в localStorage:', error);
            UI.updateStatus('Ошибка сохранения данных!');
        }
    },

    loadData() {
        try {
            const savedData = localStorage.getItem('pleasantRoutesData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                Routes.setAll(parsedData.routes || []);
                Points.setAll(parsedData.points || []);
                console.log('Данные загружены из localStorage.');
            } else {
                console.log('Сохраненных данных не найдено.');
                Routes.setAll([]);
                Points.setAll([]);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных из localStorage:', error);
            UI.updateStatus('Ошибка загрузки сохраненных данных!');
            Routes.setAll([]);
            Points.setAll([]);
        }
    }
}; 