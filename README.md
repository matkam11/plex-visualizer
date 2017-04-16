# Plex Visualizer

A Visulizer to help you discover new media on your [Plex Media Server](https://plex.tv).

## Features

* View and general view of TV Shows and Movies
* All Bubbbles are sized relative to the amount that thing has been watched
* Click on any bubble to expand it to get more information or to filter it out
* Login to be able to filter things you've already watched (so long as its in the plexpy.db)
* Split up bubbles by Years or Genres
* Filter bubbles individually, by year or by genre

There are many more features that I want to implement!

![TV Show View](http://i.imgur.com/Jg8U7cB.png)

## Installation

* Install the requirements in a virtualenv or on your machine
    * `pip install -r requirements.txt`
* Place a copy of your plexpy.db in data/
* Copy the plex_vis.cfg.sample to the same directory (minus the .sample) and fill in the nessicary information
    * SECRET_KEY: A randomly generated key to keep session info safe
    * PLEYPY_KEY: A plexpy API Key
    * PLEXPY_URL: The url to your plexpy instance. Must be accessible by the app but not necessarily by the end user
    * APP_URL: The public URL of the app (so that the frontend can make proxied requests)
    * ADMIN: The Admin user that will be able to run additional functions

From here you can just execute the run_vis.sh script from the same directory to run the app! (Systemd/init.d defintions coming soon!)

## Screenshots
The first view you see when you first enter the page. Lets you choose between the TV Shows and Movies on your server
![First View](http://i.imgur.com/Wl4yXJY.png)

You can expand any of the bubbles to get more information about that Show/Movie
![Expanded View](http://i.imgur.com/aO7coeh.png)

You can split up the chart by genre to help you narrow down what you want to watch
![Split Genre](http://i.imgur.com/IIYb1GU.png)

You can also split up by year in case you are feeling an older or newer Show/Movie!
![Split Year](http://i.imgur.com/r7bhHmm.png)

## Issues

There's still a lot that I want to do with this so feel free to open up an Issue and I'll try to get to it!

## Contributing

I could use all the help I can get so please feel free to open up a PR if you want to contribute.

There's a lot of clean up and documentation that I still need to do so I won't hold you to any standard but please try to document the functionality you add!

## License

This is free software under the GPL v3 open source license. Feel free to do with it what you wish, but any modification must be open sourced. A copy of the license is included.
