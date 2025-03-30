const Routes = {
    routes: [],
    currentPolyline: null,
    currentRoutePoints: [],
    guideLine: null,
    currentRouteId: null,
    selectedRouteId: null,
    currentRouteStats: { duration: 0, distance: 0 },
    GRADIENT_DISTANCE: 100, // meters

    getColorForRating(rating) {
        if (!rating) return '#000000'; // black for no rating
        const colors = {
            1: '#FF0000', // red
            2: '#FF6600', // orange
            3: '#FFFF00', // yellow
            4: '#00FF00', // green
            5: '#0000FF'  // blue
        };
        return colors[rating] || '#000000';
    },

    getGradientColor(point1, point2, distance, maxDistance) {
        const ratio = Math.min(distance / maxDistance, 1);
        return `rgba(0, 0, 0, ${1 - ratio})`;
    },

    calculateGradientColors(route, points) {
        const routePoints = route.points;
        const colors = [];
        
        // If no points, return black color
        if (!points || points.length === 0) {
            return routePoints.map(() => '#000000');
        }

        // For each route point, calculate its color based on nearby rating points
        for (let i = 0; i < routePoints.length; i++) {
            let totalWeight = 0;
            let r = 0, g = 0, b = 0;

            // Check each rating point
            for (const point of points) {
                const distance = this.distanceToPoint(routePoints[i], [point.lat, point.lng]);
                if (distance <= this.GRADIENT_DISTANCE) {
                    const weight = 1 - (distance / this.GRADIENT_DISTANCE);
                    const color = this.getColorForRating(point.rating);
                    
                    // Convert hex to RGB
                    const rgb = this.hexToRgb(color);
                    r += rgb.r * weight;
                    g += rgb.g * weight;
                    b += rgb.b * weight;
                    totalWeight += weight;
                }
            }

            if (totalWeight > 0) {
                // Normalize the color
                r = Math.round(r / totalWeight);
                g = Math.round(g / totalWeight);
                b = Math.round(b / totalWeight);
                colors.push(this.rgbToHex(r, g, b));
            } else {
                colors.push('#000000');
            }
        }

        return colors;
    },

    distanceToPoint(point1, point2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = point1[0] * Math.PI/180;
        const φ2 = point2[0] * Math.PI/180;
        const Δφ = (point2[0]-point1[0]) * Math.PI/180;
        const Δλ = (point2[1]-point1[1]) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
    },

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    init() {
        // No initialization needed as we're using direct API calls
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
        this.currentRouteStats = { duration: 0, distance: 0 };

        if (this.currentPolyline) {
            Map.map.removeLayer(this.currentPolyline);
            this.currentPolyline = null;
        }

        // Create initial polyline
        this.currentPolyline = L.polyline([], {
            weight: 2,
            color: '#0000FF',
            opacity: 1
        }).addTo(Map.map);
        
        this.guideLine = L.polyline([], { color: 'gray', dashArray: '5, 10' }).addTo(Map.map);

        UI.updateDrawButton('Finish Drawing');
        UI.toggleAddPointButton(true);
        UI.updateStatus('Drawing route: click on the map to add points.');
    },

    async finishDrawing() {
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
        UI.updateStatus('Calculating route statistics...');

        this.routes.push({
            id: this.currentRouteId,
            points: this.currentRoutePoints,
            duration: Math.round(this.currentRouteStats.duration / 60), // convert to minutes
            distance: Math.round(this.currentRouteStats.distance / 1000 * 10) / 10 // convert to kilometers
        });
        Storage.saveData();

        if (this.guideLine) {
            Map.map.removeLayer(this.guideLine);
        }
        this.currentPolyline = null;
        this.currentRoutePoints = [];
        this.guideLine = null;
        this.currentRouteId = null;
        this.currentRouteStats = { duration: 0, distance: 0 };

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
        this.currentRouteStats = { duration: 0, distance: 0 };
        UI.updateDrawButton('Start Drawing Route');
        UI.toggleAddPointButton(false);
    },

    async addPointToRoute(latlng) {
        if (this.currentRoutePoints.length === 0) {
            // If this is the first point, just add it
            this.currentRoutePoints.push([latlng.lat, latlng.lng]);
            this.currentPolyline.addLatLng(latlng);
            return;
        }

        try {
            UI.updateStatus('Calculating route...');
            // Get the last point of the route
            const lastPoint = this.currentRoutePoints[this.currentRoutePoints.length - 1];
            
            // Form URL for OSRM API request with pedestrian profile
            const coordinates = `${lastPoint[1]},${lastPoint[0]};${latlng.lng},${latlng.lat}`;
            const params = new URLSearchParams({
                overview: 'full',
                geometries: 'geojson'
            });
            const url = `https://router.project-osrm.org/route/v1/foot/${coordinates}?${params.toString()}`;
            
            console.log('Requesting route from:', url);
            
            // Get route from API
            const response = await fetch(url);
            const route = await response.json();
            
            console.log('OSRM API response:', route);

            if (route.code === 'Ok' && route.routes && route.routes[0]) {
                // Get route points from GeoJSON
                const coordinates = route.routes[0].geometry.coordinates;
                const routePoints = coordinates.map(coord => [coord[1], coord[0]]);
                
                // Add all route points
                routePoints.forEach(point => {
                    this.currentRoutePoints.push(point);
                    this.currentPolyline.addLatLng(point);
                });

                // Update route statistics
                this.currentRouteStats.duration += route.routes[0].duration;
                this.currentRouteStats.distance += route.routes[0].distance;

                // Show route information
                const duration = Math.round(this.currentRouteStats.duration / 60); // convert to minutes
                const distance = Math.round(this.currentRouteStats.distance / 1000 * 10) / 10; // convert to kilometers
                UI.updateStatus(`Route built: ${distance} km, approximately ${duration} minutes on foot`);
            } else {
                console.error('OSRM API error:', route.message || 'Unknown error');
                // If street route cannot be found, add a direct line
                this.currentRoutePoints.push([latlng.lat, latlng.lng]);
                this.currentPolyline.addLatLng(latlng);
                UI.updateStatus(`Could not find route along streets: ${route.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error getting route:', error);
            // In case of error, add a direct line
            this.currentRoutePoints.push([latlng.lat, latlng.lng]);
            this.currentPolyline.addLatLng(latlng);
            UI.updateStatus(`Error calculating route: ${error.message}`);
        }
    },

    updateGuideLine(currentPoint, mouseLatLng) {
        if (this.guideLine) {
            this.guideLine.setLatLngs([currentPoint, mouseLatLng]);
        }
    },

    selectRoute(routeId) {
        // If selecting the same route that's already selected - cancel selection
        if (this.selectedRouteId === routeId) {
            if (this.currentPolyline) {
                Map.map.removeLayer(this.currentPolyline);
                this.currentPolyline = null;
            }
            this.selectedRouteId = null;
            this.redrawRoutes();
            UI.updateRoutesList(this.routes);
            UI.updateStatus('Route selection cancelled');
            return;
        }

        this.selectedRouteId = routeId;
        const route = this.routes.find(r => r.id === routeId);
        if (route) {
            // Clear previous selected route
            if (this.currentPolyline) {
                Map.map.removeLayer(this.currentPolyline);
            }
            
            // Display selected route with gradient
            const routePoints = Points.getAll().filter(point => point.routeId === routeId);
            const colors = this.calculateGradientColors(route, routePoints);
            
            this.currentPolyline = L.gradientPolyline(route.points, {
                weight: 3,
                gradientColors: colors,
                opacity: 1
            }).addTo(Map.map);
            
            UI.updateRoutesList(this.routes);
            UI.updateStatus(`Selected route ${routeId.slice(0, 8)}`);
        }
    },

    deleteRoute(routeId) {
        const index = this.routes.findIndex(r => r.id === routeId);
        if (index !== -1) {
            this.routes.splice(index, 1);
            Points.deletePointsByRouteId(routeId); // Delete all route points
            Storage.saveData();
            
            // Clear map and redraw routes and points
            if (this.currentPolyline) {
                Map.map.removeLayer(this.currentPolyline);
                this.currentPolyline = null;
            }
            this.redrawRoutes();
            Points.redrawPoints(); // Redraw remaining points
            UI.updateRoutesList(this.routes);
            UI.updateStatus(`Route ${routeId.slice(0, 8)} deleted`);
        }
    },

    redrawRoutes() {
        // Clear all existing routes
        Map.map.eachLayer((layer) => {
            if (layer instanceof L.Polyline) {
                Map.map.removeLayer(layer);
            }
        });

        // Redraw all routes
        this.routes.forEach(route => {
            if (route.points && route.points.length > 1) {
                const routePoints = Points.getAll().filter(point => point.routeId === route.id);
                const colors = this.calculateGradientColors(route, routePoints);
                
                // Create gradient polyline
                const polyline = L.gradientPolyline(route.points, {
                    weight: route.id === this.selectedRouteId ? 3 : 2,
                    gradientColors: colors,
                    opacity: 1
                }).addTo(Map.map);
            }
        });
    }
};