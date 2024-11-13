import numpy as np

import pyproj

from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin  # needs to be installed via pip install flask-cors

from backend import get_mean_value_from_table

app = Flask(__name__)
CORS(app, origins=["*", "null"])  # allowing any origin as well as localhost (null)


if __name__ == "__main__":
    # run
    app.run(debug=True, host="localhost", port=8989)

# backend to store the locatoin data in a PostgreSQL database
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)

# PostgreSQL database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = (
    'postgresql://username:password@host:port/dbname'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Define Location model
class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

# Create tables
with app.app_context():
    db.create_all()

# Endpoint to receive and store location data
@app.route('/getLocation', methods=['POST'])
def getLocation():
    data = request.get_json()
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    if latitude is None or longitude is None:
        return jsonify({"status": "error", "message": "Invalid location data"}), 400
    
    # Store location data in the database
    new_location = Location(latitude=latitude, longitude=longitude)
    db.session.add(new_location)
    db.session.commit()
    
    return jsonify({"status": "success", "message": "Location data stored"}), 200

if __name__ == '__main__':
    app.run(port=8989, debug=True)
