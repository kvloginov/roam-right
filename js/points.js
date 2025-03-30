const Points = {
    points: [],
    MAX_DISTANCE_TO_ROUTE: 0.0001, // approximately 10 meters
    currentRouteId: null,

    getAll() {
        return this.points;
    },

    setAll(newPoints) {
        this.points = newPoints;
    },

    isPointNearRoute(latlng) {
        const routes = Routes.getAll();
        if (routes.length === 0) return false;

        for (const route of routes) {
            for (let i = 0; i < route.points.length - 1; i++) {
                const start = route.points[i];
                const end = route.points[i + 1];
                
                // Calculate distance from point to route segment
                const distance = this.distanceToLineSegment(
                    latlng.lat, latlng.lng,
                    start[0], start[1],
                    end[0], end[1]
                );
                
                if (distance <= this.MAX_DISTANCE_TO_ROUTE) {
                    this.currentRouteId = route.id;
                    return true;
                }
            }
        }
        return false;
    },

    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    },

    addPoint(latlng, rating) {
        this.points.push({ 
            lat: latlng.lat, 
            lng: latlng.lng, 
            rating: rating,
            routeId: this.currentRouteId
        });
        Storage.saveData();
    },

    addRatedPoint(latlng) {
        if (!this.isPointNearRoute(latlng)) {
            alert('Point must be placed near a route!');
            return;
        }

        let rating = prompt(`Enter a "pleasantness" rating from 1 to 5 for the point (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}):`);
        rating = parseInt(rating);

        if (isNaN(rating) || rating < 1 || rating > 5) {
            alert('Invalid rating. Please enter a number from 1 to 5.');
            return;
        }

        const marker = L.marker(latlng).addTo(Map.map);
        marker.bindPopup(`Rating: ${rating}/5`).openPopup();

        this.addPoint(latlng, rating);
        UI.updateStatus(`Point with rating ${rating} added. Click again or finish adding.`);
    },

    redrawPoints() {
        this.points.forEach(point => {
            if (point && typeof point.lat === 'number' && typeof point.lng === 'number') {
                const marker = L.marker([point.lat, point.lng]).addTo(Map.map);
                marker.bindPopup(`Rating: ${point.rating || 'N/A'}/5`);
            }
        });
    }
};