const Routes = {
    routes: [],
    currentPolyline: null,
    currentRoutePoints: [],
    guideLine: null,
    currentRouteId: null,
    selectedRouteId: null,

    init() {
        // Инициализация больше не нужна, так как мы будем использовать API напрямую
        console.log('Routes initialized');
    },

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

    async addPointToRoute(latlng) {
        if (this.currentRoutePoints.length === 0) {
            // Если это первая точка, просто добавляем её
            this.currentRoutePoints.push([latlng.lat, latlng.lng]);
            this.currentPolyline.addLatLng(latlng);
            return;
        }

        try {
            UI.updateStatus('Calculating route...');
            // Получаем последнюю точку маршрута
            const lastPoint = this.currentRoutePoints[this.currentRoutePoints.length - 1];
            
            // Формируем URL для запроса к OSRM API
            const url = `https://router.project-osrm.org/route/v1/driving/${lastPoint[1]},${lastPoint[0]};${latlng.lng},${latlng.lat}?overview=full&geometries=geojson`;
            
            // Получаем маршрут через API
            const response = await fetch(url);
            const route = await response.json();

            if (route.code === 'Ok' && route.routes && route.routes[0]) {
                // Получаем точки маршрута из GeoJSON
                const coordinates = route.routes[0].geometry.coordinates;
                const routePoints = coordinates.map(coord => [coord[1], coord[0]]);
                
                // Добавляем все точки маршрута
                routePoints.forEach(point => {
                    this.currentRoutePoints.push(point);
                    this.currentPolyline.addLatLng(point);
                });
                UI.updateStatus('Route calculated successfully');
            } else {
                // Если не удалось построить маршрут по улицам, добавляем прямую линию
                this.currentRoutePoints.push([latlng.lat, latlng.lng]);
                this.currentPolyline.addLatLng(latlng);
                UI.updateStatus('Could not find route along streets, using direct line');
            }
        } catch (error) {
            console.error('Error getting route:', error);
            // В случае ошибки добавляем прямую линию
            this.currentRoutePoints.push([latlng.lat, latlng.lng]);
            this.currentPolyline.addLatLng(latlng);
            UI.updateStatus('Error calculating route, using direct line');
        }
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