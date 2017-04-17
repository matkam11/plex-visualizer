import os
import json
import tempfile
import threading
import glob

from sqlite3 import dbapi2 as sqlite3
from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash, send_from_directory, jsonify, Response, stream_with_context

import requests
from plexapi.myplex import MyPlexAccount
import json

class SectionHistory:
    def __init__(self,section_id):
        self.section_id = section_id
        self.lock= threading.Lock()

        section_path = '{}/cache/history/{}/'.format(app.root_path,section_id)
        if not os.path.exists(section_path):
            os.mkdir(section_path)
        files = glob.glob('{}*'.format(section_path))
        if len(files) != 0:
            history = []
            for file in files:
                try:
                    with open(file, 'r') as infile:
                        history += json.load(infile)
                except:
                    break
            self.data = history
        else:
            self.load_history(start=0)

    def load_history(self,start):
            history = []
            current_pos = start
            while (True):
                current_results = plexpy_api("get_history", section_id=self.section_id, length=1000, start=current_pos)["response"]["data"]["data"]
                current_pos += 1000
                history += current_results
                if len(current_results) < 1000:
                    break
            self.data = history
            self.save_history()

    def save_history(self):
        section_path = '{}/cache/history/{}/'.format(app.root_path,self.section_id)
        current = 0
        current_file = 0
        json_file_size = 1000
        left = len(self.data)
        while left > current:
            if left-current >= json_file_size:
                end = current + json_file_size
            else:
                end = current + left-current            
            with open("{}{}.json".format(section_path, current_file), 'w') as outfile:
                json.dump(self.data[current:end], outfile, indent=4)
            current = end
            current_file = current_file + 1

    def refresh_history(self):
        section_path = '{}/cache/history/{}/'.format(app.root_path, self.section_id)
        files = glob.glob('{}*'.format(section_path))
        for file in files:
            os.remove(file)
        self.data = []
        self.load_history(0)

    def update_history(self):
        print self.data

    def get_history(self):
        return self.data

# create our little application :)

app = Flask(__name__)
app.config.from_envvar("CONFIG")
plexpyapikey = app.config['PLEXPY_KEY']
plexpybaseurl = app.config['PLEXPY_URL']
app_root = app.root_path
if not os.path.exists('{}/cache/'.format(app.root_path)):
    os.mkdir('{}/cache/'.format(app.root_path))
if not os.path.exists('{}/cache/history'.format(app.root_path)):
    os.mkdir('{}/cache/history'.format(app.root_path))
if not os.path.exists('{}/cache/metadata'.format(app.root_path)):
    os.mkdir('{}/cache/metadata'.format(app.root_path))

def get_libraries():
    return plexpy_api("get_library_names")["response"]["data"]

def plexpy_api(cmd, **kwargs):
    url = plexpybaseurl + "api/v2?apikey=" + plexpyapikey + "&cmd=" + cmd 
    for key in kwargs:
        url += "&{}={}".format(key, kwargs[key])
    print(url)
    r = requests.get(url)
    return r.json()

def get_movies(username, regen=False):
    libraries = get_libraries()
    movie_sections=[]
    for movie_lib in app.config["MOVIE_LIBRARIES"].split(','):
        for library in libraries:
            if movie_lib == library["section_name"]:
                movie_sections.append(library["section_id"])
    history = []
    for section in movie_sections:
        with app.app_context():
            section_history =  SectionHistory(section)
            if regen:
                section_history.refresh_history()
            history += section_history.get_history()
    del section_history
    movies={"name": "Movies",
            "size": 0}
    movies["children"] = []
    temp_movies = {}
    all_history = len(history)
    while (all_history > 0):
        if (all_history > 1000):
            end = 1000
        else:
            end = all_history
        for entry in history[0:end]:
            if entry["state"] == None:
                if entry["full_title"] not in temp_movies.keys():
                    temp_movies[entry["full_title"]] = {}
                    temp_movies[entry["full_title"]]["size"] = 0
                    temp_movies[entry["full_title"]]["year"] = entry["year"]
                    temp_movies[entry["full_title"]]["watch"] = False
                    temp_movies[entry["full_title"]]["key"] = entry["rating_key"]
                    with app.app_context():
                        temp_movies[entry["full_title"]]["genre"] = get_genres(entry["rating_key"])[0]
                if username == entry["user"]:
                    temp_movies[entry["full_title"]]["watch"] = True
                temp_movies[entry["full_title"]]["size"] += float(entry["stopped"] - entry["started"]) - float(entry["paused_counter"])
        all_history = all_history - 1000
        del history[0:end]

    final_movies = []
    del history

    for movie in temp_movies.keys():
        movies["children"].append({"name":   movie,
                                   "size":   temp_movies[movie]["size"],
                                   "genre":  temp_movies[movie]["genre"],
                                   "year":   temp_movies[movie]["year"],
                                   "watch":  temp_movies[movie]["watch"],
                                   "key": temp_movies[movie]["key"]})
        movies["size"] += temp_movies[movie]["size"]
    return movies


def get_tv(username, regen=False):
    print "Getting TV"
    libraries = get_libraries()
    tv_sections=[]
    for tv_lib in app.config["TV_LIBRARIES"].split(','):
        for library in libraries:
            if tv_lib == library["section_name"]:
                tv_sections.append(library["section_id"])
    history = []
    for section in tv_sections:
        section_history =  SectionHistory(section)
        if regen:
            section_history.refresh_history()
        history += section_history.get_history()
    del section_history
    tv={"name": "TV Shows",
            "size": 0}
    tv["children"] = []
    temp = {}
    all_history = len(history)
    count = 0
    while (all_history > 0):
        if (all_history > 1000):
            end = 1000
        else:
            end = all_history
        for entry in history[0:end]:
            count = count + 1
            title = entry["full_title"].split('-')[0].strip()
            if entry["state"] == None:
                if title not in temp.keys():
                    temp[title] = {}
                    temp[title]["size"] = 0
                    temp[title]["year"] = entry["year"]
                    temp[title]["genre"] = get_genres(entry["rating_key"])[0]
                    temp[title]["watch"] = False
                    temp[title]["key"] = entry["grandparent_rating_key"]
                if username == entry["user"]:
                    temp[title]["watch"] = True
                temp[title]["size"] += float(entry["stopped"] - entry["started"]) - float(entry["paused_counter"])
        all_history = all_history - 1000
        del history[0:end]

    for show in temp.keys():
        tv["children"].append({"name":   show,
                                   "size":   temp[show]["size"],
                                   "genre":  temp[show]["genre"],
                                   "year":   temp[show]["year"],
                                   "watch":  temp[show]["watch"],
                                   "key": temp[show]["key"]})
        tv["size"] += temp[show]["size"]
    return tv

def get_metadata(rating_key):
    json_file = '{}/cache/metadata/{}/{}.json'.format(app.root_path, str(rating_key)[0], rating_key)
    if not os.path.exists('{}/cache/metadata/{}/'.format(app.root_path, str(rating_key)[0])):
        os.mkdir('{}/cache/metadata/{}/'.format(app.root_path, str(rating_key)[0]))
    if os.path.isfile(json_file):
        with open(json_file, 'r') as infile:
            data = json.load(infile)
    else:
        data = load_metadata(rating_key)
        save_metadata(data, rating_key)
    return data


def load_metadata(ratingkey):
    result = plexpy_api("get_metadata", rating_key=ratingkey)["response"]
    if result["result"] != "success":
        return None
    return result["data"]["metadata"]

def save_metadata(data, rating_key):
    json_file = '{}/cache/metadata/{}/{}.json'.format(app.root_path,str(rating_key)[0],rating_key)
    with open(json_file, 'w') as outfile:
        json.dump(data, outfile, indent=4)

def get_genres(rating_key):
   meta = get_metadata(rating_key)
   if meta == None or len(meta["genres"]) == 0:
       return ["None"]
   return meta["genres"]

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
    get_libraries()
    username = ""
    if session.get('logged_in'):
        username = session['username']
        print("Logged In!")
        if "datafile" in session and os.path.isfile(app.root_path + session['datafile']):
            datafile = session['datafile']
        else:
            movies =  get_movies(username)
            tv = get_tv(username)
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
        movies =  get_movies(username, regen=True)
        tv = get_tv(username, regen=True)
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
