// Create a new class for gradient polyline
L.GradientPolyline = L.Polyline.extend({
    initialize: function(latlngs, options) {
        L.Polyline.prototype.initialize.call(this, latlngs, options);
        this._gradientColors = options.gradientColors || [];
        this._segments = [];
    },

    _createSegments: function() {
        if (!this._gradientColors || this._gradientColors.length === 0) return;
        
        // Clear existing segments
        this._segments.forEach(segment => {
            if (segment && segment.parentNode) {
                segment.parentNode.removeChild(segment);
            }
        });
        this._segments = [];

        // Create segments between each pair of points
        for (let i = 0; i < this._latlngs.length - 1; i++) {
            const start = this._latlngs[i];
            const end = this._latlngs[i + 1];
            const startColor = this._gradientColors[i];
            const endColor = this._gradientColors[i + 1];

            // Create a polyline for this segment
            const segment = L.polyline([start, end], {
                color: startColor,
                weight: this.options.weight,
                opacity: this.options.opacity
            }).addTo(this._map);

            this._segments.push(segment);
        }
    },

    onAdd: function(map) {
        this._map = map;
        this._createSegments();
    },

    onRemove: function(map) {
        // Remove all segments
        this._segments.forEach(segment => {
            if (segment && segment.parentNode) {
                segment.parentNode.removeChild(segment);
            }
        });
        this._segments = [];
    },

    setLatLngs: function(latlngs) {
        this._latlngs = latlngs;
        this._createSegments();
        return this;
    },

    setStyle: function(style) {
        // Update style for all segments
        this._segments.forEach(segment => {
            segment.setStyle(style);
        });
        return this;
    }
});

// Factory function
L.gradientPolyline = function(latlngs, options) {
    return new L.GradientPolyline(latlngs, options);
}; 