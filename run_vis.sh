#!/bin/bash
export CONFIG="config/plex_vis.cfg"

APP_DIR=`dirname $0`
export FLASK_APP=${APP_DIR}/plex_vis.py

flask run --host=0.0.0.0 --with-threads

