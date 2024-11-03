import pandas as pd
import os
import json
from sqlalchemy import create_engine
import psycopg2

DBLOGIN_FILE = os.path.join("db_login.json")


def get_mean_value_from_table(col_name):
    """Compute mean_value of column <col_name>"""

    # initialize database connection
    def get_con():
        return psycopg2.connect(**LOGIN_DATA)

    # load dblogin from json file
    with open(DBLOGIN_FILE) as json_file:
        LOGIN_DATA = json.load(json_file)
    # create engine
    engine = create_engine("postgresql+psycopg2://", creator=get_con)

    print(LOGIN_DATA)

    # Read column from database
    table_one_column = pd.read_sql(f"SELECT {col_name} FROM flask_exercise.test_data", engine)
    # compute mean
    return table_one_column[col_name].mean()
