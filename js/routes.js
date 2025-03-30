const Routes = {
    routes: [],
    currentPolyline: null,
    currentRoutePoints: [],
    guideLine: null,

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
        this.guideLine = L.polyline([], { color: 'gray', dashArray: '5, 10' }).addTo(Map.map);

        UI.updateDrawButton('Finish Drawing');
        UI.toggleAddPointButton(true);
        UI.updateStatus('Drawing route: click on the map to add points.');
    },

    finishDrawing() {
        if (!Map.isDrawing || this.currentRoutePoints.length < 2) {
            if (this.currentPolyline) {
                Map.map.removeLayer(this.currentPolyline);
            }
            if (this.guideLine) {
                Map.map.removeLayer(this.guideLine);
            }
            this.resetDrawingState();
            UI.updateStatus('Drawing cancelled (minimum 2 points required). Start again.');
            return;
        }

        Map.isDrawing = false;

        this.routes.push(this.currentRoutePoints);
        Storage.saveData();

        if (this.guideLine) {
            Map.map.removeLayer(this.guideLine);
        }
        this.currentPolyline = null;
        this.currentRoutePoints = [];
        this.guideLine = null;

        this.resetDrawingState();
        UI.updateStatus(`Route added (${this.routes[this.routes.length - 1].length} points). You can now add ratings.`);
    },

    resetDrawingState() {
        Map.isDrawing = false;
        Map.isAddingPoints = false;
        if (this.guideLine) {
            Map.map.removeLayer(this.guideLine);
        }
        this.currentPolyline = null;
        this.currentRoutePoints = [];
        this.guideLine = null;
        UI.updateDrawButton('Start Drawing Route');
        UI.toggleAddPointButton(false);
    },

    addPointToRoute(latlng) {
        this.currentRoutePoints.push([latlng.lat, latlng.lng]);
        this.currentPolyline.addLatLng(latlng);
    },

    updateGuideLine(currentPoint, mouseLatLng) {
        if (this.guideLine) {
            this.guideLine.setLatLngs([currentPoint, mouseLatLng]);
        }
    },

    redrawRoutes() {
        this.routes.forEach(routeLatLngs => {
            if (routeLatLngs && routeLatLngs.length > 1) {
                L.polyline(routeLatLngs, { color: 'red' }).addTo(Map.map);
            }
        });
    }
};