const Routes = {
    routes: [],
    currentPolyline: null,
    currentRoutePoints: [],
    guideLine: null,
    currentRouteId: null,
    selectedRouteId: null,
    currentRouteStats: { duration: 0, distance: 0 },
    DEFAULT_INFLUENCE_DISTANCE: 111, // meters - значение по умолчанию

    getColorForRating(rating) {
        if (!rating) return '#000000'; // black for no rating
        
        // Get color from CSS variable
        let color = getComputedStyle(document.documentElement)
            .getPropertyValue(`--rating-${rating}`)
            .trim();
            
        // If CSS variable not found or empty, use fallback colors
        if (!color) {
            const fallbackColors = {
                1: '#ff4444', // Red
                2: '#ff8c00', // Orange
                3: '#ffd700', // Yellow
                4: '#90ee90', // Light green
                5: '#32cd32'  // Green
            };
            color = fallbackColors[rating] || '#000000';
            console.warn(`CSS variable --rating-${rating} not found, using fallback: ${color}`);
        }
        
        console.log(`Rating ${rating} color: ${color}`);
        return color;
    },

    // Generate micro-segments of a route with approximately 1 meter segments
    createMicroSegments(routePoints) {
        const microSegments = [];
        
        for (let i = 0; i < routePoints.length - 1; i++) {
            const start = routePoints[i];
            const end = routePoints[i + 1];
            
            // Calculate the distance between these two points
            const distance = this.distanceToPoint(start, end);
            
            // Determine how many segments we need to create
            const segmentCount = Math.max(1, Math.ceil(distance));
            
            // For the first point in the route, add it to the microSegments
            if (i === 0) {
                microSegments.push({
                    point: start,
                    distance: 0,
                    leftDistance: null,
                    rightDistance: null,
                    rating: null
                });
            }
            
            // Create micro-segments between start and end
            for (let j = 1; j <= segmentCount; j++) {
                // If this is the last segment, use the exact end point
                if (j === segmentCount && i === routePoints.length - 2) {
                    microSegments.push({
                        point: end,
                        distance: distance / segmentCount,
                        leftDistance: null,
                        rightDistance: null,
                        rating: null
                    });
                } else if (j < segmentCount || i < routePoints.length - 2) {
                    // For intermediate points, interpolate
                    const ratio = j / segmentCount;
                    const lat = start[0] + (end[0] - start[0]) * ratio;
                    const lng = start[1] + (end[1] - start[1]) * ratio;
                    
                    microSegments.push({
                        point: [lat, lng],
                        distance: distance / segmentCount,
                        leftDistance: null,
                        rightDistance: null,
                        rating: null
                    });
                }
            }
        }
        
        return microSegments;
    },
    
    // Calculate total distances along microSegments
    calculateCumulativeDistances(microSegments) {
        let cumulativeDistance = 0;
        
        for (let i = 0; i < microSegments.length; i++) {
            microSegments[i].cumulativeDistance = cumulativeDistance;
            cumulativeDistance += microSegments[i].distance;
        }
        
        return microSegments;
    },
    
    // Find marker points and their positions along the route
    findMarkerPoints(microSegments, ratingPoints) {
        const markers = [];
        
        // For each rating point, find the closest micro-segment
        for (const point of ratingPoints) {
            let closestIdx = -1;
            let minDistance = Infinity;
            
            for (let i = 0; i < microSegments.length; i++) {
                const distance = this.distanceToPoint(microSegments[i].point, [point.lat, point.lng]);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIdx = i;
                }
            }
            
            // Get influence distance for this point or use default
            const influenceDistance = point.influenceDistance || this.DEFAULT_INFLUENCE_DISTANCE;
            
            // Only consider points that are close enough to the route
            if (closestIdx !== -1 && minDistance <= influenceDistance) {
                markers.push({
                    index: closestIdx,
                    distance: microSegments[closestIdx].cumulativeDistance,
                    rating: point.rating,
                    influenceDistance: influenceDistance
                });
            }
        }
        
        // Sort markers by their position along the route
        markers.sort((a, b) => a.distance - b.distance);
        
        return markers;
    },

    calculateGradientColors(route, points) {
        const routePoints = route.points;
        
        // If no points, return black color for all segments
        if (!points || points.length === 0) {
            return routePoints.map(() => '#000000');
        }
        
        console.log(`Calculating colors for ${routePoints.length} route points with ${points.length} rating points`);
        
        // Step 1: Create micro-segments of approximately 1 meter each
        const microSegments = this.createMicroSegments(routePoints);
        console.log(`Created ${microSegments.length} micro-segments`);
        
        // Step 2: Calculate cumulative distances for each segment
        this.calculateCumulativeDistances(microSegments);
        
        // Step 3 & 4: Find all markers with ratings along the route
        const markers = this.findMarkerPoints(microSegments, points);
        console.log(`Found ${markers.length} markers along the route:`, markers);
        
        // Step 5: Calculate distances from each micro-segment to the nearest markers (left and right)
        for (let i = 0; i < microSegments.length; i++) {
            // Find the nearest marker to the left
            let leftMarker = null;
            for (let j = markers.length - 1; j >= 0; j--) {
                if (markers[j].index < i) {
                    leftMarker = markers[j];
                    break;
                }
            }
            
            // Find the nearest marker to the right
            let rightMarker = null;
            for (let j = 0; j < markers.length; j++) {
                if (markers[j].index > i) {
                    rightMarker = markers[j];
                    break;
                }
            }
            
            // Calculate distances to nearest markers
            if (leftMarker) {
                microSegments[i].leftDistance = microSegments[i].cumulativeDistance - leftMarker.distance;
                microSegments[i].leftRating = leftMarker.rating;
                microSegments[i].leftMarkerIndex = leftMarker.index;
            }
            
            if (rightMarker) {
                microSegments[i].rightDistance = rightMarker.distance - microSegments[i].cumulativeDistance;
                microSegments[i].rightRating = rightMarker.rating;
                microSegments[i].rightMarkerIndex = rightMarker.index;
            }
        }
        
        // Step 6: Calculate rating and strength for each micro-segment
        for (let i = 0; i < microSegments.length; i++) {
            const segment = microSegments[i];
            
            // If we're directly on a marker
            if (markers.some(m => m.index === i)) {
                const marker = markers.find(m => m.index === i);
                segment.rating = marker.rating;
                segment.strength = 1.0; // 100% strength
                continue;
            }
            
            // Calculate rating based on left and right markers
            if (segment.leftDistance !== null && segment.rightDistance !== null) {
                // We're between two markers, interpolate
                const totalDistance = segment.leftDistance + segment.rightDistance;
                const leftWeight = 1 - (segment.leftDistance / totalDistance);
                const rightWeight = 1 - (segment.rightDistance / totalDistance);
                
                // Calculate weighted average of ratings
                segment.rating = (segment.leftRating * leftWeight + segment.rightRating * rightWeight) / 
                                (leftWeight + rightWeight);
                
                // Calculate strength based on how close we are to nearest marker
                const nearestDistance = Math.min(segment.leftDistance, segment.rightDistance);
                
                // Get influence distance from respective marker
                let influenceDistance = this.DEFAULT_INFLUENCE_DISTANCE;
                if (segment.leftDistance <= segment.rightDistance && markers.some(m => m.index === segment.leftMarkerIndex)) {
                    const leftMarker = markers.find(m => m.index === segment.leftMarkerIndex);
                    influenceDistance = leftMarker.influenceDistance;
                } else if (markers.some(m => m.index === segment.rightMarkerIndex)) {
                    const rightMarker = markers.find(m => m.index === segment.rightMarkerIndex);
                    influenceDistance = rightMarker.influenceDistance;
                }
                
                segment.strength = Math.max(0, 1 - (nearestDistance / influenceDistance));
            } else if (segment.leftDistance !== null) {
                // Only have marker to the left
                segment.rating = segment.leftRating;
                
                // Get influence distance from left marker
                let influenceDistance = this.DEFAULT_INFLUENCE_DISTANCE;
                if (markers.some(m => m.index === segment.leftMarkerIndex)) {
                    const leftMarker = markers.find(m => m.index === segment.leftMarkerIndex);
                    influenceDistance = leftMarker.influenceDistance;
                }
                
                segment.strength = Math.max(0, 1 - (segment.leftDistance / influenceDistance));
            } else if (segment.rightDistance !== null) {
                // Only have marker to the right
                segment.rating = segment.rightRating;
                
                // Get influence distance from right marker
                let influenceDistance = this.DEFAULT_INFLUENCE_DISTANCE;
                if (markers.some(m => m.index === segment.rightMarkerIndex)) {
                    const rightMarker = markers.find(m => m.index === segment.rightMarkerIndex);
                    influenceDistance = rightMarker.influenceDistance;
                }
                
                segment.strength = Math.max(0, 1 - (segment.rightDistance / influenceDistance));
            } else {
                // No markers nearby, use default
                segment.rating = null;
                segment.strength = 0;
            }
        }
        
        // Calculate colors for each micro-segment
        const microSegmentColors = [];
        const microSegmentPoints = [];
        
        for (let i = 0; i < microSegments.length; i++) {
            const segment = microSegments[i];
            microSegmentPoints.push(segment.point);
            
            // Determine the color based on the rating and strength
            let color = '#000000'; // Default is black
            
            if (segment.rating) {
                // For fractional ratings, interpolate between colors
                const lowerRating = Math.floor(segment.rating);
                const upperRating = Math.ceil(segment.rating);
                
                if (lowerRating === upperRating) {
                    // Exact rating
                    const ratingColor = this.getColorForRating(lowerRating);
                    
                    // Apply strength to color (fade to black with distance)
                    if (segment.strength < 1) {
                        const rgb = this.hexToRgb(ratingColor);
                        if (rgb) {
                            // Linear interpolation towards black based on strength
                            const r = Math.round(rgb.r * segment.strength);
                            const g = Math.round(rgb.g * segment.strength);
                            const b = Math.round(rgb.b * segment.strength);
                            color = this.rgbToHex(r, g, b);
                        } else {
                            color = ratingColor;
                        }
                    } else {
                        color = ratingColor;
                    }
                } else {
                    // Interpolate between ratings
                    const lowerColor = this.hexToRgb(this.getColorForRating(lowerRating));
                    const upperColor = this.hexToRgb(this.getColorForRating(upperRating));
                    
                    if (lowerColor && upperColor) {
                        const ratio = segment.rating - lowerRating;
                        
                        // Interpolate between colors
                        let r = Math.round(lowerColor.r + (upperColor.r - lowerColor.r) * ratio);
                        let g = Math.round(lowerColor.g + (upperColor.g - lowerColor.g) * ratio);
                        let b = Math.round(lowerColor.b + (upperColor.b - lowerColor.b) * ratio);
                        
                        // Apply strength
                        r = Math.round(r * segment.strength);
                        g = Math.round(g * segment.strength);
                        b = Math.round(b * segment.strength);
                        
                        color = this.rgbToHex(r, g, b);
                    }
                }
            }
            
            microSegmentColors.push(color);
        }
        
        console.log(`Generated ${microSegmentColors.length} colors for ${microSegmentPoints.length} micro-segments`);
        
        // Return both the points and colors for the micro-segments
        return {
            points: microSegmentPoints,
            colors: microSegmentColors
        };
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
            const { points: microPoints, colors: microColors } = this.calculateGradientColors(route, routePoints);
            
            console.log("Selected route micro-segments:", microPoints.length, "with colors:", microColors.length);
            
            this.currentPolyline = L.gradientPolyline(microPoints, {
                weight: 5,
                gradientColors: microColors,
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
            if (layer instanceof L.Polyline || layer instanceof L.LayerGroup) {
                Map.map.removeLayer(layer);
            }
        });

        // Redraw all routes
        this.routes.forEach(route => {
            if (route.points && route.points.length > 1) {
                const routePoints = Points.getAll().filter(point => point.routeId === route.id);
                const { points: microPoints, colors: microColors } = this.calculateGradientColors(route, routePoints);
                
                console.log("Route micro-segments:", microPoints.length, "with colors:", microColors.length);
                
                // Create gradient polyline using micro-segments
                const polyline = L.gradientPolyline(microPoints, {
                    weight: route.id === this.selectedRouteId ? 5 : 2,
                    gradientColors: microColors,
                    opacity: 1
                }).addTo(Map.map);
            }
        });
    }
};