let map;
let appState = {
    markers: null,
    latLng: null,
    radius: null,
    heading: null
};

/**
 * Draws the markers on the map.
 */
function drawMarkers() {
    if (map && appState.markers && appState.latLng && appState.radius) {
        appState.markers.clearLayers();
        // ADD CIRCLE HERE.


        // Draw a line representing current heading
        if (appState.heading !== null) {
            let bounds = circle.getBounds();
            let startPointLat = appState.latLng.lat - (bounds.getCenter().lat - bounds.getSouth()) * Math.cos(appState.heading);
            let startPointLng = appState.latLng.lng - (bounds.getCenter().lng - bounds.getEast()) * Math.sin(appState.heading);
            let endPointLat = appState.latLng.lat - (bounds.getCenter().lat - bounds.getSouth()) * 3 * Math.cos(appState.heading);
            let endPointLng = appState.latLng.lng - (bounds.getCenter().lng - bounds.getEast()) * 3 * Math.sin(appState.heading);

            LatLngsHeading = [
                [startPointLat, startPointLng],
                [endPointLat, endPointLng]
            ];
            appState.markers.addLayer(L.polyline(LatLngsHeading, {color: 'rgb(51, 136, 255)'}));
        }
    }
}

/**
 * Function to be called whenever a new position is available.
 * @param position The new position.
 */
function geoSuccess(position) {
    let lat = position.coords.latitude;
    let lng = position.coords.longitude;
    appState.latLng = L.latLng(lat, lng);
    appState.radius = position.coords.accuracy / 2;
    drawMarkers();

    if (map) {
        // SET THE MAP VIEW HERE.

    }
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

    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', function (eventData) {
            appState.heading = eventData.alpha * (Math.PI / 180);
            drawMarkers();
        }, false);
    } else {
        errMsg.text(errMsg.text() + "DeviceOrientation ist leider nicht verfügbar. ");
        errMsg.show();
    }

    // ADD MAP HERE.

    appState.markers = L.layerGroup();

    // ADD LAYER TO MAP.
}
