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