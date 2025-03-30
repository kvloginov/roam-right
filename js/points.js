const Points = {
    points: [],
    MAX_DISTANCE_TO_ROUTE: 0.0005, // approximately 50 meters
    currentRouteId: null,
    snappingPoint: null,
    snappingMarker: null,
    selectedPointId: null,

    getAll() {
        return this.points;
    },

    setAll(newPoints) {
        // Ensure all points have IDs
        this.points = newPoints.map(point => {
            if (!point.id) {
                return { ...point, id: uuid.v4() };
            }
            return point;
        });
    },

    selectPoint(pointId) {
        // If selecting the same point that's already selected - cancel selection
        if (this.selectedPointId === pointId) {
            this.selectedPointId = null;
            this.redrawPoints();
            // Deselect the route if it was selected by this point
            const point = this.points.find(p => p.id === pointId);
            if (point && point.routeId === Routes.selectedRouteId) {
                Routes.selectRoute(point.routeId);
            }
            UI.updateRoutesList(Routes.getAll());
            return;
        }

        this.selectedPointId = pointId;
        const point = this.points.find(p => p.id === pointId);
        if (point) {
            // Only select the route if it's different from the currently selected route
            if (point.routeId !== Routes.selectedRouteId) {
                Routes.selectRoute(point.routeId);
            }
            this.redrawPoints();
            UI.updateRoutesList(Routes.getAll());
        }
    },

    isPointNearRoute(latlng) {
        const routes = Routes.getAll();
        if (routes.length === 0) return false;

        let minDistance = Infinity;
        let closestPoint = null;
        let closestRouteId = null;

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
                
                if (distance <= this.MAX_DISTANCE_TO_ROUTE && distance < minDistance) {
                    minDistance = distance;
                    closestPoint = this.getClosestPointOnSegment(
                        latlng.lat, latlng.lng,
                        start[0], start[1],
                        end[0], end[1]
                    );
                    closestRouteId = route.id;
                }
            }
        }

        if (closestPoint) {
            this.currentRouteId = closestRouteId;
            this.snappingPoint = closestPoint;
            
            // Remove previous snapping marker if exists
            if (this.snappingMarker) {
                Map.map.removeLayer(this.snappingMarker);
            }
            
            // Add new snapping marker
            this.snappingMarker = L.marker(closestPoint, {
                icon: L.divIcon({
                    className: 'snapping-point',
                    html: '×',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(Map.map);
            
            return true;
        }
        
        return false;
    },

    getClosestPointOnSegment(px, py, x1, y1, x2, y2) {
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

        return [xx, yy];
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
        const pointId = uuid.v4();
        this.points.push({ 
            id: pointId,
            lat: latlng[0], 
            lng: latlng[1], 
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

        // Remove snapping marker
        if (this.snappingMarker) {
            Map.map.removeLayer(this.snappingMarker);
            this.snappingMarker = null;
        }

        // Add marker at the snapping point
        const marker = L.marker(this.snappingPoint).addTo(Map.map);
        marker.bindPopup(`Rating: ${rating}/5`).openPopup();

        this.addPoint(this.snappingPoint, rating);
        UI.updateRoutesList(Routes.getAll());
        UI.updateStatus(`Point with rating ${rating} added. Click again or finish adding.`);
    },

    redrawPoints() {
        // Clear all existing markers
        Map.map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                Map.map.removeLayer(layer);
            }
        });

        // Create marker icons
        const defaultIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-inner"></div>',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        });

        const selectedIcon = L.divIcon({
            className: 'custom-marker selected',
            html: '<div class="marker-inner"></div>',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        });

        // Redraw all points
        this.points.forEach(point => {
            if (point && typeof point.lat === 'number' && typeof point.lng === 'number') {
                const marker = L.marker([point.lat, point.lng], {
                    data: { 
                        pointId: point.id,
                        rating: point.rating || 1
                    },
                    icon: point.id === this.selectedPointId ? selectedIcon : defaultIcon
                }).addTo(Map.map);
                
                // Set the rating data attribute for color
                marker.getElement().setAttribute('data-rating', point.rating || 1);
                
                marker.bindPopup(`Rating: ${point.rating || 'N/A'}/5`);
                
                // Add click handler for point selection
                marker.on('click', () => {
                    this.selectPoint(point.id);
                });
            }
        });
    },

    deletePointsByRouteId(routeId) {
        this.points = this.points.filter(point => point.routeId !== routeId);
        Storage.saveData();
    }
};