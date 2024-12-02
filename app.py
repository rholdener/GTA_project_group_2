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
    """
    lat, lng = float(request.args.get('lat')), float(request.args.get('lng'))


    with open('db_login.json', 'r') as file:
        db_credentials = json5.load(file)
    
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()

    # spatial query to get ri, noise, etc.
    
    sql = "SELECT ri_data FROM gta_p2.data_polygons WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(%s, %s), 4326))"
    cur.execute(sql, (lng, lat))
    r_i = cur.fetchall()

    sql = "SELECT noise_data FROM gta_p2.data_polygons WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(%s, %s), 4326))"
    cur.execute(sql, (lng, lat))
    noise = cur.fetchall()

    sql = "SELECT min(ST_DISTANCE(geometry, ST_SetSRID(ST_MakePoint(%s, %s)))) FROM gta_p2.trees"
    cur.execute(sql, (lng, lat))
    distance = cur.fetchall()

    conn.close()
    """

    #For now random values are returned
    r_i = random.randint(1, 10)
    noise = random.randint(1, 10)
    distance = random.randint(1, 10)

    data = {
        'ri': r_i,
        'noise': noise,
        'distance': distance
    }

    return jsonify(data), 200

if __name__ == '__main__':
    app.run(port=8989, debug=True)
