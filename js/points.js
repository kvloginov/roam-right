const Points = {
    points: [],

    getAll() {
        return this.points;
    },

    setAll(newPoints) {
        this.points = newPoints;
    },

    addPoint(latlng, rating) {
        this.points.push({ lat: latlng.lat, lng: latlng.lng, rating: rating });
        Storage.saveData();
    },

    addRatedPoint(latlng) {
        let rating = prompt(`Введите оценку "приятности" от 1 до 5 для точки (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}):`);
        rating = parseInt(rating);

        if (isNaN(rating) || rating < 1 || rating > 5) {
            alert('Неверная оценка. Введите число от 1 до 5.');
            return;
        }

        const marker = L.marker(latlng).addTo(Map.map);
        marker.bindPopup(`Оценка: ${rating}/5`).openPopup();

        this.addPoint(latlng, rating);
        UI.updateStatus(`Точка с оценкой ${rating} добавлена. Кликните еще или завершите добавление.`);
    },

    redrawPoints() {
        this.points.forEach(point => {
            if (point && typeof point.lat === 'number' && typeof point.lng === 'number') {
                const marker = L.marker([point.lat, point.lng]).addTo(Map.map);
                marker.bindPopup(`Оценка: ${point.rating || 'N/A'}/5`);
            }
        });
    }
}; 