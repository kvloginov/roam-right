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
            
            li.innerHTML = `
                <div class="route-header">
                    <span>Route ${route.id.slice(0, 8)} (${route.points.length} points)</span>
                    <button class="select-route" data-route-id="${route.id}">Select</button>
                    <button class="delete-route" data-route-id="${route.id}">Delete</button>
                </div>
                <ul class="route-points">
                    ${routePoints.map(point => `
                        <li class="point-item">
                            <span>Rating: ${point.rating || 'N/A'}/5</span>
                            <span class="coordinates">(${point.lat ? point.lat.toFixed(4) : 'N/A'}, ${point.lng ? point.lng.toFixed(4) : 'N/A'})</span>
                        </li>
                    `).join('')}
                </ul>
            `;
            routesList.appendChild(li);
        });

        // Добавляем обработчики событий
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
    }
}; 