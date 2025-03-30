const Map = {
    map: null,
    isDrawing: false,
    isAddingPoints: false,

    init() {
        this.map = L.map('map').setView([51.1694, 71.4491], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.map);

        Storage.loadData();
        this.redrawMap();

        this.map.on('click', this.handleMapClick.bind(this));
        UI.updateStatus('Карта загружена. Нажмите "Начать рисовать маршрут".');
    },

    handleMapClick(e) {
        const latlng = e.latlng;

        if (this.isDrawing && Routes.currentPolyline) {
            Routes.addPointToRoute(latlng);
        } else if (this.isAddingPoints) {
            Points.addRatedPoint(latlng);
        }
    },

    redrawMap() {
        // Очищаем предыдущие слои (кроме базовой карты)
        this.map.eachLayer(layer => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                this.map.removeLayer(layer);
            }
        });

        Routes.redrawRoutes();
        Points.redrawPoints();
        UI.updateStatus(`Загружено ${Routes.getAll().length} маршрутов и ${Points.getAll().length} оценок.`);
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    Map.init();

    // Привязка событий к кнопкам
    document.getElementById('drawBtn').addEventListener('click', () => {
        if (Map.isDrawing) {
            Routes.finishDrawing();
        } else {
            Routes.startDrawing();
        }
    });

    document.getElementById('addPointBtn').addEventListener('click', () => {
        if (Map.isDrawing) return;

        Map.isAddingPoints = !Map.isAddingPoints;

        if (Map.isAddingPoints) {
            UI.updateAddPointButton('Завершить добавление оценок');
            UI.toggleDrawButton(true);
            UI.updateStatus('Режим добавления оценок: кликните на карте, чтобы поставить точку.');
        } else {
            UI.updateAddPointButton('Добавить оценку');
            UI.toggleDrawButton(false);
            UI.updateStatus('Готово к рисованию или добавлению оценок.');
        }
    });
}); 