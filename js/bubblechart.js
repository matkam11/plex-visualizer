function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function intToRGB(i){
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
}

function inArray(myArray,myValue){
    var inArray = false;
    myArray.map(function(key){
        if (key === myValue){
            inArray=true;
        }
    });
    return inArray;
};

function plex_chart() {
  var width = 960;
  var height = 960;
  var targetFunction = moveToCenter
  var renderFunction = render_root
  var groupFilter = function (d) {return d.genre};
  var groupSort = function (a,b) {return d3.ascending(a,b)}
  var center = { x: width / 2, y: height / 2 };
  var scaleing = .10
  var prev_scaleing = 10
  var damper = 0.104;

  var globalGroups = [];

  // These will be set in create_nodes and create_vis
  var svg = null;
  var bubbles = null;
  var nodes = [];
  var stateHistory = [];
  var orig_nodes = null;
  function charge(d) {
    return -Math.pow(d.radius*scaleing, 2.0) / 8;
  }

  var force = d3.layout.force()
    .size([width, height])
    .charge(charge)
    .gravity(-0.01)
    .friction(0.8);

  // Sizes bubbles based on their area instead of raw radius
  var radiusScale = d3.scale.pow()
    .exponent(0.5)
    .range([2, 10]);

    var div = d3.select("body")
    .append("div")  // declare the tooltip div
    .attr("class", "tooltip")
    .style("opacity", 0);
    //.text("a simple tooltip");

  function deletePackage(toDelete) {
    saveState()
    nodes = nodes.filter(function(d) {if (toDelete != groupFilter(d)) {
                                      return d
                                      }})
    animate()
  }

  function saveState() {
      let state = {}
      state.targetFunction = targetFunction
      state.renderFunction = renderFunction
      state.groupFilter = groupFilter
      state.groupSort = groupSort
      state.nodes = nodes
      stateHistory.push(state)
  }

  function restore() {
    state = stateHistory.pop()
    targetFunction = state.targetFunction
    renderFunction = state.renderFunction
    groupFilter = state.groupFilter
    groupSort = state.groupSort
    nodes = state.nodes
    animate()
  }



  function animate() {
    // calcGenreCenters()
    console.log(nodes)
    force.nodes(nodes)
    renderFunction()
    force.alpha(1)
    animation()
  }

  function getTheData(root) {
      // Get the node values
    var test = classes(root)
    console.log(test)
    // test.sort(function (a, b) { return b.size - a.size; })
    return test;
  }

  function calcGroupCenters(groups) {
    var local_groups = []
    devs = width/(groups.length+2)
    curr = 0;
    for (var i =0; i<groups.length; i++) {
      curr += devs
      local_groups.push({name: groups[i], x:curr, y:height/2})
    }

    return local_groups
  }

  function groups_from_data(data) {
    var groups = []
    data.forEach(function(d) { if (!inArray(groups, groupFilter(d))) { (groups.push(groupFilter(d)))};})
	  groups.sort(groupSort)
    return groups
  }

  function classes(root) {
    var classes = []
    var movies = {}
    var tv = {}

    function group(name,node,array_to_push) {
      array_to_push.name = node.name
      array_to_push.value = node.size
      array_to_push.radius = Math.pow(node.size,0.5)/20;
      array_to_push.x = Math.random() * 900,
      array_to_push.y= Math.random() * 800
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
                           radius: Math.pow(node.size,0.5)/10,
                           x: Math.random() * 900,
                           y: Math.random() * 800
      });}
    }

    group(null, root.TV, tv)
    group(null, root.Movies, movies)
    console.log(tv)
    console.log(movies)
    // return { "Movies": movies, "TV": tv}
    return [movies, tv]
  }

  function expandGroup(to_expand){
    console.log(to_expand)
    saveState()
    result  = nodes.filter(function(d) {console.log(d.name); if (to_expand === d.name) {
                                      console.log(d.name + " == " + to_expand);
                                      return d
                                      }})
    console.log(result)
    nodes = result[0].children
    console.log(nodes)
    renderFunction = render_chart
    animate()
  }

  function render_root() {
     bubbles = svg.selectAll('g.node')
      .data(nodes, function (d) {return d.name; });


    bubbles.select("circle")
    .attr("r",function(d) { return d.radius*scaleing }).transition().duration(3).attr("r", function(d) { return d.radius*scaleing });

        // .style("fill", function(d) { console.log(intToRGB(groupFilter(d))); return intToRGB(groupFilter(d.genre)); })

    // bubbles.select("circle").style("fill", function(d) { return intToRGB(hashCode(d.genre)); });
    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    bubbleEnter = bubbles.enter().append('g')
    bubbleEnter.classed("node",true)
    console.log(scaleing)
    bubbleEnter.append("circle")
        .style("fill", function(d) { return intToRGB(hashCode(d.name)); })
        .attr("r",0).transition().duration(3).attr("r", function(d) { return d.radius*scaleing });

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
      .on("click", function(d){ expandGroup(d.name)});


    bubbleExit =  bubbles.exit()
    bubbleExit.transition().duration(5).select("circle").attr("r",0)
    bubbleExit.transition().duration(5).remove();
  }

  function render_chart() {
    bubbles = svg.selectAll('g.node')
      .data(nodes, function (d) { return d.name; });


    bubbles.select("circle")
    .attr("r",function(d) { return d.radius*scaleing }).transition().duration(3).attr("r", function(d) { return d.radius*scaleing });
        // .style("fill", function(d) { console.log(intToRGB(groupFilter(d))); return intToRGB(groupFilter(d.genre)); })
    bubbles.select("text")
      .text(function(d) { return d.name.substring(0, d.radius*scaleing / 3); });


    // bubbles.select("circle").style("fill", function(d) { return intToRGB(hashCode(d.genre)); });
    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.

    bubbleEnter = bubbles.enter().append('g')
    bubbleEnter.classed("node",true)

    bubbleEnter.append("circle")
        .style("fill", function(d) { return intToRGB(hashCode(d.genre)); })
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
      .on("click", function(d){ deletePackage(groupFilter(d))});


    bubbleExit =  bubbles.exit()
    bubbleExit.transition().duration(5).select("circle").attr("r",0)
    bubbleExit.transition().duration(5).remove();

    groups = groups_from_data(nodes)
    globalGroups = calcGroupCenters(groups)
    showLabels(globalGroups)
  }

  var chart = function chart(selector, rawData) {
    ///// Button Related things:


    // Use the max total_amount in the data as the max in the scale's domain
    // note we have to ensure the total_amount is a number by converting it
    // with `+`.
    var maxAmount = d3.max(rawData, function (d) { return +d.radius; });
    radiusScale.domain([0, maxAmount]);
    console.log(rawData)
    console.log(rawData.name)
    //nodes = rawData
    nodes = getTheData(rawData);
    console.log(nodes)
    orig_nodes = nodes;
    //calcGenreCenters();
    // Set the force's nodes to our newly created nodes array.
    force.nodes(nodes);

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select('#vis')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Bind nodes data to what will become DOM elements to represent them.
    renderFunction()
    force.start()
    // Set initial layout to single group.
    animate();
  };

  function animation() {
      force.on('tick', function (e) {
         bubbles.each(targetFunction(e.alpha))
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
          // .attr('cx', function (d) { console.log(d); return d.x; })
          // .attr('cy', function (d) { return d.y; });

       });
    force.start();
  }

  function showLabels(groups) {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var labels = svg.selectAll('.label')
      .data(globalGroups, function (d) {return d.name});

    labels
      .attr('id', 'update')
      .attr('x', function (d) { return d.x; })
      .attr('y', function (d) { return 40; })

    labels.enter().append('text')
      .attr('class', 'label')
      .style('fill',  function(d) { return intToRGB(hashCode(d.name));} )
      .attr('x', function (d) { return d.x; })
      .attr('y', function (d) { return 40; })
      .attr('text-anchor', 'middle')
      .text(function (d) { return d.name; })
      .on("click", function(d){ deletePackage(d.name)});


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
    // PROBLEM IS HERE
    // console.log(target)
    d.x = d.x + (target.x - d.x) * damper * alpha * 1.1;
    d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
  };
  }

  ///// Button related things
  // Button function mappings:
  d3.select("#splitGenre").on("click",splitGenreButton);
  d3.select("#splitYear").on("click",splitYearButton);
  d3.select("#oneGroup").on("click",oneGroup);
  d3.select("#Restore").on("click",Restore);
  d3.select("#removeWatched").on("click",removeWatched);
  d3.select("#undo").on("click",restore);
  d3.select("#year_slider").call(d3.slider().value([10, 50 ]))
  d3.select("#zoom_slider").call(d3.slider().value(20).on("slide", function(evt, value) {
                                prev_scaleing = scaleing;
                                scaleing = value/50;
                                console.log("Scale now equals:" + value)
                                animate()
                              }))



  // Group Data by Genre
  function splitGenreButton() {
    saveState()
    groupFilter = function (d) {return d.genre};
    groupSort = function (a,b) {return d3.ascending(a,b)}
    targetFunction = moveToGenre
    force.alpha(100000);
    animate()
  }

  function splitYearButton() {
    saveState()
    groupFilter = function (d) {return d.year};
    groupSort = function (a,b) {return b-a}
    targetFunction = moveToGenre
    force.alpha(100000);
    animate()
  }

  function oneGroup() {
    saveState()
    groupFilter = function (d) {return d.genre};
    groupSort = function (a,b) {return d3.ascending(a,b)}
    targetFunction = moveToCenter
    force.alpha(100000);
    animate()
  }

function removeWatched() {
    saveState()
    nodes = nodes.filter(function(d) {if ("False" === d.watch) {
                                  return d
                                  }})
    force.alpha(100000);
    animate()
  }

  // Restore any removed Data
  function Restore() {
    nodes = orig_nodes
    animate()
  }


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