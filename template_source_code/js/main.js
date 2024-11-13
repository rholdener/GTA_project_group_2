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

// ------- WFS -------
	
	// button to upload data (add POI)
	$( "#uploadBtn" ).click(function() {
		formSubmit();
	});
	
	// For dialog form
	$("#fillInFormDiv").dialog({
		modal: true,
		autoOpen: false,
		height: 400,
		width: 350,
		close: function() {
			$("#fillInForm").trigger("reset");
			$(this).dialog("close");
		}
	});

	$("#fillInBtn").on("click", function() {
		$("#fillInForm").trigger("reset");
		$("#fillInFormDiv").dialog("open");
		$("#fillInFormDiv").parent().css('z-index',500);
	});

// INSERT point
// REF: https://github.com/Georepublic/leaflet-wfs/blob/master/index.html#L201
function insertPoint(lat, lng, name) {
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
	  + '      <lon>'+lng+'</lon>\n'
	  + '      <lat>'+lat+'</lat>\n'
	  + '      <name>'+name+'</name>\n'
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
		  }
	});
}

function get_location() {
	if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition((position) => {
					const latitude = position.coords.latitude;
					const longitude = position.coords.longitude;
					console.log("User's location:", latitude, longitude);
					
					// Send location to the backend
					send_location_to_backend(latitude, longitude);
			}, (error) => {
					console.error("Error getting location:", error);
			});
	} else {
			console.error("Geolocation is not supported by this browser.");
	}

	setInterval(get_location,10000)
}



// start funktion, die alle 10 sek aufegrufen wird
$('#start').click(function() {
	get_location()
})

// end funktion