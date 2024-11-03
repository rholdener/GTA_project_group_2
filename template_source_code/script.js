function demo_javascript_method() {
    const url = 'http://localhost:8989/access_with_javascript'
    fetch(url)
        .then(response => response.json())
        .then(json => {
            console.log(json);
            document.getElementById("demo").innerHTML = JSON.stringify(json)
        })
}

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

// SOLUTION TASK 4
function decrease_value() {
    current_val = document.getElementById("number").innerHTML
    const url = 'http://localhost:8989/decrease_value?value=' + current_val
    fetch(url)
        .then(response => response.json())
        .then(json => {
            console.log(json);
            current_val = json;
            document.getElementById("number").innerHTML = JSON.stringify(json)
        })
}

// SOLUTION TASK 4
function increase_value() {
    current_val = document.getElementById("number").innerHTML
    const url = 'http://localhost:8989/increase_value?value=' + current_val
    fetch(url)
        .then(response => response.json())
        .then(json => {
            console.log(json);
            current_val = json;
            document.getElementById("number").innerHTML = JSON.stringify(json)
        })
}