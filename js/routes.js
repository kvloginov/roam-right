const Routes = {
    routes: [],
    currentPolyline: null,
    currentRoutePoints: [],

    getAll() {
        return this.routes;
    },

    setAll(newRoutes) {
        this.routes = newRoutes;
    },

    startDrawing() {
        if (Map.isDrawing) return;

        Map.isDrawing = true;
        Map.isAddingPoints = false;
        this.currentRoutePoints = [];

        this.currentPolyline = L.polyline([], { color: 'blue' }).addTo(Map.map);

        UI.updateDrawButton('Завершить рисование');
        UI.toggleAddPointButton(true);
        UI.updateStatus('Рисование маршрута: кликайте по карте, чтобы добавить точки.');
    },

    finishDrawing() {
        if (!Map.isDrawing || this.currentRoutePoints.length < 2) {
            if (this.currentPolyline) {
                Map.map.removeLayer(this.currentPolyline);
            }
            this.resetDrawingState();
            UI.updateStatus('Рисование отменено (нужно минимум 2 точки). Начните заново.');
            return;
        }

        Map.isDrawing = false;

        this.routes.push(this.currentRoutePoints);
        Storage.saveData();

        this.currentPolyline = null;
        this.currentRoutePoints = [];

        this.resetDrawingState();
        UI.updateStatus(`Маршрут добавлен (${this.routes[this.routes.length - 1].length} точек). Теперь можно добавить оценки.`);
    },

    resetDrawingState() {
        Map.isDrawing = false;
        Map.isAddingPoints = false;
        this.currentPolyline = null;
        this.currentRoutePoints = [];
        UI.updateDrawButton('Начать рисовать маршрут');
        UI.toggleAddPointButton(false);
    },

    addPointToRoute(latlng) {
        this.currentRoutePoints.push([latlng.lat, latlng.lng]);
        this.currentPolyline.addLatLng(latlng);
    },

    redrawRoutes() {
        this.routes.forEach(routeLatLngs => {
            if (routeLatLngs && routeLatLngs.length > 1) {
                L.polyline(routeLatLngs, { color: 'red' }).addTo(Map.map);
            }
        });
    }
}; 