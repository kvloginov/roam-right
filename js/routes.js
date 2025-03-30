const Routes = {
    routes: [],
    currentPolyline: null,
    currentRoutePoints: [],
    guideLine: null,
    currentRouteId: null,
    selectedRouteId: null,

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
        this.currentRouteId = uuid.v4();
        this.selectedRouteId = null;

        if (this.currentPolyline) {
            Map.map.removeLayer(this.currentPolyline);
            this.currentPolyline = null;
        }

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

        this.routes.push({
            id: this.currentRouteId,
            points: this.currentRoutePoints
        });
        Storage.saveData();

        if (this.guideLine) {
            Map.map.removeLayer(this.guideLine);
        }
        this.currentPolyline = null;
        this.currentRoutePoints = [];
        this.guideLine = null;
        this.currentRouteId = null;

        this.resetDrawingState();
        this.redrawRoutes();
        UI.updateRoutesList(this.routes);
        UI.updateStatus(`Route added (${this.routes[this.routes.length - 1].points.length} points). You can now add ratings.`);
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
        this.currentRouteId = null;
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

    selectRoute(routeId) {
        // Если выбираем тот же маршрут, что уже выбран - отменяем выбор
        if (this.selectedRouteId === routeId) {
            if (this.currentPolyline) {
                Map.map.removeLayer(this.currentPolyline);
                this.currentPolyline = null;
            }
            this.selectedRouteId = null;
            this.redrawRoutes();
            UI.updateStatus('Выбор маршрута отменен');
            return;
        }

        this.selectedRouteId = routeId;
        const route = this.routes.find(r => r.id === routeId);
        if (route) {
            // Очищаем предыдущий выбранный маршрут
            if (this.currentPolyline) {
                Map.map.removeLayer(this.currentPolyline);
            }
            
            // Отображаем выбранный маршрут
            this.currentPolyline = L.polyline(route.points, { color: 'blue', weight: 3 }).addTo(Map.map);
            UI.updateStatus(`Выбран маршрут ${routeId.slice(0, 8)}`);
        }
    },

    deleteRoute(routeId) {
        const index = this.routes.findIndex(r => r.id === routeId);
        if (index !== -1) {
            this.routes.splice(index, 1);
            Points.deletePointsByRouteId(routeId); // Удаляем все точки маршрута
            Storage.saveData();
            
            // Очищаем карту и перерисовываем маршруты и точки
            if (this.currentPolyline) {
                Map.map.removeLayer(this.currentPolyline);
                this.currentPolyline = null;
            }
            this.redrawRoutes();
            Points.redrawPoints(); // Перерисовываем оставшиеся точки
            UI.updateRoutesList(this.routes);
            UI.updateStatus(`Route ${routeId.slice(0, 8)} deleted`);
        }
    },

    redrawRoutes() {
        // Очищаем все существующие маршруты
        Map.map.eachLayer((layer) => {
            if (layer instanceof L.Polyline) {
                Map.map.removeLayer(layer);
            }
        });

        // Перерисовываем все маршруты
        this.routes.forEach(route => {
            if (route.points && route.points.length > 1) {
                const color = route.id === this.selectedRouteId ? 'blue' : 'red';
                const weight = route.id === this.selectedRouteId ? 3 : 1;
                L.polyline(route.points, { color, weight }).addTo(Map.map);
            }
        });
    }
};