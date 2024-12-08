from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin  # needs to be installed via pip install flask-cors
import psycopg2
from psycopg2.extensions import AsIs
import json5
import random
import hashlib

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["https://air-pollution-gta.vercel.app", "null"], "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type"], "supports_credentials": True}})

# Endpoint to receive and store location data
@app.route('/test_deploy', methods=['GET'])
def test_deploy():
    return jsonify({'message': 'Hello World!'}), 200

@app.route('/', methods=['GET'])
def home():
    return jsonify('Connection established'), 200

@app.route('/test_data', methods=['GET'])
def test_data():
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
    trip_id = request.args.get('trip_id')

    with open('db_login.json', 'r') as file:
        db_credentials = json5.load(file)
    
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()

    cur.execute(
            """
            SELECT ST_X(geom) AS lng, ST_Y(geom) AS lat, ri_value, noise, distance
            FROM gta_p2.webapp_trajectory_point
            WHERE trip_id = %s
            """, 
            (trip_id,)
            )
    data = cur.fetchall()
    points = [{'lat': point[1], 'lng': point[0], 'ri_value': (point[2] + point[3] + point[4]) / 3} for point in data]

    conn.close()

    return jsonify({'points': points}), 200

@app.route('/calculate_ri', methods=['GET'])
def calculate_ri():
    
    try:
        lat, lng = float(request.args.get('lat')), float(request.args.get('lng'))


        with open('db_login.json', 'r') as file:
            db_credentials = json5.load(file)
        
        conn = psycopg2.connect(**db_credentials)
        cur = conn.cursor()

        # spatial query to get ri, noise, etc.
        cur.execute(
            """
            SELECT id, ST_DISTANCE(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326)) AS distance
            FROM trees
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint(%s, %s), 4326)
            LIMIT 1
            """,
            (lng, lat, lng, lat)
        )
        nearest_tree = cur.fetchone()

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
        

        #For now random values are returned
        r_i = random.randint(1, 100)

        data = {
            'ri': r_i,
            'noise': noise,
            'distance': nearest_tree[1]
        }

        return jsonify(data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/highest_trip_id', methods=['GET'])
def highest_trip_id():
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

@app.route('/all_paths', methods=['GET'])
def all_paths():
    try:
        user_id = request.args.get('user_id')

        with open('db_login.json', 'r') as file:
            db_credentials = json5.load(file)
        
        conn = psycopg2.connect(**db_credentials)
        cur = conn.cursor()

        cur.execute("SELECT trip_id, user_id FROM gta_p2.webapp_trip WHERE user_id = %s", (user_id,))
        result = cur.fetchall()

        trip_ids = [x[0] for x in result]

        data = []

        for trip_id in trip_ids:
            cur.execute(
            """
            SELECT ST_X(geom) AS lng, ST_Y(geom) AS lat, ri_value, noise, distance
            FROM gta_p2.webapp_trajectory_point
            WHERE trip_id = %s
            """, 
            (trip_id,)
            )
            trip_data = cur.fetchall()
            data.append({
            'trip_id': trip_id,
            'points': [{'lat': point[1], 'lng': point[0], 'ri_value': (point[2] + point[3] + point[4]) / 3} for point in trip_data]
            })

        conn.close()

        return jsonify({'data' : data}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400



def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

if __name__ == '__main__':
    app.run(port=8989, debug=True)


@app.route('/update_mean_ri', methods=["POST"])
def update_mean_ri():
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
