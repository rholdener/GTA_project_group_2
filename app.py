from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin  # needs to be installed via pip install flask-cors
import psycopg2
from psycopg2.extensions import AsIs
import json5
import random
import hashlib
import math

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["https://air-pollution-gta.vercel.app", "null"], "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type"], "supports_credentials": True}})

# Endpoint to receive and store location data
@app.route('/test_deploy', methods=['GET'])
def test_deploy():
    """
    Funktion user to test the deployment of the app
    """
    return jsonify({'message': 'Hello World!'}), 200

@app.route('/', methods=['GET'])
def home():
    """
    function to test the connection to the server
    """
    return jsonify('Connection established'), 200

@app.route('/test_data', methods=['GET'])
def test_data():
    """
    function to test the connection to the server
    """
    with open('db_login.json', 'r') as file:
        db_credentials = json5.load(file)
    
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()

    cur.execute("SELECT * FROM gta_p2.webapp_user")
    print('Data fetched')
    data = cur.fetchall()

    conn.close()

    return jsonify(data), 200

@app.route('/point_history', methods=['GET'])
def point_history():
    """
    function to get all points of a trip
    """
    try:
        trip_id = request.args.get('trip_id')

        with open('db_login.json', 'r') as file:
            db_credentials = json5.load(file)
        
        conn = psycopg2.connect(**db_credentials)
        cur = conn.cursor()

        cur.execute(
                """
                SELECT ST_X(geometry) AS lng, ST_Y(geometry) AS lat, ri_value, noise_value, tree_count, pollution_value
                FROM gta_p2.webapp_trajectory_point
                WHERE trip_id = %s
                """, 
                (trip_id,)
                )
        data = cur.fetchall()
        points = [{'lat': point[1], 'lng': point[0], 'ri_value': point[2]} for point in data]


#hier schon einfach ri_value nehmen oder nicht??
#vorher: points = [{'lat': point[1], 'lng': point[0], 'ri_value': (point[2] + point[3] + point[4] + point[5]) / 4} for point in data]


        conn.close()

        return jsonify({'points': points}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/calculate_ri', methods=['GET'])
def calculate_ri():
    """
    Calculate the ri value, noise value and tree distance for a given location
    """
    
    try:
        lat, lng = float(request.args.get('lat')), float(request.args.get('lng'))


        with open('db_login.json', 'r') as file:
            db_credentials = json5.load(file)
        
        conn = psycopg2.connect(**db_credentials)
        cur = conn.cursor()


        # spatial query to get ri, noise, etc.

        #tree_count
        cur.execute(
            """
            SELECT COUNT(*)
            FROM trees
            WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326), 50)
            """,
            (lng, lat)
        )
        tree_count = cur.fetchone()[0]

        if tree_count > 284:
            tree_index = 100
        elif tree_count < 10:
            tree_index = 0
        else:
            tree_index = math.log(tree_count - 9, 275) * 100


        #noise
        cur.execute(
            """
            SELECT value
            FROM learm_data
            WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
            ORDER BY value DESC
            LIMIT 1
            """, 
            (lng, lat)
        )
        noise = cur.fetchone()

        if noise is not None:
            noise = noise[0]
        else:
            noise = 0

        conn.close()
        if noise < 25:
            noise_index = 100
        elif noise > 70:
            noise_index = 0
        else:
            noise_index = int(100 - math.exp((noise - 70) / 10) * 100) ##int??

        
        #pollution
        # cur.execute(
        #     """
        #     SELECT value
        #     FROM pollution_data
        #     WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
        #     ORDER BY value DESC
        #     LIMIT 1
        #     """, 
        #     (lng, lat)
        # )
        # pollution = cur.fetchone()

        # if pollution is not None:
        #     pollution = pollution[0]
        # else:
        #     pollution = 0

        # conn.close()
        # #hier noch anpassen!!
        # if pollution < 25:
        #     pollution_index = 999
        # elif pollution > 70:
        #     pollution_index = 999
        # else:
        #     pollution_index = 999
        
        pollution_index = 99

##      ri so berechnen?                                        ??
        r_i = (noise_index + tree_index + pollution_index)/3

        data = {
            'ri': r_i,
            'noise': noise_index,
            'trees': tree_index,
            'pollution': pollution_index,
        }

        return jsonify(data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/highest_trip_id', methods=['GET'])
def highest_trip_id():
    """
    Returns the highest trip_id in the database
    """
    with open('db_login.json', 'r') as file:
        db_credentials = json5.load(file)
    
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()

    cur.execute("SELECT MAX(trip_id) FROM gta_p2.webapp_trajectory_point")
    trip_id = cur.fetchall()

    conn.close()

    return jsonify(trip_id), 200

@app.route('/login', methods=['GET'])
def login():
    """
    Function to login a user
    """
    try:
        username = request.args.get('username')
        password = hash_password(request.args.get('password'))

        with open('db_login.json', 'r') as file:
            db_credentials = json5.load(file)
        
        conn = psycopg2.connect(**db_credentials)
        cur = conn.cursor()

        cur.execute("SELECT * FROM webapp_user WHERE name = %s", (username,))
        user = cur.fetchone()

        if user is None:
            return jsonify({'error': 'User not found'}), 400
        
        if user[2] != password:
            return jsonify({'error': 'Incorrect password'}), 400

        conn.close()

        return jsonify((user[0], user[1])), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/register', methods=['GET'])
def register():
    """
    Function to register a user
    """
    try:
        username = request.args.get('username')
        password = hash_password(request.args.get('password'))

        with open('db_login.json', 'r') as file:
            db_credentials = json5.load(file)
        
        conn = psycopg2.connect(**db_credentials)
        cur = conn.cursor()

        cur.execute("SELECT * FROM webapp_user WHERE name=%s", (username,))
        user = cur.fetchone()

        if user is not None:
            return jsonify({'error': 'User already exists'}), 400

        cur.execute("INSERT INTO webapp_user (name, password) VALUES (%s, %s)", (username, password))
        conn.commit()

        cur.execute("SELECT * FROM webapp_user WHERE name=%s", (username,))
        user = cur.fetchone()

        conn.close()

        return jsonify({'message': 'User registered successfully', 'user': (user[0], user[1])}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/insert_trip', methods=["GET"])
def insert_trip():
    """
    Function to insert a new trip into the database
    """

    try:
        trip_id = request.args.get('trip_id')
        user_id = request.args.get('user_id')

        with open('db_login.json', 'r') as file:
            db_credentials = json5.load(file)
        
        conn = psycopg2.connect(**db_credentials)
        cur = conn.cursor()

        cur.execute("INSERT INTO webapp_trip (trip_id, user_id) VALUES (%s, %s)", (trip_id, user_id))
        conn.commit()

        conn.close()

        return jsonify({'message': 'Trip inserted successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/get_trips', methods=['GET'])
def get_trips():
    try:
        user_id = request.args.get('user_id')

        with open('db_login.json', 'r') as file:
            db_credentials = json5.load(file)
        
        conn = psycopg2.connect(**db_credentials)
        cur = conn.cursor()

        cur.execute("SELECT trip_id FROM gta_p2.webapp_trip WHERE user_id = %s", (user_id,))
        trips = cur.fetchall()

        conn.close()

        return jsonify(trips), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 400

# @app.route('/all_paths', methods=['GET'])
# def all_paths():
#     """
#     Function to get all points of all trips of a user
#     """

#     try:
#         user_id = request.args.get('user_id')

#         with open('db_login.json', 'r') as file:
#             db_credentials = json5.load(file)
        
#         conn = psycopg2.connect(**db_credentials)
#         cur = conn.cursor()

#         cur.execute("SELECT trip_id, user_id FROM gta_p2.webapp_trip WHERE user_id = %s", (user_id,))
#         result = cur.fetchall()

#         trip_ids = [x[0] for x in result]

#         data = []

#         for trip_id in trip_ids:
#             cur.execute(
#             """
#             SELECT ST_X(geometry) AS lng, ST_Y(geometry) AS lat, ri_value, noise_value, tree_count, pollution_value
#             FROM gta_p2.webapp_trajectory_point
#             WHERE trip_id = %s
#             """, 
#             (trip_id,)
#             )
#             trip_data = cur.fetchall()
#             data.append({
#             'trip_id': trip_id,
#             'points': [{'lat': point[1], 'lng': point[0], 'ri_value': (point[2] + point[3] + point[4] + point[5]) / 4} for point in trip_data]
#             })


#         conn.close()

#         return jsonify({'data' : data}), 200
    
#     except Exception as e:
#         return jsonify({'error': str(e)}), 400



def hash_password(password):
    """
    Function to hash a password
    """
    return hashlib.sha256(password.encode()).hexdigest()


@app.route('/update_mean_ri', methods=["POST"])
def update_mean_ri():
    """
    Function to update the mean_ri of a trip
    """
    try:
        trip_id = request.json.get('trip_id')
        mean_ri = request.json.get('mean_ri')

        with open('db_login.json', 'r') as file:
            db_credentials = json5.load(file)
        
        conn = psycopg2.connect(**db_credentials)
        cur = conn.cursor()

        cur.execute("UPDATE webapp_trip SET mean_ri = %s WHERE trip_id = %s", (mean_ri, trip_id))
        conn.commit()

        conn.close()

        return jsonify({'message': 'mean_ri updated successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/city_ri', methods=['GET'])
def city_ri():
    """
    Function to get the mean ri value of a city
    """
    try:
        with open('db_login.json', 'r') as file:
            db_credentials = json5.load(file)
        
        conn = psycopg2.connect(**db_credentials)
        cur = conn.cursor()

        cur.execute("SELECT AVG(mean_ri) FROM webapp_trip")
        ri = float(cur.fetchone()[0])
        conn.close()

        return jsonify({'ri': ri}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(port=8989, debug=True)