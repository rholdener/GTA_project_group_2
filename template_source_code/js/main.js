let map;
let appState = {
    markers: null
};

/**
 * Draws the markers on the map.
 */
function drawMarkers() {
    if (map && appState.markers) {
        appState.markers.clearLayers();
        // READ trackpoints FROM LocalStorage HERE.
        // for (let tp of ...) {
            // let circle = L.circle(..., {
            //     radius: ...
            // });
            // appState.markers.addLayer(circle);
        // }
    }
}

/**
 * Function to be called whenever a new position is available.
 * @param position The new position.
 */
function geoSuccess(position) {
    let lat = position.coords.latitude;
    let lng = position.coords.longitude;
    latLng = L.latLng(lat, lng);
    radius = position.coords.accuracy / 2;
    time = Date.now();

    // Store the recorded locations in the LocalStorage.
    if ('trackpoints' in localStorage) {
        // TAKE EXISTING LIST FROM LocalStorage, AND APPEND NEW POSITION.

    } else {
        // STORE A NEW LIST IN LocalStorage HERE.
        
    }

    if (map) {
        map.setView(latLng);
    }

    drawMarkers();
}

/**
 * Function to be called if there is an error raised by the Geolocation API.
 * @param error Describing the error in more detail.
 */
function geoError(error) {
    let errMsg = $("#error-messages");
    errMsg.text(errMsg.text() + "Fehler beim Abfragen der Position (" + error.code + "): " + error.message + " ");
    errMsg.show();
}

let geoOptions = {
    enableHighAccuracy: true,
    maximumAge: 15000,  // The maximum age of a cached location (15 seconds).
    timeout: 12000   // A maximum of 12 seconds before timeout.
};

// CATCH THE BUTTON CLICK FOR THE DOWNLOAD HERE

/**
 * The onload function is called when the HTML has finished loading.
 */
function onload() {
    let errMsg = $("#error-messages");

    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(geoSuccess, geoError, geoOptions);
    } else {
        errMsg.text(errMsg.text() + "Geolocation is leider auf diesem Gerät nicht verfügbar. ");
        errMsg.show();
    }

    map = L.map('map').setView([47.408375, 8.507669], 15);
    appState.markers = L.layerGroup();
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.addLayer(appState.markers);
}
