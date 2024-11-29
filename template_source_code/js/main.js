let map;
let appState = {
    markers: null,
    latLng: null,
    radius: null,
    heading: null,
	time: null,
	trip_id: null,
    pointHistory: [],
    points: null,
};


let wfs = 'https://baug-ikg-gis-01.ethz.ch:8443/geoserver/GTA24_lab06/wfs';
let app_url = 'https://gta-project-group-2.vercel.app/';
let timer = null;


function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString(); // Konvertiert in ISO 8601 Format: yyyy-MM-ddTHH:mm:ss.sssZ
}


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

            let LatLngsHeading = [
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
        let desiredZoom = 15; 
        map.setView(appState.latLng, desiredZoom); 
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

    map = L.map('map').setView([46.82, 8.22], 8);
    appState.markers = L.layerGroup();
    appState.points = L.layerGroup();

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    map.addLayer(appState.markers);
    map.addLayer(appState.points); 

	  // Button-Event-Handler registrieren
	$("#start").click(startTracking);
    $("#end").click(stopTracking).hide(); // End-Button zu Beginn verstecken
    $("#mean_ri").hide();
}


function getColorByRI(riValue) {
    if (riValue < 2) return 'blue';   // Sehr gut
    if (riValue < 4) return 'green';  // Gut
    if (riValue < 6) return 'yellow'; // Mittel
    if (riValue < 8) return 'orange'; // Schlecht
    return 'red';                     // Sehr schlecht
}

function interpolateColor(color1, color2, factor) {
    // Interpoliert zwei Farben, z.B. #FF0000 und #00FF00
    const hexToRgb = hex => {
        const bigint = parseInt(hex.slice(1), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };

    const rgbToHex = ([r, g, b]) => {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);

    const result = [
        Math.round(c1[0] + factor * (c2[0] - c1[0])),
        Math.round(c1[1] + factor * (c2[1] - c1[1])),
        Math.round(c1[2] + factor * (c2[2] - c1[2]))
    ];

    return rgbToHex(result);
}


function drawColoredLine() {
    if (appState.pointHistory.length < 2) {
        return; // Es gibt keine Punkte, zwischen denen eine Linie gezeichnet werden kann
    }

    appState.points.clearLayers(); // Alte Layer entfernen

    for (let i = 0; i < appState.pointHistory.length - 1; i++) {
        let currentPoint = appState.pointHistory[i];
        let nextPoint = appState.pointHistory[i + 1];

        // Berechne Farben der Punkte
        let currentColor = getColorByRI(currentPoint.ri_value || 5);
        let nextColor = getColorByRI(nextPoint.ri_value || 5);

        // Anzahl der Segmente für die Interpolation (z.B. 10 für feineren Verlauf)
        let segments = 10;

        let segmentLatLngs = [];
        for (let j = 0; j <= segments; j++) {
            let factor = j / segments; // Interpolationsfaktor
            let lat = currentPoint.lat + factor * (nextPoint.lat - currentPoint.lat);
            let lng = currentPoint.lng + factor * (nextPoint.lng - currentPoint.lng);
            segmentLatLngs.push([lat, lng]);

            if (j > 0) {
                let color = interpolateColor(currentColor, nextColor, factor);

                // Zeichne die Linie für diesen Abschnitt
                let segmentLine = L.polyline(
                    [segmentLatLngs[j - 1], segmentLatLngs[j]],
                    { color: color, weight: 5, opacity: 0.8 }
                );
                appState.points.addLayer(segmentLine);
            }
        }

        // Markiere den Startpunkt mit seiner Farbe
        let startPointMarker = L.circleMarker([currentPoint.lat, currentPoint.lng], {
            radius: 2,
            color: currentColor,
            fillColor: currentColor,
            fillOpacity: 0.8
        }).bindPopup(`RI: ${currentPoint.ri_value}`);
        appState.points.addLayer(startPointMarker);

        // Markiere den Endpunkt (als separate Markierung oder Teil der nächsten Iteration)
        if (i === appState.pointHistory.length - 2) {
            let endPointMarker = L.circleMarker([nextPoint.lat, nextPoint.lng], {
                radius: 2,
                color: nextColor,
                fillColor: nextColor,
                fillOpacity: 0.8
            }).bindPopup(`RI: ${nextPoint.ri_value}`);
            appState.points.addLayer(endPointMarker);
        }
    }

    map.addLayer(appState.points); // Den Layer der Karte hinzufügen
}

// INSERT point
// REF: https://github.com/Georepublic/leaflet-wfs/blob/master/index.html#L201
function insertPoint(lat, lng, time, trip_id, ri_value) {
    return new Promise((resolve, reject) => {
	let postData = `<wfs:Transaction
			  service="WFS"
			  version="1.0.0"
			  xmlns="http://www.opengis.net/wfs"
			  xmlns:wfs="http://www.opengis.net/wfs"
			  xmlns:gml="http://www.opengis.net/gml"
			  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
			  xmlns:GTA24_lab06="https://www.gis.ethz.ch/GTA24_lab06"
			  xsi:schemaLocation="
				  https://www.gis.ethz.ch/GTA24_lab06
				  https://baug-ikg-gis-01.ethz.ch:8443/geoserver/GTA24_lab06/wfs?service=WFS&amp;version=1.0.0&amp;request=DescribeFeatureType&amp;typeName=GTA24_lab06%3Awebapp_trajectory_point
				  http://www.opengis.net/wfs
				  https://baug-ikg-gis-01.ethz.ch:8443/geoserver/schemas/wfs/1.0.0/WFS-basic.xsd">
			  <wfs:Insert>
				  <GTA24_lab06:webapp_trajectory_point>
					  <point_id>101010101</point_id>
					  <trip_id>${trip_id}</trip_id>
					  <ri_value>${ri_value}</ri_value>
					  <time>${time}</time>
					  <geometry>
						  <gml:Point srsName="http://www.opengis.net/gml/srs/epsg.xml#4326">
							  <gml:coordinates xmlns:gml="http://www.opengis.net/gml" decimal="." cs="," ts=" ">${lng},${lat}</gml:coordinates>
						  </gml:Point>
					  </geometry>
				  </GTA24_lab06:webapp_trajectory_point>
			  </wfs:Insert>
		  </wfs:Transaction>`;
	
	$.ajax({
		method: "POST",
		url: wfs,
		dataType: "xml",
		contentType: "text/xml",
		data: postData,
		success: function() {	
			//Success feedback
			console.log("Success from AJAX, data sent to Geoserver");

            let point = L.circleMarker([lat, lng], {
                radius: 2,
                color: "black",
                fillColor: "black",
                fillOpacity: 0.8
            }).bindPopup(`Trip ID: ${trip_id}<br>RI Value: ${ri_value}<br>Time: ${time}`);
            appState.points.addLayer(point);

            

           // Wenn es bereits einen vorherigen Punkt gibt, zeichnen wir eine Linie
           if (appState.pointHistory.length > 0) {
            let lastPoint = appState.pointHistory[appState.pointHistory.length - 1];
            let latLngs = [
                [lastPoint.lat, lastPoint.lng],  // Letzter Punkt
                [lat, lng]                       // Neuer Punkt
            ];

            // Polyline (Linie) zwischen den Punkten zeichnen
            let polyline = L.polyline(latLngs, { color: 'black' }).addTo(appState.points);
        }

        // Den aktuellen Punkt zur Historie hinzufügen
        appState.pointHistory.push({ lat: lat, lng: lng, ri_value: ri_value });
        resolve(); // Promise auflösen

        
    },

		error: function (xhr, errorThrown) {
			//Error handling
			console.log("Error from AJAX");
			console.log(xhr.status);
			console.log(errorThrown);
			console.log("Response text: ", xhr.responseText);  
		  }
	});
});
}



function fetchHighestTripId(callback) {
    let query = `
        <wfs:GetFeature 
            service="WFS" 
            version="1.1.0" 
            outputFormat="application/json" 
            xmlns:wfs="http://www.opengis.net/wfs" 
            xmlns:ogc="http://www.opengis.net/ogc">
            <wfs:Query typeName="GTA24_lab06:webapp_trajectory_point" srsName="EPSG:4326">
                <ogc:SortBy>
                    <ogc:SortProperty>
                        <ogc:PropertyName>trip_id</ogc:PropertyName>
                        <ogc:SortOrder>DESC</ogc:SortOrder>
                    </ogc:SortProperty>
                </ogc:SortBy>
                <ogc:MaxFeatures>1</ogc:MaxFeatures>
            </wfs:Query>
        </wfs:GetFeature>
    `;

    $.ajax({
        method: "POST",
        url: wfs,
        contentType: "text/xml",
        dataType: "json",
        data: query,
        success: function (data) {
            let highestTripId = 0;
            if (data.features && data.features.length > 0) {
                highestTripId = parseInt(data.features[0].properties.trip_id, 10);
            }
            callback(highestTripId + 1);
        },
        error: function (xhr, status, error) {
            console.error("Fehler beim Abrufen der höchsten Trip-ID:", error);
            callback(1); // Fallback auf 1, falls es keine Einträge gibt.
        }
    });
}


// Tracking start
function startTracking() {
    
    if (!appState.latLng) {
        // Fehlernachricht anzeigen
        let errMsg = $("#error-messages"); // Stelle sicher, dass dieses Element existiert
        errMsg.text("Bitte warten Sie, bis Ihre Position geladen wurde.");
        errMsg.show();
        return; // Funktion abbrechen
    }

    let ri_value = 7; // hier RI-Wert anpassen oder berechnen

    insertPoint(appState.latLng.lat, appState.latLng.lng, appState.time, appState.trip_id, ri_value);

    if (timer) {
        clearInterval(timer);
    }

    // Abrufen der nächsten Trip-ID
    fetchHighestTripId(function (nextTripId) {
        appState.trip_id = nextTripId; // Nächste aufsteigende Trip-ID

        if (map && appState.latLng) {
            map.setView(appState.latLng, 15); // Fokussiere und zoome auf Level 15
        }

        timer = setInterval(() => {
            if (appState.latLng && appState.time) {
                
                //fetch(`${app_url}calculate_ri?lat=${appState.latLng.lat}&lng=${appState.latLng.lng}`)
                //.then(response => response.json())
                //.then(data => {
                   // ri_value = data.ri_value;
                //})

                insertPoint(appState.latLng.lat, appState.latLng.lng, appState.time, appState.trip_id, ri_value);
            }
        }, 10000);  // Alle 10 Sekunden

        // Buttons umschalten
        $("#start").hide(); // Versteckt den "Start"-Button
        $("#end").show();   // Zeigt den "End"-Button
        $("#mean_ri").hide();
    });
}

// Tracking stop
function stopTracking() {

    let ri_value = 7; // hier RI-Wert anpassen oder berechnen

    // Letzten Punkt einfügen und nach Abschluss die Linie zeichnen
    insertPoint(appState.latLng.lat, appState.latLng.lng, appState.time, appState.trip_id, ri_value)
        .then(() => {
            // drawColoredLine erst nach erfolgreichem Insert aufrufen
            drawColoredLine();

            // Berechnung des Durchschnitts (mean_ri)
            if (appState.pointHistory.length > 0) {
                let mean_ri = appState.pointHistory.reduce((sum, point) => sum + (point.ri_value || 0), 0) / appState.pointHistory.length;
                $("#mean_ri_value").text(mean_ri.toFixed(2));
            }

            // Buttons umschalten
            $("#start").show(); // Zeigt den "Start"-Button
            $("#end").hide();   // Versteckt den "End"-Button
            $("#mean_ri").show();
        })
        .catch(error => {
            console.error("Fehler beim Stop-Tracking:", error);
        });

    clearInterval(timer);
    timer = null;
}