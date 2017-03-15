import os
import json
import tempfile
from sqlite3 import dbapi2 as sqlite3
from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash, send_from_directory

from plexapi.myplex import MyPlexAccount

# create our little application :)
app = Flask(__name__)
app.secret_key = 'A0Zr98j/3yX R~XHH!jmN]LWX/,adsa123edaadas?RT'

def connect_db():
    """Connects to the specific database."""
    rv = sqlite3.connect('plexpy.db')
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
            temp_movies[entry["title"]]["watch"] = "False"
            temp_movies[entry["title"]]["rating"] = entry["content_rating"]
        if username == entry["user"]:
            temp_movies[entry["title"]]["watch"] = "True"
        temp_movies[entry["title"]]["size"] += float(entry["stopped"] - entry["started"]) - float(entry["paused_counter"])
    final_movies = []

    for movie in temp_movies.keys():
        movies["children"].append({"name":   movie,
                                   "size":   temp_movies[movie]["size"],
                                   "genre":  temp_movies[movie]["genre"],
                                   "year":   temp_movies[movie]["year"],
                                   "watch":  temp_movies[movie]["watch"],
                                   "rating": temp_movies[movie]["rating"]})
        movies["size"] += temp_movies[movie]["size"]
    return movies

def get_tv(db,username):
    print "Getting TV"
    tv_query = db.execute("SELECT * FROM 'session_history_metadata' LEFT JOIN session_history ON session_history_metadata.id=session_history.id  where session_history_metadata.media_type='episode'")
    tv_entries = tv_query.fetchall()
    tv={"name": "TV Shows",
            "size": 0}
    tv["children"] = []
#    print movie_entries
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
            temp[entry["grandparent_title"]]["watch"] = "False"
            temp[entry["grandparent_title"]]["rating"] = entry["content_rating"]
        if username == entry["user"]:
            temp[entry["grandparent_title"]]["watch"] = "True"
        temp[entry["grandparent_title"]]["size"] += float(entry["stopped"] - entry["started"]) - float(entry["paused_counter"])

    for show in temp.keys():
        tv["children"].append({"name":   show,
                                   "size":   temp[show]["size"],
                                   "genre":  temp[show]["genre"],
                                   "year":   temp[show]["year"],
                                   "watch":  temp[show]["watch"],
                                   "rating": temp[show]["rating"]})
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
        if "datafile" in session:
            datafile = session['datafile']
        else:
            db = get_db()
            movies =  get_movies(db, username)
            tv = get_tv(db, username)
            output = { "Movies": movies,"TV": tv}
            fs,datafile =  tempfile.mkstemp(dir='data/', suffix=".json")
            with open(datafile, 'w') as outfile:
                json.dump(output, outfile, indent=4)
            datafile = datafile.replace("/root/plex_cluster/plex_vis","")
            session['datafile'] = datafile
    else:
        datafile = "/data/notLoggedIn.json"
    return render_template('index.html',data=datafile)


@app.route('/add', methods=['POST'])
def add_entry():
    if not session.get('logged_in'):
        abort(401)
    db = get_db()
    db.execute('insert into movie_entries (title, text) values (?, ?)',
               [request.form['title'], request.form['text']])
    db.commit()
    flash('New entry was successfully posted')
    return redirect(url_for('show_entries'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        account = MyPlexAccount.signin(request.form['username'], request.form['password'])
        session['username'] = account.username
        session['logged_in'] = True
        flash('You were logged in')
        return redirect(url_for('show_entries'))
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    session.pop('datafile', None)
    flash('You were logged out')
    return redirect(url_for('show_entries'))

if __name__ == "__main__":
    app.run()
