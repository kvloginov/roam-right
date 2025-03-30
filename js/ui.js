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
            li.innerHTML = `
                <span>Маршрут ${route.id.slice(0, 8)} (${route.points.length} точек)</span>
                <button class="select-route" data-route-id="${route.id}">Выбрать</button>
                <button class="delete-route" data-route-id="${route.id}">Удалить</button>
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