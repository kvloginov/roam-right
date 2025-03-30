const Map = {
    map: null,
    isDrawing: false,
    isAddingPoints: false,
    CLICK_TOLERANCE: 0.0002, // approximately 20 meters

    init() {
        this.map = L.map('map').setView([51.1694, 71.4491], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.map);

        Routes.init();
        Storage.loadData();
        this.redrawMap();

        this.map.on('click', this.handleMapClick.bind(this));
        this.map.on('mousemove', this.handleMouseMove.bind(this));
        UI.updateStatus('Map loaded. Click "Start Drawing Route".');
    },

    isClickNearPoint(clickLatLng, pointLatLng) {
        const latDiff = Math.abs(clickLatLng.lat - pointLatLng.lat);
        const lngDiff = Math.abs(clickLatLng.lng - pointLatLng.lng);
        return latDiff <= this.CLICK_TOLERANCE && lngDiff <= this.CLICK_TOLERANCE;
    },

    isClickNearRoute(clickLatLng, routePoints) {
        for (let i = 0; i < routePoints.length - 1; i++) {
            const start = routePoints[i];
            const end = routePoints[i + 1];
            const distance = Points.distanceToLineSegment(
                clickLatLng.lat, clickLatLng.lng,
                start[0], start[1],
                end[0], end[1]
            );
            if (distance <= this.CLICK_TOLERANCE) {
                return true;
            }
        }
        return false;
    },

    handleMapClick(e) {
        const latlng = e.latlng;

        if (this.isDrawing && Routes.currentPolyline) {
            Routes.addPointToRoute(latlng).catch(error => {
                console.error('Error adding point to route:', error);
                UI.updateStatus('Error adding point to route. Please try again.');
            });
        } else if (this.isAddingPoints) {
            Points.addRatedPoint(latlng);
        } else {
            // Check if click is near any point
            const points = Points.getAll();
            let clickedNearPoint = false;
            for (const point of points) {
                if (this.isClickNearPoint(latlng, { lat: point.lat, lng: point.lng })) {
                    clickedNearPoint = true;
                    Points.selectPoint(point.id);
                    return;
                }
            }

            // Check if click is near any route
            const routes = Routes.getAll();
            let clickedNearRoute = false;
            for (const route of routes) {
                if (this.isClickNearRoute(latlng, route.points)) {
                    clickedNearRoute = true;
                    Routes.selectRoute(route.id);
                    return;
                }
            }

            // If click is not near any route or point, deselect current route and point
            if (!clickedNearPoint && !clickedNearRoute) {
                if (Points.selectedPointId) {
                    Points.selectPoint(Points.selectedPointId);
                }
                if (Routes.selectedRouteId) {
                    Routes.selectRoute(Routes.selectedRouteId);
                }
            }
        }
    },

    handleMouseMove(e) {
        if (this.isDrawing && Routes.currentRoutePoints.length > 0) {
            const lastPoint = Routes.currentRoutePoints[Routes.currentRoutePoints.length - 1];
            Routes.updateGuideLine(lastPoint, e.latlng);
        } else if (this.isAddingPoints) {
            // Show snapping point preview when adding points
            Points.isPointNearRoute(e.latlng);
        }
    },

    redrawMap() {
        // Clear previous layers (except base map)
        this.map.eachLayer(layer => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                this.map.removeLayer(layer);
            }
        });

        Routes.redrawRoutes();
        Points.redrawPoints();
        UI.updateRoutesList(Routes.getAll());
        
        // Enable Add Rating button if at least one route exists
        const routes = Routes.getAll();
        UI.toggleAddPointButton(routes.length === 0);
        
        UI.updateStatus(`Loaded ${Routes.getAll().length} routes and ${Points.getAll().length} ratings.`);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    Map.init();

    // Bind events to buttons
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
            UI.updateAddPointButton('Finish Adding Ratings');
            UI.toggleDrawButton(true);
            UI.updateStatus('Rating mode: click on the map to add a point.');
        } else {
            UI.updateAddPointButton('Add Rating');
            UI.toggleDrawButton(false);
            UI.updateStatus('Ready to draw or add ratings.');
        }
    });
    
    // Initialize Add Rating button state based on existing routes
    const routes = Routes.getAll();
    UI.toggleAddPointButton(routes.length === 0);
});