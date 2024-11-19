let map;
let appState = {
    markers: null,
    latLng: null,
    radius: null,
    heading: null,
	name: null,
	time: null,
};

let wfs = 'https://baug-ikg-gis-01.ethz.ch:8443/geoserver/GTA24_lab06/wfs';


function drawMarkers() {
    if (map && appState.markers && appState.latLng && appState.radius) {
        appState.markers.clearLayers();
        let circle = L.circle(appState.latLng, {
            radius: appState.radius
        });
        appState.markers.addLayer(circle);

        if (appState.heading !== null) {
			let radius = circle.getBounds().getCenter().lat - circle.getBounds().getSouth();
            let startPointLat = appState.latLng.lat - radius * Math.cos(appState.heading);
            let startPointLng = appState.latLng.lng - radius * Math.sin(appState.heading);
            let endPointLat = appState.latLng.lat - radius * 3 * Math.cos(appState.heading);
            let endPointLng = appState.latLng.lng - radius * 3 * Math.sin(appState.heading);

            LatLngsHeading = [
                [startPointLat, startPointLng],
                [endPointLat, endPointLng]
            ];
            appState.markers.addLayer(L.polyline(LatLngsHeading, {color: 'rgb(255, 0, 0)'}));
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
    appState.time = formatTime(Date.now());
	drawMarkers();


    if (map) {
        map.setView(appState.latLng);
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

    map = L.map('map').setView([47.408375, 8.507669], 15);
    appState.markers = L.layerGroup();
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.addLayer(appState.markers);
}

// INSERT point
// REF: https://github.com/Georepublic/leaflet-wfs/blob/master/index.html#L201
function insertPoint(lat, lng, time) {
	let postData = 
		'<wfs:Transaction\n'
	  + '  service="WFS"\n'
	  + '  version="1.0.0"\n'
	  + '  xmlns="http://www.opengis.net/wfs"\n'
	  + '  xmlns:wfs="http://www.opengis.net/wfs"\n'
	  + '  xmlns:gml="http://www.opengis.net/gml"\n'
	  + '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n'
	  + '  xmlns:GTA24_lab06="https://www.gis.ethz.ch/GTA24_lab06" \n'
	  + '  xsi:schemaLocation="https://www.gis.ethz.ch/GTA24_lab06 \n https://baug-ikg-gis-01.ethz.ch:8443/geoserver/GTA24_lab06/wfs?service=WFS&amp;version=1.0.0&amp;request=DescribeFeatureType&amp;typeName=GTA24_lab06%3Awebapp_trajectory_point \n'
	  + '                      http://www.opengis.net/wfs\n'
	  + '                      https://baug-ikg-gis-01.ethz.ch:8443/geoserver/schemas/wfs/1.0.0/WFS-basic.xsd">\n'
	  + '  <wfs:Insert>\n'
	  + '    <GTA24_lab06:webapp_trajectory_point>\n'
	  + '      <point_id>123</point_id>\n'
	  + '      <trip_id>123</trip_id>\n'
	  + '      <ri_value>1</ri_value>\n'
	  + '      <time></time>\n'
	  + '      <geometry>\n'
	  + '        <gml:Point srsName="http://www.opengis.net/gml/srs/epsg.xml#4326">\n'
	  + '          <gml:coordinates xmlns:gml="http://www.opengis.net/gml" decimal="." cs="," ts=" ">'+lng+ ',' +lat+'</gml:coordinates>\n'
	  + '        </gml:Point>\n'
	  + '      </geometry>\n'
	  + '    </GTA24_lab06:webapp_trajectory_point>\n'
	  + '  </wfs:Insert>\n'
	  + '</wfs:Transaction>';
	
	$.ajax({
		method: "POST",
		url: wfs,
		dataType: "xml",
		contentType: "text/xml",
		data: postData,
		success: function() {	
			//Success feedback
			console.log("Success from AJAX, data sent to Geoserver");
			
			// Do something to notisfy user
			alert("Check if data is inserted into database");
		},
		error: function (xhr, errorThrown) {
			//Error handling
			console.log("Error from AJAX");
			console.log(xhr.status);
			console.log(errorThrown);
			console.log("Response text: ", xhr.responseText);  
		  }
	});
}


function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString(); // Konvertiert in ISO 8601 Format: yyyy-MM-ddTHH:mm:ss.sssZ
}


function get_location() {
	if (appState.latLng) {
        insertPoint(appState.latLng.lat, appState.latLng.lng, appState.time);
    }
}


let trackingInterval = null; // Variable zum Speichern des Intervalls

$('#start').click(function () {
	get_location()
});
