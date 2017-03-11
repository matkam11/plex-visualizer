import os
import json
from sqlite3 import dbapi2 as sqlite3
from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash


# create our little application :)
app = Flask(__name__)

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


@app.route('/')
def show_entries():
    db = get_db()
    cur = db.execute("SELECT * FROM 'session_history_metadata' LEFT JOIN session_history ON session_history_metadata.id=session_history.id  where session_history_metadata.media_type='movie'")
    entries = cur.fetchall()
    movies={"name": "Movies"}
    movies["children"] = []
#    print entries
    temp_movies = {}
    print len(entries)
    for entry in entries:
        genre = entry["genres"].split(';')[0]
        if genre == "":
           genre = "None"
        if genre not in temp_movies.keys():
            # print "Adding " + genre
            temp_movies[genre] = {}
        if entry["title"] not in temp_movies[genre].keys():
            print "Adding " +  entry["title"] + " to " + genre
            temp_movies[genre][entry["title"]] = 0
        temp_movies[genre][entry["title"]] += float(entry["stopped"] - entry["started"])
    final_movies = []
    for genre in temp_movies:
        genre_children = []
        print genre
        print len(temp_movies[genre].keys())
        for movie in temp_movies[genre].keys():
            genre_children.append({"name": movie,
                                   "size": temp_movies[genre][movie]})
        movies["children"].append({"name": genre,
                                   "children": genre_children})
    with open('data.json', 'w') as outfile:
        json.dump(movies, outfile, indent=4)

    return render_template('show_entries.html', entries=final_movies)


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
        if request.form['username'] != app.config['USERNAME']:
            error = 'Invalid username'
        elif request.form['password'] != app.config['PASSWORD']:
            error = 'Invalid password'
        else:
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
