import os
import json
import tempfile

from sqlite3 import dbapi2 as sqlite3
from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash, send_from_directory, jsonify, Response, stream_with_context

import requests
from plexapi.myplex import MyPlexAccount
import json

# create our little application :)
app = Flask(__name__)
app.config.from_envvar("CONFIG")
plexpyapikey = app.config['PLEXPY_KEY']
plexpybaseurl = app.config['PLEXPY_URL']
app_root = app.root_path
def connect_db():
    """Connects to the specific database."""
    rv = sqlite3.connect('data/plexpy.db')
    rv.row_factory = sqlite3.Row
    return rv

def get_db():
    """Opens a new database connection if there is none yet for the
    current application context.
    """
    if not hasattr(g, 'sqlite_db'):
        g.sqlite_db = connect_db()
    return g.sqlite_db

def get_movies(db,username):
    movie_query = db.execute("SELECT * FROM 'session_history_metadata' LEFT JOIN session_history ON session_history_metadata.id=session_history.id  where session_history_metadata.media_type='movie'")
    movie_entries = movie_query.fetchall()
    movies={"name": "Movies",
            "size": 0}
    movies["children"] = []
#    print movie_entries
    temp_movies = {}
    for entry in movie_entries:
        genre = entry["genres"].split(';')[0]
        if genre == "":
           genre = "None"

        if entry["title"] not in temp_movies.keys():
            temp_movies[entry["title"]] = {}
            temp_movies[entry["title"]]["size"] = 0
            temp_movies[entry["title"]]["year"] = entry["year"]
            temp_movies[entry["title"]]["genre"] = genre
            temp_movies[entry["title"]]["watch"] = False
            temp_movies[entry["title"]]["key"] = entry["rating_key"]
        if username == entry["user"]:
            temp_movies[entry["title"]]["watch"] = True
        temp_movies[entry["title"]]["size"] += float(entry["stopped"] - entry["started"]) - float(entry["paused_counter"])
    final_movies = []

    for movie in temp_movies.keys():
        movies["children"].append({"name":   movie,
                                   "size":   temp_movies[movie]["size"],
                                   "genre":  temp_movies[movie]["genre"],
                                   "year":   temp_movies[movie]["year"],
                                   "watch":  temp_movies[movie]["watch"],
                                   "key": temp_movies[movie]["key"]})
        movies["size"] += temp_movies[movie]["size"]
    return movies

def get_tv(db,username):
    print "Getting TV"
    tv_query = db.execute("SELECT * FROM 'session_history_metadata' LEFT JOIN session_history ON session_history_metadata.id=session_history.id  where session_history_metadata.media_type='episode'")
    tv_entries = tv_query.fetchall()
    tv={"name": "TV Shows",
            "size": 0}
    tv["children"] = []
    temp = {}
    for entry in tv_entries:
        genre = entry["genres"].split(';')[0]
        if genre == "":
           genre = "None"
        if entry["grandparent_title"] not in temp.keys():
            temp[entry["grandparent_title"]] = {}
            temp[entry["grandparent_title"]]["size"] = 0
            temp[entry["grandparent_title"]]["year"] = entry["year"]
            temp[entry["grandparent_title"]]["genre"] = genre
            temp[entry["grandparent_title"]]["watch"] = False
            temp[entry["grandparent_title"]]["key"] = entry["grandparent_rating_key"]
        if username == entry["user"]:
            temp[entry["grandparent_title"]]["watch"] = True
        temp[entry["grandparent_title"]]["size"] += float(entry["stopped"] - entry["started"]) - float(entry["paused_counter"])

    for show in temp.keys():
        tv["children"].append({"name":   show,
                                   "size":   temp[show]["size"],
                                   "genre":  temp[show]["genre"],
                                   "year":   temp[show]["year"],
                                   "watch":  temp[show]["watch"],
                                   "key": temp[show]["key"]})
        tv["size"] += temp[show]["size"]
    return tv


@app.teardown_appcontext
def close_db(error):
    """Closes the database again at the end of the request."""
    if hasattr(g, 'sqlite_db'):
        g.sqlite_db.close()

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('js', path)

@app.route('/data/<path:path>')
def send_data(path):
    return send_from_directory('data', path)

@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('css', path)

@app.route('/')
def show_entries():
    username = ""
    if session.get('logged_in'):
        username = session['username']
        print("Logged In!")
        if "datafile" in session and os.path.isfile(app.root_path + session['datafile']):
            print "datafile exists"
            datafile = session['datafile']
        else:
            db = get_db()
            movies =  get_movies(db, username)
            tv = get_tv(db, username)
            output = { "loggedIn": True, "Movies": movies,"TV": tv}
            fs,datafile =  tempfile.mkstemp(dir='data/', suffix=".json")
            with open(datafile, 'w') as outfile:
                json.dump(output, outfile, indent=4)
            datafile = datafile.replace(app.root_path,"")
            session['datafile'] = datafile
    else:
        datafile = "/data/notLoggedIn.json"
        if not os.path.isfile(app.root_path + datafile):
            datafile = regen(force = True)
    return render_template('index.html',data=datafile)


@app.route('/regen')
def regen(force=False):
    username = ""
    if (session.get('logged_in') and session['username'] == app.config["ADMIN"]) or force:
        print("Logged In!")
        db = get_db()
        movies =  get_movies(db, username)
        tv = get_tv(db, username)
        output = { "loggedIn": False, "Movies": movies,"TV": tv}
        datafile = app.root_path + "/data/notLoggedIn.json"
        with open(datafile, 'w') as outfile:
            json.dump(output, outfile, indent=4)
        datafile = datafile.replace(app.root_path,"")
	if force:
            return datafile
        return render_template('index.html',data=datafile)
    else:
        abort(401)

@app.route('/test')
def testMeta():
    username = ""
    if session.get('logged_in') and session['username'] == app.config["ADMIN"]:
        print("Logged In!")
        db = get_db()
        movies =  get_movies(db, username)
        tv = get_tv(db, username)
        errors = []
        for show in tv["children"]:
            print "/metadata/"+ str(show["key"])
            r = requests.get(app.config['APP_URL'] + "metadata/" + str(show["key"]))
            if json.loads(r.json())["response"]["result"] == "error":
                errors.append([show["key"], show["name"], show["year"]])
                print "Error with " + str(show["key"]) + ". Expecting " + show["name"]
        for movie in movies["children"]:
            print "/metadata/"+ str(movie["key"])
            r = requests.get(app.config['APP_URL'] + "metadata/" + str(movie["key"]))
            if json.loads(r.json())["response"]["result"] == "error":
                errors.append([movie["key"], movie["name"], movie["year"]])  
                print "Error with " + str(movie["key"]) + ". Expecting " + movie["name"]
        for error in errors:
            print "Error with " + str(error[0]) + " Expecting " + error[1] + str(error[2])
        datafile = "/data/notLoggedIn.json"
        return render_template('index.html',data=datafile)
    else:
        abort(401)


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        try:
            account = MyPlexAccount.signin(request.form['username'], request.form['password'])
            session['username'] = account.username
            session['logged_in'] = True
            flash('You were logged in')
            return redirect(url_for('show_entries'))
        except:
            print("Login failed")
            return render_template('login.html', error="Login Failed")
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    try:
        os.remove(app.root_path + session['datafile'])
    except:
        print("File already removed?")
    session.pop('logged_in', None)
    session.pop('username', None)
    session.pop('datafile', None)
    flash('You were logged out')
    return redirect(url_for('show_entries'))

@app.route('/metadata/<ratingkey>')
def metadata(ratingkey=None):
    url = plexpybaseurl + "api/v2?apikey=" + plexpyapikey + "&cmd=get_metadata"
    r = requests.post(url, data={"rating_key": str(ratingkey), "media_info": True})
    if  r.json()["response"]["result"] == "error":
        print "Error with " + ratingkey
        print r.text
    return jsonify(json.dumps(r.json()))

@app.route('/art')
def art(ratingkey=None):
    link = request.args.get('link')
    width = request.args.get('width')
    height = request.args.get('height')
    url = plexpybaseurl + "api/v2?apikey=" + plexpyapikey + "&cmd=pms_image_proxy&img=" + link + "&width=" + width + "&height=" + height
    print(url)
    r = requests.get(url,stream=True)
    return Response(stream_with_context(r.iter_content(4096)), content_type = r.headers['content-type'])

if __name__ == "__main__":
    app.run(threaded=True)
