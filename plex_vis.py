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

@app.route('/')
def show_entries():
    username = ""
    if session.get('logged_in'):
        username = session['username']
        print("Logged In!")
    db = get_db()
    cur = db.execute("SELECT * FROM 'session_history_metadata' LEFT JOIN session_history ON session_history_metadata.id=session_history.id  where session_history_metadata.media_type='movie'")
    entries = cur.fetchall()
    movies={"name": "Movies"}
    movies["children"] = []
#    print entries
    temp_movies = {}
    for entry in entries:
        genre = entry["genres"].split(';')[0]
        if genre == "":
           genre = "None"

        if entry["title"] not in temp_movies.keys():
            temp_movies[entry["title"]] = {}
            temp_movies[entry["title"]]["size"] = 0
            temp_movies[entry["title"]]["year"] = entry["year"]
            temp_movies[entry["title"]]["genre"] = genre
            temp_movies[entry["title"]]["watch"] = "False"
        if username == entry["user"]:
            temp_movies[entry["title"]]["watch"] = "True"
        temp_movies[entry["title"]]["size"] += float(entry["stopped"] - entry["started"]) - float(entry["paused_counter"])
    final_movies = []

    for movie in temp_movies.keys():
        movies["children"].append({"name":  movie,
                                   "size":  temp_movies[movie]["size"],
                                   "genre": temp_movies[movie]["genre"],
                                   "year":  temp_movies[movie]["year"],
                                   "watch": temp_movies[movie]["watch"]})
    if session.get('logged_in'):
        if "datafile" in session:
            datafile = session['datafile']
        else:
            fs,datafile =  tempfile.mkstemp(dir='data/', suffix=".json")
            with open(datafile, 'w') as outfile:
                json.dump(movies, outfile, indent=4)
            datafile = datafile.replace("/root/plex_cluster/plex_vis","")
            session['datafile'] = datafile
    else:
            fs,datafile =  tempfile.mkstemp(dir='data/', suffix=".json")
            with open(datafile, 'w') as outfile:
                json.dump(movies, outfile, indent=4)
            datafile = datafile.replace("/root/plex_cluster/plex_vis","")
            session['datafile'] = datafile
    return render_template('index.html',data=datafile)


@app.route('/add', methods=['POST'])
def add_entry():
    if not session.get('logged_in'):
        abort(401)
    db = get_db()
    db.execute('insert into entries (title, text) values (?, ?)',
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
    flash('You were logged out')
    return redirect(url_for('show_entries'))

if __name__ == "__main__":
    app.run()
