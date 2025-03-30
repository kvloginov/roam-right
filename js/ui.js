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
    }
}; 