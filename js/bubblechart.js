function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function inArray(myArray,myValue){
    var inArray = false;
    myArray.map(function(key){
        if (key == myValue){
            inArray=true;
        }
    });
    return inArray;
};

function plex_chart() {
  // Global Constants
  // Page size conatants
  var sidebar_width = 298
  var width = window.innerWidth-sidebar_width;
  var height = window.innerHeight;
  var center = { x: width / 2, y: height / 2 };
  var max_radius = area_to_radius(.015*width*height);
  // if (max_radius <= 30) {max_radius = 30}


  // Animation Speed
  var damper = 0.104;

  // Slider params
  var scaleing = 1
  var min_year = 1917;
  var max_year = 2017;

  // Additonal vars
  var active = "root"
  var loggedIn = false

  // All the objects
  var globalGroups = [];
  var svg = null;
  var bubbles = null;
  var orig_nodes = null;
  var nodes = [];
  var nodes_to_display =[];
  var stateHistory = [];
  var nav_buttons = [];
  var groups = [];
  var colorMapping = []
  var years_to_show = [min_year, max_year]
  var filter_watched = false

  var toggled_groups = []
  var label_filter_functions = {}
  var nodes_filter_functions = {}

  // crime:  #201BAE
  //// Adventrue: #E3033F
  // Adventure: #F72C25
  // Movies: #F9E603
  // TV Shows: #F72C25
  // Children: #9844ff
  // Comedy:#32b6ef
  // Scifi: #78db00
  // Kids: f20e62
  //#C2F003

  var colors =["#f9e603", "#F72C25", "#0D5CA2", "#9844ff",
               "#32b6ef", "#201BAE", "#FB5003", "#FB9403",
               "#02A96A", "#00b916", "#badfad", "#a50520",
               "#FADBAD", "#f20e62", "#BEDBAD", "#BADBED",
               "#FEDBED", "#BEDFED", "#4b81ff", "#484848",
               "#848484", "#78db00", "#987654", "#456789",
               "#654321", "#456654", "#123321", "#F9E603",
               "#F72C25", "#FEDBAC", "#CADFED"
               ];
  // var data = [];

  // Functions that get changed depending on whats happening
  var targetFunction = moveToCenter
  var renderFunction = render_root
  var onClickFunction = expandEntity
  var groupActionFunction = toggleGroup
  var groupFilter = function (d) {return d.genre};
  var groupSort = function (a,b) {return d3.ascending(a,b)}
  var deleteFunction = function(d, toDelete) {if (groupFilter(toDelete) != groupFilter(d)) {
                                      return d
                                      }}


  var force = d3.layout.force()
    .size([width, height])
    .charge(charge)
    // .gravity(-0.01)
    // .friction(0.8);

  var div = d3.select("body")
    .append("div")  // declare the tooltip div
    .attr("class", "tooltip")
    .style("opacity", 0);

  // General Functions
  function charge(d) {
    return -Math.pow(d.radius*scaleing, 2.0) / 3.5;
  }

  function radius_to_area(radius) {
    let area = Math.pow(radius,2)*Math.PI()
    return area
  }

  function area_to_radius(area) {
    let radius = Math.pow(area/Math.PI, .5)
    return radius
  }

  function getClassColor(i){
      let index = colorMapping.indexOf(i)
      if (index > -1) return colors[index];
      return "#f9be03"
  }

  function setClassColor(data){
    var all_groups = new Set()
    data.forEach(function (d) { d.children.forEach(function (e) {all_groups.add(e)})})
    local_groups = groups_from_data(all_groups)
    local_groups.push({"name": "Movies", "size": "0"})
    local_groups.push({"name": "TV Shows", "size": "0"})
    local_groups.forEach(function (d,i) { colorMapping.push(d.name)})
  }

  function wrap(text, width) {
    console.log(text)
    console.log(width)
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1 // ems
          y = text.attr("y"),
          dy = parseFloat(text.attr("dy")),
          tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
      while (word = words.pop()) {
        word = word.replace("'''","")
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
        }
      }
    });
  }

  function calcPageSize() {
    width = window.innerWidth-sidebar_width;
    height = window.innerHeight;
    center = { x: width / 2, y: height / 2 };
    max_radius = area_to_radius(.025*width*height);
    if (max_radius <= 30) {max_radius = 30}
    force.alpha(100000);
    animate()
  }

  function renderSidebar(data) {
    console.log("Rendering sidebar")
    data = JSON.parse(data)
    console.log(data.response.data.metadata);
    data = data.response.data.metadata

    // spans = text_to_spans(data.summary, (width*.25)-())

    overlay = svg.append("g")
    overlay
      .classed("movieOverlay",true)
      .on("click", function(d) {svg.select("g.movieOverlay").remove()})


    overlay.append("rect")
      .attr("height", height)
      .attr("width", width)
      .style("fill-opacity", 0.0)
      .on("click", function(d) {svg.select("g.movieOverlay").remove()})

    sidebar = overlay.append("g")

    sidebar
      .attr("transform","translate(" + width + ", 0)").transition().attr("transform","translate(" + width*.5 + ", 0)")
      .style("opacity",1)

    defs = sidebar.append("defs")
    pattern = defs.append("pattern")
      .attr("id", "backgroundImage")
      .attr("height", "100%")
      .attr("width", "100%")
      .attr("patternContentUnits", "objectBoundingBox")
      .attr("viewBox","0 0 1 1")
      .attr("preserveAspectRatio", "xMidYMid slice")

    pattern.append("image")
      .attr("xlink:href", "art?link=" + data.art + "&width=1920&height=1080")
      .attr("height", "1")
      .attr("width", "1")
      .attr("preserveAspectRatio", "xMidYMid slice")

    sidebar.append("rect")
      .style("fill", d3.rgb("#1f1f1f"))
      // .attr("x", (width-width*.5))
      .attr("height",height)
      .attr("width",width*.5)
      .style("opacity",1)

    sidebar.append("rect")
      .style("fill", "url(#backgroundImage)")
      // .attr("x", (width-width*.5))
      .attr("height",height)
      .attr("width",width*.5)
      .style("opacity",.2)

    sidebar.append("rect")
      .style("fill", d3.rgb("#1f1f1f"))
      // .attr("x", (width-width*.5))
      .attr("y", 100)
      .attr("height",height-100)
      .attr("width",width*.5)
      .style("opacity",.5)


    image = sidebar.append("image")
      .attr("xlink:href", "art?link=" + data.thumb + "&width=1920&height=1080")
      .attr("width",width*.1)
      .attr("height", width*.1*1.47)
      .attr("x", 20)
      .attr("y", 40)

    sidebar.append("text")
      .text(data.title)
      .style("fill",d3.rgb('#f9be03'))
      .style("font-size", 28)
      .style("font-family","Open Sans")
      .attr("x", (width*.1)+40)
      .attr("y", 60)

    console.log()
    summaryG = sidebar.append("g")
                .attr("transform", "translate(" + ((width*.1)+40) + ", 80)")

    summaryG.append("text")
      .text("'''" + data.summary + "'''")
      .attr("y", 0)
      .attr("dy", ".3em")
      .style("font-size", 16)
      .call(wrap, (width*.5)-(width*.1)-80)
      .style("fill",d3.rgb('white'))
      .style("font-family","Open Sans")
      // .attr("x", (width*.1)+80)

    sidebar.append("text")
      .text(function (d) { return "Studio: " + data.studio})
      .classed("data-title",true)
      .attr("x", 20)
      .attr("y", ((width*.1*1.47)+60))
      .attr("dy", ".3em")
      .style("font-size", 16)
      .style("fill",d3.rgb('white'))
      .style("font-family","Open Sans")

    sidebar.append("text")
      .text(function (d) { return "Year: " + data.year})
      .classed("data-title",true)
      .attr("x", 20)
      .attr("y", ((width*.1*1.47)+80))
      .attr("dy", ".3em")
      .style("font-size", 16)
      .style("fill",d3.rgb('white'))
      .style("font-family","Open Sans")

    sidebar.append("text")
      .text(function (d) { return "Content Rating: " + data.content_rating})
      .classed("data-title",true)
      .attr("x", 20)
      .attr("y", ((width*.1*1.47)+100))
      .attr("dy", ".3em")
      .style("font-size", 16)
      .style("fill",d3.rgb('white'))
      .style("font-family","Open Sans")
      .call(wrap, width*.1)

    console.log(data)
  }

  function expandEntity(toExpand) {
    console.log(toExpand.key)
    d3.json("/metadata/" + toExpand.key, renderSidebar)
  }

  function deleteEntity(toDelete) {
    console.log("deleteEntity")
    saveState()
    nodes = nodes.filter(function (d) {return deleteFunction(d, toDelete)})
    animate()
  }

  function setGroupAction(payload) {
    saveState()
    groupActionFunction = payload.onClick
    animate()
  }

  function genreClick(group) {
    console.log("GenreClick")
    saveState()
    console.log(group)
    groupActionFunction(group)
    animate()
  }

  function toggleGroup(group) {
    saveState()
    var index = toggled_groups.indexOf(groupFilter(group))
    if (index != -1) {
      toggled_groups.splice(index,1)
    } else {
      toggled_groups.push(groupFilter(group))
    }
  }

  function removeGroup(group) {
    console.log("Attempting to remove group " + group.name)
    console.log(group)
    console.log(nodes.length)
    nodes = nodes.filter(function(d) {if (group.name != groupFilter(d)) {
                                    return d
                                    }})
    console.log(nodes.length)
  }

  function restoreGroups(payload) {
    console.log(globalGroups)
    console.log(groups)
    if (toggled_groups.length > 5) {
      toggled_groups = [];
    } else {
      toggled_groups = globalGroups;
    }
    animate();
  }

  function deleteSingle(payload) {
    saveState()
    onClickFunction = payload.onClick
    deleteFunction = payload.delete
    animate()
  }

  function saveState() {
      console.log("Saving state")
      console.log(toggled_groups)
      let state = {}
      state.targetFunction = targetFunction
      state.renderFunction = renderFunction
      state.groupFilter = groupFilter
      state.groupSort = groupSort
      state.groups = groups
      state.toggled_groups = []
      toggled_groups.forEach(function (d) {state.toggled_groups.push(d)})
      state.groupActionFunction = groupActionFunction
      state.nodes = nodes
      state.filter_watched = filter_watched
      state.nav_buttons = []
      nav_buttons.forEach(function (d) {state.nav_buttons.push(d)})
      stateHistory.push(state)
  }

  function restore() {
    state = stateHistory.pop()
    targetFunction = state.targetFunction
    renderFunction = state.renderFunction
    groupFilter = state.groupFilter
    groupSort = state.groupSort
    groups = state.groups
    groupActionFunction = state.groupActionFunction
    toggled_groups = []
    state.toggled_groups.forEach(function(d) { toggled_groups.push(d)})
    filter_watched = state.filter_watched
    nodes = state.nodes
    nav_buttons = []
    state.nav_buttons.forEach(function (d) {nav_buttons.push(d)});
    animate()
  }


  function restoreAll() {
    state = stateHistory[0]
    targetFunction = state.targetFunction
    renderFunction = state.renderFunction
    groupFilter = state.groupFilter
    groupSort = state.groupSort
    groups = state.groups
    nodes = state.nodes
    nav_buttons = state.nav_buttons
    stateHistory=[]
    animate()
  }

  d3.selection.prototype.moveToFront = function() {
    console.log("Moving to front")
    return this.each(function(){
      this.parentNode.appendChild(this);
    });
  };

  function animate() {
    console.log("Animating")
    render_nav_bar()
    var max_area = 0
    var average_radius = 0
    average_radius = average_radius/nodes.length
    if (average_radius > 15) {
      console.log(average_radius)
    }
    if (filter_watched) {
      console.log("Filtering Watched")
      nodes.forEach(function(d) { d.display.push(!d.watch); })
    }
    nodes_with_labels = nodes.filter(function (d) { var to_display = true;
                                                   d.display.forEach(function (e) {
                                                      to_display = to_display && e
                                                   })
                                                   d.display = []
                                                   if (to_display)
                                                   {return d}})

    groups = groups_from_data(nodes_with_labels)
    globalGroups = calcGroupCenters(groups)
    console.log("Max radius = " + max_radius)
    showLabels(globalGroups)
    nodes_with_labels.forEach(function (d) { if ((d.year >= years_to_show[0] && d.year <= years_to_show[1]) || d.type == "root") {d.display.push(true)}
                                else {d.display.push(false)}})
    nodes_with_labels.forEach(function (d) { if (inArray(toggled_groups,groupFilter(d))) { d.display.push(false)}})
    nodes_to_display = nodes_with_labels.filter(function (d) { var to_display = true;
                                               d.display.forEach(function (e) {
                                                  to_display = to_display && e
                                               })
                                               d.display = []
                                               if (to_display)
                                               {return d}})
    nodes_to_display.forEach(function(d) { if (d.value > max_area) {max_area = d.value;}})
    nodes_to_display.forEach(function(d) { d.radius = max_radius*(area_to_radius(d.value)/area_to_radius(max_area)); average_radius += d.radius})
    nodes_to_display = nodes_to_display.filter(function(d) { if (d.radius > 1) {return d}})
    force.nodes(nodes_to_display)
    renderFunction()
    force.alpha(1)
    animation()
  }

  function calcGroupCenters(groups) {
    var local_groups = []
    devs = width/(groups.length+1)
    curr = 0;
    top_y = 40;
    top_curr = devs;
    var biggest_size = 0
    var total_size = 0
    curr_y = height/2
    num_rows = 0
    // console.log(groups.length)
    groups.forEach(function (d) { total_size += d.size });
    groups.forEach(function (d, i) {
      // console.log(d.size/total_size)
      // var curr_width = ((d.size/total_size))*width
      // if (curr_width < 100) {curr_width = 50};
      // if (curr_width > 500) {curr_width = 500}
      // console.log("Current Width = " + (curr + curr_width) + " Out of " + width)
      // if ((curr + curr_width) >= (width-100)) { curr_y += height/2; curr = 0}
      local_groups.push({name: d.name,
                         year: d.name,
                         genre: d.name,
                         x:top_curr,
                         y:curr_y,
                         top_x: top_curr,
                         top_y: curr_y})
      curr += devs;
      top_curr += devs;
    })
    // local_groups.forEach(function (target) { console.log("( " + target.x + ", " + target.y + ")")})
    return local_groups
  }

  function groups_from_data(data) {
    var groups = []
    var group_sizes = {}
    var final_groups = []
    data.forEach(function(d) { if (!inArray(groups, groupFilter(d))) { (groups.push(groupFilter(d))); group_sizes[groupFilter(d)] = 0};group_sizes[groupFilter(d)] += d.value})
	  groups.sort(groupSort)
    Object.keys(group_sizes).forEach( function (d){
      final_groups.push({"name": d, "size": group_sizes[d]})
    })
    final_groups.sort(function (a,b) { return d3.ascending(a.name,b.name)})
    return final_groups
  }

  function expandGroup(to_expand){
    saveState()
    nav_buttons = [
        { name: "Grouping", exclusive: true, children: [
          { name: "Group Together",               func: grouping,         type: "toggle", active: true,  group: "Grouping", payload:
            {
              groupFilter: function (d) {return d.genre},
              groupSort: function (a,b) {return d3.ascending(a,b)},
              targetFunction: moveToCenter
            }
          },
          { name: "Split Genre",                  func: grouping, type: "toggle", active: false, group: "Grouping", payload:
            {
              groupFilter: function (d) {return d.genre},
              groupSort: function (a,b) {return d3.ascending(a,b)},
              targetFunction: moveToGenre
            }
          },
          { name: "Split Years",                  func: grouping,  type: "toggle", active: false, group: "Grouping", payload:
            {
              groupFilter: function (d) {return d.year},
              groupSort: function (a,b) {return b-a},
              targetFunction: moveToGenre
            }
          }
        ]},
        { name: "On Click", exclusive: true, children: [
          { name: "Expand " + to_expand.singular, func: deleteSingle, type: "toggle", active: true,  group: "On Click", payload:
            {
              onClick: expandEntity,
              delete: ""
            }
          },
          { name: "Remove " + to_expand.singular, func: deleteSingle, type: "toggle", active: false, group: "On Click", payload:
            {
              onClick: deleteEntity,
              delete: function(d, toDelete) {if (toDelete.name != d.name) {
                                                    return d
                                                    }}
            }
          },
          { name: "Remove Genre",                 func: deleteSingle, type: "toggle", active: false,  group: "On Click", payload:
            {
              onClick: deleteEntity,
              delete: function(d, toDelete) {if (groupFilter(toDelete) != groupFilter(d)) {
                                    return d
                                    }}
            }
          }
        ]},
        { name: "Genre", exclusive: true, children: [
                    { name: "Remove Genre",                 func:  setGroupAction , type: "toggle", active: false,  group: "Genre", payload:
            {
              onClick: removeGroup,
            }
          },
          { name: "Toggle Genre",                 func: setGroupAction, type: "toggle", active: true,  group: "Genre", payload:
            {
              onClick: toggleGroup,
            }
          },
          { name: "Toggle all Genre",                 func: restoreGroups, type: "push", active: false,  group: "Genre", payload:
            {
              onClick: deleteEntity,
              delete: function(d, toDelete) {if (groupFilter(toDelete) != groupFilter(d)) {
                                    return d
                                    }}
            }
          }
        ]}
    ]
    result  = nodes.filter(function(d) {if (to_expand.name === d.name) {
                                      return d
                                      }})
    nodes = result[0].children
    renderFunction = render_chart
    animate()
  }

  var chart = function chart(selector, rawData) {
    ///// Button Related things:


    // Use the max total_amount in the data as the max in the scale's domain
    // note we have to ensure the total_amount is a number by converting it
    // with `+`.
    var maxAmount = d3.max(rawData, function (d) { return +d.radius; });
    nodes = classes(rawData);
    setClassColor(nodes)

    orig_nodes = nodes;
    // Set the force's nodes to our newly created nodes array.
    force.nodes(nodes);

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select('#vis')
      .append('svg')
      .attr('width', "100%")
      .attr('height', "100%");


    // Bind nodes data to what will become DOM elements to represent them.
    renderFunction()
    force.start()
    // Set initial layout to single group.
    animate();
  };

  // #################################################################################################
  // Functions responsible for rendering things
  // render_root renders the root of the chart before TV/Movies is expanded
  // render_chart renders the core of the data visualization
  // render_nav_bar renders the nav bar svg
  //
  //
  // #################################################################################################
  // Render Functions
    function render_root() {
    svg.attr('width', width)
       .attr('height', height);
     bubbles = svg.selectAll('g.node')
      .data(nodes_to_display, function (d) {return d.name; });


    bubbles.select("circle")
      .attr("r",function(d) { return d.radius*scaleing }).transition().duration(3).attr("r", function(d) { return d.radius*scaleing })
      .style("fill", function(d) { return getClassColor(d.name); })

    bubbles.select("text")
      .text(function(d) { return d.name.substring(0, d.radius / 3); });


    bubbleEnter = bubbles.enter().append('g')
    bubbleEnter.classed("node",true)
            .attr("cursor","pointer");

    bubbleEnter.append("circle")
        .style("fill", function(d) { return getClassColor(d.name); })
        .attr("r",0).transition().duration(3).attr("r", function(d) { return d.radius*scaleing })

    bubbleEnter.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function(d) { return d.name.substring(0, d.radius / 3); });

    bubbleEnter.on("mouseover", function(d) {
              div .transition()
                  .duration(100)
                  .style("visibility", "visible")
                  .style("opacity", 0.9);
              div .html(
                      "Name: "   +d.name   +"<br/>"+
                      "Hours Watched: "    + Math.round((d.value/60/60)*100)/100
                  )
                  .style("left", (d3.event.pageX) + "px")
                  .style("top", (d3.event.pageY - 28) + "px");
              })
      .on("mouseout", function(){return div.style("visibility", "hidden");})
      .on("click", function(d){ expandGroup(d)});


    bubbleExit =  bubbles.exit()
    bubbleExit.transition().duration(5).select("circle").attr("r",0)
    bubbleExit.transition().duration(5).remove();
    globalGroups = []
    showLabels()
  }

  function render_chart() {
    svg.attr('width', width)
       .attr('height', height);

    bubbles = svg.selectAll('g.node')
      .data(nodes_to_display, function (d) { return d.name; });


    bubbles.select("circle")
    .attr("r",function(d) { return d.radius*scaleing }).transition().duration(3).attr("r", function(d) { return d.radius*scaleing });

    bubbles.select("text")
      .text(function(d) { return d.name.substring(0, d.radius*scaleing / 3); });


    bubbleEnter = bubbles.enter().append('g')
    bubbleEnter.classed("node",true)
            .attr("cursor","pointer");

    bubbleEnter.append("circle")
        .style("fill", function(d) { return getClassColor(d.genre); })
        .attr("r",0).transition().duration(3).attr("r", function(d) { return d.radius*scaleing; });

    bubbleEnter.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function(d) { return d.name.substring(0, d.radius / 3); });

    bubbleEnter.on("mouseover", function(d) {
              div .transition()
                  .duration(100)
                  .style("visibility", "visible")
                  .style("opacity", 0.9);
              div .html(
                      "Genre: " +d.genre +"<br/>"+
                      "Name: "   +d.name   +"<br/>"+
                      "Year: " +d.year + "<br/>"+
                      "Watched: " + d.watch + "<br/>"+
                      "Hours Watched: "    + Math.round((d.value/60/60)*100)/100
                  )
                  .style("left", (d3.event.pageX) + "px")
                  .style("top", (d3.event.pageY - 28) + "px");
              })
      .on("mouseout", function(){return div.style("visibility", "hidden");})
      .on("click", function(d){ onClickFunction(d)});


    bubbleExit =  bubbles.exit()
    bubbleExit.transition().duration(5).select("circle").attr("r",0)
    bubbleExit.transition().duration(5).remove();
  }

  function hideSidebar() {
    sidebar = d3.select('#sliders')
    sidebar.transition().duration(10).style('width',0).style("opacity",0)
    sidebar_width = 48
    restore_sidebar = svg.append('g');
    restore_sidebar.attr("id","showSidebar").classed("button", true)
    restore_sidebar.append('rect').attr("y",10).attr("width",100).attr("height",20).style("fill",d3.rgb("#282828"));
    restore_sidebar.append('text').text("Show Sidebar").attr("y",25).attr('x',20).style("fill","999")
    .on("click", showSidebar);
    calcPageSize()
  }

  function showSidebar() {
    sidebar = d3.select('#sliders')
    sidebar.transition().duration(10).style('width','260px').style("opacity",1)
    sidebar_width = 298
    svg.select('#showSidebar').remove();
    calcPageSize()
  }

  function render_nav_bar() {
    var globalButtons = []
    globalButtons.push({ name: "Reset", func: restoreAll, type: "press",   active: false, group: "Global"})
    globalButtons.push({ name: "Undo Last Action", func: restore, type: "press",   active: false, group: "Global"})
    globalButtons.push({ name: "Hide Sidebar", func: hideSidebar, type: "press",   active: false, group: "Global"})
    if (loggedIn) {
      globalButtons.push({ name: "Remove Watched", func: removeWatched, type: "toggle", active: false, group: "Global"})
      globalButtons.push({ name: "Log Out", func: function() {window.location= "/logout"}, type:"press", active: false, group: "Global"})
    } else {
      globalButtons.push({ name: "Login", func: function() {window.location= "/login"}, type:"press", active: false, group: "Global"})
    }
    nav_buttons.push({ name: "Global", exclusive: false, children: globalButtons})
    var xShift = 25
    var yShift = 10
    var yHeight = 30
    var nextRoot = 10
    nav_buttons.forEach(function(d) {d.y = nextRoot;
                                     d.children.forEach(function (e,i) {
                                      e.y = nextRoot+((i+1)*yHeight);
                                      return e;
                                     })
                                     nextRoot = nextRoot+((d.children.length+1)*yHeight);
                                     return d})

    var nav = d3.select('#navBar')
    var buttonGroups = nav.selectAll('ul.group')
      .data(nav_buttons, function (d) { return d.name});

    buttonUpdate = buttonGroups.selectAll('li.button')
           .data(function(d) { return d.children}, function (e)  { return e.name})

    buttonUpdateActive = buttonGroups.selectAll('li.button-active')
           .data(function(d) { return d.children}, function (e)  { return e.name})

    buttonUpdate.classed("button-active", function(d) {return d.active})
                .classed("button", function(d) {return !d.active})

   buttonUpdateActive.classed("button-active", function(d) {return d.active})
                     .classed("button", function(d) {return !d.active})

    buttonGroupEnter = buttonGroups.enter().append('ul')
    buttonGroupEnter.classed("group",true)

    buttonHeading = buttonGroupEnter.append('li')
    buttonHeading.classed("heading", true)

    buttons = buttonGroupEnter.selectAll('li.button')
      .data(function(d) {return d.children}, function (e)  { return e.name})

    buttonEnter = buttons.enter().append('li')
    buttonEnter.classed("button-active", function(d) {return d.active})
     .classed("button", function(d) {return !d.active})
     .style("cursor","pointer")
     .text(function(d) { return d.name })
     .on("click", function(d){ toggle_button(d)})
     .classed("active", function(d) {return d.active});

    buttonGroups.exit().remove()

  }

  function animation() {
      force.on('tick', function (e) {
         bubbles.each(targetFunction(e.alpha))
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
       });
    force.start();
  }

  function showLabels(groups) {
    console.log(toggled_groups)
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var labels = svg.selectAll('.label')
      .data(globalGroups, function (d) {return d.name});

    labels
      .style('fill',  function(d) { if(inArray(toggled_groups, d.name)) { return "#999"};
                                                                          return getClassColor(d.name);} )
      .style('text-decoration',function(d) {if (inArray(toggled_groups, d.name)) { return "none"}
                                                                                   return "underline"})

    labels
      .attr('id', 'update')
      // .attr('x', function (d) { if (targetFunction == moveToCenter ) { return d.top_x; }; return d.x; })
      // .attr('y', function (d) { if (targetFunction == moveToCenter ) { return d.top_y; };return d.y - ((height/4) - 40 ); })
      .attr('x', function (d) { return d.x; })
      .attr('y', function (d) { return 40; })

    labels.enter().append('text')
      .attr('class', 'label')
      .style('fill',  function(d) { if(inArray(toggled_groups, d.name)) { return "#999"};
                                                                          return getClassColor(d.name);} )
      // .attr('x', function (d) {  if (targetFunction == moveToCenter ) { return d.top_x; }; return d.x})
      // .attr('y', function (d) { if (targetFunction == moveToCenter ) { return d.top_y; };return d.y - ((height/4) - 40 ); })
      .attr('x', function (d) { return d.x})
      .attr('y', function (d) { return 40 })
      .attr("cursor","pointer")
      .attr('text-anchor', 'middle')
      .style('text-decoration',function(d) {if (inArray(toggled_groups, d.name)) { return "none"}
                                                                                   return "underline"})

      .text(function (d) { return d.name; })
      .on("click", function(d){ genreClick(d)});


    labels.exit().remove()
  }
  ///// Target Functions
  // These functions are used to determine targets for Splitting
  function moveToCenter(alpha) {
    return function (d) {
      d.x = d.x + (center.x - d.x) * damper * alpha;
      d.y = d.y + (center.y - d.y) * damper * alpha;
    };
  }

  function moveToGenre(alpha) {
  return function (d) {
    var target = globalGroups.filter(function(e) {if (e.name == groupFilter(d)) {
                                      return e
                                      }})[0]
    d.x = d.x + (target.x - d.x) * damper * alpha * 1.1;
    d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
  };
  }

  ///// Button related things
  // Button function mappings:
  d3.select("#year_slider").call(d3.slider().axis(true).min(min_year).max(max_year).step(1).value([min_year, max_year])
                                .on("slide", function (evt,value) {
                                  console.log(value)
                                  years_to_show = value
                                  animate();
                                }))
  d3.select("#zoom_slider").call(d3.slider().value(50).on("slide", function(evt, value) {
                                scaleing = value/50;
                                console.log("Scale now equals:" + value)
                                animate()
                              }))

  // Button Functions
  // Set grouping and reanimate
  function grouping(payload) {
    console.log("grouping")
    saveState()
    groupFilter = payload.groupFilter;
    groupSort = payload.groupSort;
    targetFunction = payload.targetFunction;
    force.alpha(100000);
    animate()
  }

  // Togle which button is active
  function toggle_button(button) {
    nav_buttons.forEach(function (d) {
      if (d.name === button.group && button.type === "toggle") {
        if (d.exclusive) {
          d.children.forEach( (function (e) {
            if (e.name === button.name && button.type === "toggle") { e.active = true; return e};
            e.active = false; return e
          }));
        } else {
          d.children.forEach( (function (e) {
            if (e.name === button.name && button.type === "toggle") { e.active = !e.active};
            return e;
          }))
        }
      return d;
    }})
    button.func(button.payload)
  }

  // Remove already watched entities
  function removeWatched() {
    console.log("removeWatched")
    saveState()
    filter_watched = !filter_watched;
    animate()
  }

  // #################################################################################################
  // Functions responsible manipulating Data (from JSON)
  // classes seperates out the nodes appropriately
  // group pulls the data from indvidual groups (TV/Movies)
  // recurse grabs all the nodes in an individual group
  //
  //
  // #################################################################################################
  // Data Manipulation Functions
  function classes(root) {
    var classes = []
    var movies = {}
    var tv = {}
    loggedIn = root.loggedIn
    // TODO move singular into JSON
    function group(name,node,array_to_push, singular) {
      array_to_push.name = node.name
      array_to_push.value = node.size
      array_to_push.x = Math.random() * 900;
      array_to_push.y = Math.random() * 800;
      array_to_push.display = [true]
      array_to_push.type = "root"
      array_to_push.singular = singular
      children = []
      recurse(null, node, children)
      array_to_push.children = children;
    }

    function recurse(name, node, array_to_push) {
      if (node.children) node.children.forEach(function(child) { recurse(node.name, child, array_to_push); });
      else  {array_to_push.push({genre: node.genre,
                           name: node.name,
                           value: node.size,
                           year: node.year,
                           watch: node.watch,
                           key: node.key,
                           // radius: Math.pow(node.size,0.5)/10,
                           x: Math.random() * 900,
                           y: Math.random() * 800,
                           display: [true],
                           type: "child",
                           parent: node
      });}
    }

    group(null, root.TV, tv, "Show")
    group(null, root.Movies, movies, "Movie")
    return [movies, tv]
  }
  d3.select(window).on("resize", calcPageSize);

  return chart;
}


var myBubbleChart = plex_chart();


/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }

  myBubbleChart('#vis', data);
}


d3.json(user_data, display)