import numpy as np

import pyproj

from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin  # needs to be installed via pip install flask-cors

from backend import get_mean_value_from_table

app = Flask(__name__)
CORS(app, origins=["*", "null"])  # allowing any origin as well as localhost (null)


@app.route("/welcome_to_flask", methods=["GET"])
def welcome_to_flask():
    return jsonify("Welcome!")


@app.route("/arguments", methods=["GET"])
def working_with_arguments():
    my_argument = str(request.args.get("name", "default_name"))

    return jsonify(f"This is how we pass arguments in GET request. My name is {my_argument}")


@app.route("/add_numbers", methods=["GET"])
def add_numbers():
    input_value_1 = int(request.args.get("num1", 1))
    print(f"Received argument 1: {input_value_1}")
    input_value_2 = int(request.args.get("num2", 2))
    print(f"Received argument 2: {input_value_2}")
    new_value = input_value_1 + input_value_2
    return jsonify({"output": new_value})


@app.route("/access_with_javascript", methods=["GET"])
@cross_origin()
def javascript_demo():
    response = jsonify("This should be shown on your website")
    return response


@app.route("/using_post", methods=["POST"])
@cross_origin()
def using_post():
    user_profile = request.get_json(force=True)
    print(user_profile)
    output_text = f"The app received data from user {user_profile['username']} and password {user_profile['password']}"
    return jsonify(output_text)


# SOLUTION TASK 1)
@app.route("/round_float", methods=["GET"])
def round_float():
    input_value = float(request.args.get("value", np.pi))
    return jsonify({"rounded": round(input_value, 2)})


# SOLUTION TASK 2
@app.route("/project_coords", methods=["POST"])
def project_coords():
    list_of_values = request.get_json(force=True)
    lat = list_of_values[0]
    lon = list_of_values[1]
    fx, fy = pyproj.transform("EPSG:4326", "EPSG:2056", lat, lon)

    return jsonify({"projected_latitude": fx, "projected longitude": fy})


# SOLUTION TASK 3
@app.route("/project_coord_list", methods=["POST"])
def project_coord_list():
    list_of_coordinates = request.get_json(force=True)
    # get crs
    output_crs = str(request.args.get("crs", "EPSG:4326"))

    # iterate over coordinates and add the projected coordinates to a new list
    projected_list = []
    for coord_pair in list_of_coordinates:
        coord_pair_projected = pyproj.transform("EPSG:4326", output_crs, coord_pair[0], coord_pair[1])
        projected_list.append(coord_pair_projected)
    return jsonify(projected_list)


# SOLUTION TASK 4
@app.route("/decrease_value", methods=["GET"])
def decrease_value():
    input_value = float(request.args.get("value", 0))
    result = input_value - 1

    response = jsonify(result)
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response


# SOLUTION TASK 4
@app.route("/increase_value", methods=["GET"])
def increase_value():
    input_value = float(request.args.get("value", 0))
    result = input_value + 1

    response = jsonify(result)
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response


# SOLUTION TASK 5
@app.route("/compute_mean", methods=["GET"])
def compute_mean():
    # retrieve column name from the request arguments
    col_name = str(request.args.get("column_name", "value"))

    # call backend
    result = get_mean_value_from_table(col_name)

    # save results in a suitable format to output
    result = jsonify({"mean": result})
    return result


if __name__ == "__main__":
    # run
    app.run(debug=True, host="localhost", port=8989)
