#!/bin/bash
export CONFIG="config/plex_vis.cfg"

export FLASK_APP=plex_vis.py
flask run --host=0.0.0.0 --with-threads

