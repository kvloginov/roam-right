const UI = {
    updateStatus(message) {
        document.getElementById('status').textContent = message;
    },

    updateDrawButton(text) {
        document.getElementById('drawBtn').textContent = text;
    },

    updateAddPointButton(text) {
        document.getElementById('addPointBtn').textContent = text;
    },

    toggleDrawButton(disabled) {
        document.getElementById('drawBtn').disabled = disabled;
    },

    toggleAddPointButton(disabled) {
        document.getElementById('addPointBtn').disabled = disabled;
    },

    updateRoutesList(routes) {
        const routesList = document.getElementById('routesList');
        routesList.innerHTML = '';
        
        routes.forEach(route => {
            const li = document.createElement('li');
            const routePoints = Points.getAll().filter(point => point.routeId === route.id);
            const isSelected = route.id === Routes.selectedRouteId;
            
            li.innerHTML = `
                <div class="route-header ${isSelected ? 'selected' : ''}">
                    <span>Route ${route.id.slice(0, 8)} (${route.points.length} points)</span>
                    <span class="route-stats">${route.distance} km, ${route.duration} min</span>
                    <button class="select-route" data-route-id="${route.id}">Select</button>
                    <button class="delete-route" data-route-id="${route.id}">Delete</button>
                </div>
                <ul class="route-points">
                    ${routePoints.map(point => `
                        <li class="point-item ${point.id === Points.selectedPointId ? 'selected' : ''}" data-point-id="${point.id}">
                            <span>Rating: ${point.rating || 'N/A'}/5</span>
                            <span class="coordinates">(${point.lat ? point.lat.toFixed(4) : 'N/A'}, ${point.lng ? point.lng.toFixed(4) : 'N/A'})</span>
                            <div class="influence-control">
                                <label for="influence-${point.id}">Influence: <span class="influence-value">${point.influenceDistance || Routes.DEFAULT_INFLUENCE_DISTANCE}m</span></label>
                                <input type="range" id="influence-${point.id}" 
                                    class="influence-slider" 
                                    data-point-id="${point.id}"
                                    min="10" max="500" step="10" 
                                    value="${point.influenceDistance || Routes.DEFAULT_INFLUENCE_DISTANCE}">
                            </div>
                        </li>
                    `).join('')}
                </ul>
            `;
            routesList.appendChild(li);
        });

        // Add event handlers
        routesList.querySelectorAll('.select-route').forEach(button => {
            button.addEventListener('click', () => {
                const routeId = button.dataset.routeId;
                Routes.selectRoute(routeId);
            });
        });

        routesList.querySelectorAll('.delete-route').forEach(button => {
            button.addEventListener('click', () => {
                const routeId = button.dataset.routeId;
                Routes.deleteRoute(routeId);
            });
        });

        // Add click handlers for points
        routesList.querySelectorAll('.point-item').forEach(item => {
            item.addEventListener('click', () => {
                const pointId = item.dataset.pointId;
                Points.selectPoint(pointId);
            });
        });
        
        // Add event handlers for influence sliders
        routesList.querySelectorAll('.influence-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const pointId = e.target.dataset.pointId;
                const value = parseInt(e.target.value);
                const point = Points.points.find(p => p.id === pointId);
                
                if (point) {
                    point.influenceDistance = value;
                    e.target.parentNode.querySelector('.influence-value').textContent = `${value}m`;
                    Storage.saveData();
                    
                    // If the point's route is currently selected, redraw to update gradient
                    if (Routes.selectedRouteId === point.routeId) {
                        Routes.redrawRoutes();
                    }
                }
            });
        });

        // Scroll to selected route if exists
        const selectedRoute = routesList.querySelector('.route-header.selected');
        if (selectedRoute) {
            selectedRoute.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}; 