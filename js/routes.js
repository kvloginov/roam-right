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

        UI.updateDrawButton('Finish Drawing');
        UI.toggleAddPointButton(true);
        UI.updateStatus('Drawing route: click on the map to add points.');
    },

    finishDrawing() {
        if (!Map.isDrawing || this.currentRoutePoints.length < 2) {
            if (this.currentPolyline) {
                Map.map.removeLayer(this.currentPolyline);
            }
            this.resetDrawingState();
            UI.updateStatus('Drawing cancelled (minimum 2 points required). Start again.');
            return;
        }

        Map.isDrawing = false;

        this.routes.push(this.currentRoutePoints);
        Storage.saveData();

        this.currentPolyline = null;
        this.currentRoutePoints = [];

        this.resetDrawingState();
        UI.updateStatus(`Route added (${this.routes[this.routes.length - 1].length} points). You can now add ratings.`);
    },

    resetDrawingState() {
        Map.isDrawing = false;
        Map.isAddingPoints = false;
        this.currentPolyline = null;
        this.currentRoutePoints = [];
        UI.updateDrawButton('Start Drawing Route');
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