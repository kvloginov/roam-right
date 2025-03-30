// Create a new class for gradient polyline
L.GradientPolyline = L.LayerGroup.extend({
    initialize: function(latlngs, options) {
        L.LayerGroup.prototype.initialize.call(this);
        this._latlngs = latlngs;
        this._options = options;
        this._gradientColors = options.gradientColors || [];
        this._segments = [];
        
        this._createSegments();
    },
    
    _createSegments: function() {
        // Clear existing segments
        this.clearLayers();
        this._segments = [];
        
        // Create segments
        if (this._latlngs.length < 2) {
            return; // Not enough points to draw a line
        }
        
        // Check if we have enough colors
        if (!this._gradientColors || this._gradientColors.length < this._latlngs.length) {
            console.warn("Not enough colors provided for all points. Using defaults.", 
                         this._gradientColors ? this._gradientColors.length : 0, 
                         "colors for", this._latlngs.length, "points");
            
            // Create a regular polyline as fallback
            const polyline = L.polyline(this._latlngs, {
                color: this._options.color || '#000000',
                weight: this._options.weight,
                opacity: this._options.opacity
            });
            this.addLayer(polyline);
            this._segments.push(polyline);
            return;
        }
        
        // Create a segment for each pair of points
        for (let i = 0; i < this._latlngs.length - 1; i++) {
            const color = this._gradientColors[i] || '#000000';
            const segment = L.polyline(
                [this._latlngs[i], this._latlngs[i + 1]], 
                {
                    color: color,
                    weight: this._options.weight,
                    opacity: this._options.opacity
                }
            );
            
            this.addLayer(segment);
            this._segments.push(segment);
        }
    },
    
    setStyle: function(style) {
        // Update style for all segments
        this._options = { ...this._options, ...style };
        this._segments.forEach((segment, i) => {
            const segmentStyle = { ...style };
            if (this._gradientColors && i < this._gradientColors.length) {
                segmentStyle.color = this._gradientColors[i];
            }
            segment.setStyle(segmentStyle);
        });
        return this;
    },
    
    setLatLngs: function(latlngs) {
        this._latlngs = latlngs;
        this._createSegments();
        return this;
    }
});

// Factory function
L.gradientPolyline = function(latlngs, options) {
    return new L.GradientPolyline(latlngs, options);
}; 