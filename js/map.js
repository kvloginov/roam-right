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
        this.map.on('mousemove', this.handleMouseMove.bind(this));
        UI.updateStatus('Map loaded. Click "Start Drawing Route".');
    },

    handleMapClick(e) {
        const latlng = e.latlng;

        if (this.isDrawing && Routes.currentPolyline) {
            Routes.addPointToRoute(latlng);
        } else if (this.isAddingPoints) {
            Points.addRatedPoint(latlng);
        }
    },

    handleMouseMove(e) {
        if (this.isDrawing && Routes.currentRoutePoints.length > 0) {
            const lastPoint = Routes.currentRoutePoints[Routes.currentRoutePoints.length - 1];
            Routes.updateGuideLine(lastPoint, e.latlng);
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
});