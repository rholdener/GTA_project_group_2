from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin  # needs to be installed via pip install flask-cors
import psycopg2
from psycopg2.extensions import AsIs
import json5

app = Flask(__name__)
CORS(app, origins=["*", "null"])  # allowing any origin as well as localhost (null)

# Endpoint to receive and store location data
@app.route('/test_deploy', methods=['GET'])
def test_deploy():
    return jsonify({'message': 'Hello World!'}), 200

@app.route('/', methods=['GET'])
def home():
    return jsonify('Connection established'), 200

@app.route('/test_data', methods=['GET'])
def test_data():
    with open('template_source_code/db_login.json', 'r') as file:
        db_credentials = json5.load(file)
    
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()

    cur.execute("SELECT * FROM gta_p2.webapp_user")
    print('Data fetched')
    data = cur.fetchall()

    conn.close()

    return jsonify(data), 200

@app.route('/calculate_ri', methods=['GET'])
def calculate_ri():
    lat, lng = int(request.args.get('lat')), int(request.args.get('lng'))

    with open('template_source_code/db_login.json', 'r') as file:
        db_credentials = json5.load(file)
    
    conn = psycopg2.connect(**db_credentials)
    cur = conn.cursor()

    # spatial query to get ri, noise, etc.
    sql = "SELECT ri_data FROM gta_p2.data_polygons WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(%s, %s), 4326))"
    cur.execute(sql, (lng, lat))

    data = cur.fetchall()
    conn.close()

    # modify data

    return jsonify(data), 200

if __name__ == '__main__':
    app.run(port=8989, debug=True)
