from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin  # needs to be installed via pip install flask-cors
import psycopg2
from psycopg2.extensions import AsIs
import json5
import random

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

    cur.execute("SELECT * FROM gta_p2.webapp_trajectory_point")
    data = cur.fetchall()
    print('Data fetched', data)

    conn.close()

    return jsonify(data), 200

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

if __name__ == '__main__':
    app.run(port=8989, debug=True)
