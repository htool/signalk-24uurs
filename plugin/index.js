const halfPi = Math.PI / 2

module.exports = function (app) {
  var plugin = {}
  var unsubscribes = []
  var timers = []
  var damping = {}

  plugin.id = 'signalk-24uurs'
  plugin.name = '24 uurs'
  plugin.description = 'A plugin that calculates the best order of legs to sail for the most miles in 24 hours'

  plugin.uiSchema = {
    legsTable: { "ui:widget": "textarea" }
  }

  var schema = {
    // The plugin schema
    properties: {
      legsTable: {
        type: "string",
        title: "Copy/paste the csv content of the rakkenkaart Excel export."
      }
    }
  }

  plugin.schema = function() {
    // updateSchema()
    return schema
  }


  plugin.start = function (options, restartPlugin) {
    // Here we put our plugin logic
    app.debug('Plugin started');
    var unsubscribes = [];
    app.debug('Options: %s', JSON.stringify(options))

    plugin.registerWithRouter = function(router) {
      // Will appear here; plugins/signalk-24uurs-plugin/
      app.debug("registerWithRouter")
      router.get("/route", (req, res) => {
        res.contentType("application/json")
        res.send(JSON.stringify(route))
      })
    }
    
   
    // Global variables
    var legs = loadLegs(2)
    var startLegs = loadLegs(1)
    var finishLeg = loadLegs(0)
    var BSP = 5

    app.debug('startLegs: %s', JSON.stringify(startLegs))
    app.debug('legs: %s', JSON.stringify(legs))
    app.debug('finishLeg: %s', JSON.stringify(finishLeg))
    
    function generatePaths() {
      for (const [id, value] of Object.entries(startLegs)) {
        var routes = generateRoutes (id)
        routes.forEach(route => {
          app.debug('route: %s', JSON.stringify(route))
        })
      }
    }
   
    function generateRoutes (startLegId) {
      var routes = []
      var route = {distance: startLegs[startLegId].distance, time: startLegs[startLegId].distance / BSP, legs: [startLegId], waypoints: [startLegs[startLegId].start, startLegs[startLegId].end]}
      // Add finish distance and time
      route.distance = route.distance + Object.values(finishLeg)[0].distance
      route.time = route.time + Object.values(finishLeg)[0].distance / BSP
      completeRoute(route)
      routes.push(route)
        
      return routes
    } 

    function completeRoute (route) {
      route = nextWaypoint(route)
      app.debug('completeRoute: %s', JSON.stringify(route))
    }

    function elementCount(arr, element) {
      return arr.filter((currentElement) => currentElement == element).length
    }

    function nextWaypoint (route) {
      let currentWpt = route.waypoints[route.waypoints.length -1]
      for (const [id, value] of Object.entries(legs)) {
        let newRoute = route
        if (value.start == currentWpt || value.end == currentWpt) {
          if (elementCount(route.legs, id) < 2) {
            if (route.distance + value.distance > 24) {
              if (value.start == currentWpt) {
                newRoute = routeAdd(newRoute, id, value.end)
              } else {
                newRoute = routeAdd(newRoute, id, value.start)
              }
              newRoute = nextWaypoint (newRoute)
              return newRoute
            } else {
              // Going over 24 hours, so check if we're at finish waypoint
              if (currentWpt == finishleg.start) {
                // Working route
                app.debug('Working route: %s', JSON.stringify(route))
              } else {
                return null
              }
            }
          }
        }
      }
    }

    function routeAdd(route, id, waypoint) {
      // app.debug('routeAdd: %s', JSON.stringify(route))
      route.distance = route.distance + legs[id].distance
      route.time = route.time + legs[id].distance / BSP
      route.legs.push(id)
      route.waypoints.push(waypoint)
      return route
    }

    function countLegs (route, leg) {
      
    }

    generatePaths()

    // Subscribe to paths
    let localSubscription = {
      context: '*',
      subscribe: [
        {
          path: 'performance.velocityMadeGood',
          policy: 'instant'
        }
      ]
    }

    app.subscriptionmanager.subscribe(
      localSubscription,
      unsubscribes,
      subscriptionError => {
        app.error('Error:' + subscriptionError);
      },
      delta => {
        delta.updates.forEach(u => {
          // app.debug(u.values)
          handleDelta(u.values)
        })
      }
    )

    // Handle delta
    function handleDelta (deltas) {
      deltas.forEach(delta => {
	      // app.debug('handleData: %s', JSON.stringify(delta))
      })
    }

    function sendUpdates (perfObj) {
      let values = []
      let metas = []
      if (options.tackTrue == true) {
        if (typeof perfObj.tackTrue != 'undefined') {
          values.push({path: 'performance.tackTrue', value: roundDec(perfObj.tackTrue)})
        }
      }

      app.debug('sendUpdates: %s', JSON.stringify(values))
      app.handleMessage(plugin.id, {
        updates: [
          {
            values: values,
            meta: metas
          }
        ]
      })
    }

    function loadLegs (count) {
      app.debug('Loading legs')
      var legsObject = {}
      options.legsTable.split('\n').forEach(row => {
        if (Number(row[row.length-1]) == count) {
          let rowArray = row.split(';')
          var id = rowArray[0]+'/'+rowArray[1]
          let distance = Number(rowArray[2].replace(',','.'))
          let count = Number(rowArray[3])
          legsObject[id] = {start: rowArray[0], end: rowArray[1], distance: distance, count: count}
        }
      })
      return legsObject
    }

  }

  plugin.stop = function () {
    // Here we put logic we need when the plugin stops
    app.debug('Plugin stopped');
    plugin.stop = function () {
      unsubscribes.forEach(f => f());
      unsubscribes = [];
      timers.forEach(timer => {
        clearInterval(timer)
      }) 
    };

  };

  return plugin;
};


function radToDeg(radians) {
  return radians * 180 / Math.PI
}

function degToRad(degrees) {
  return degrees * (Math.PI/180.0)
}

function ktsToMs(knots) {
  return knots / 1.94384
}

function msToKts(ms) {
  return ms * 1.94384
}

function roundDec (value) {
  if (typeof value == 'undefined') {
    return undefined
  } else {
    value = Number(value.toFixed(3))
    return value
  }
}

