function demo_get_ajax() {
    $.ajax({
        // URL to the Vercel production deployment (vercel --prod will give you this link)
        url: 'https://exercise-pearl.vercel.app/access_with_javascript',
        type: 'GET',
        dataType: 'JSON',
        success: function (data) { 
            console.log(data);
            document.getElementById("demo").innerHTML = JSON.stringify(data)
        },
        error: function (data) { console.log(data); },
    });
}

function demo_post_ajax() {
    var users = {
        username: "Gta_user",
        password: 1234
      };
    $.ajax({
        // URL to the Vercel production deployment (vercel --prod will give you this link)
        url: 'https://exercise-pearl.vercel.app/using_post',
        type: 'POST',
        dataType: 'JSON',
        data: JSON.stringify(users),
        success: function (data) { console.log(data);},
        error: function (data) { console.log(data); },
    });
}


// Function to send location data to the backend
function send_location_to_backend(latitude, longitude){
    const url = 'http://localhost:8989/getLocation'; // Update with your actual endpoint URL
    const data = {latitude: latitude, longitude: longitude};

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(json => {
        console.log("Location data sent successfully:", json);
    })
    .catch(error => {
        console.error("Error sending location data:", error);
    });

}

//Function to get the location
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
}

// get location every 10 seconds
setInterval(get_location,10000)