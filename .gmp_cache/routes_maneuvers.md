# Return Directions Between Coordinates with Maneuver Steps

Calculate routes between two or more sets of latitude/longitude coordinates (or
addresses/Place IDs) and retrieve step-by-step maneuver descriptions, polylines,
distances, and travel times using the Maps JavaScript API **Routes library**.

> **Important:** The `Route` and `RouteMatrix` classes in the Routes library
> (`google.maps.routes`) replace the legacy `DirectionsService` and
> `DistanceMatrixService` objects. Always prefer `Route.computeRoutes()` for new
> implementations.

--------------------------------------------------------------------------------

## Overview

To compute a route and inspect maneuver instructions for each step along the
route:

1.  Load the `routes` library using `google.maps.importLibrary('routes')` (or
    `useMapsLibrary('routes')` in React).
2.  Construct a `google.maps.routes.ComputeRoutesRequest` object specifying
    `origin`, `destination`, `travelMode`, and the required `fields` (such as
    `'path'`, `'legs'`, `'viewport'`, `'distanceMeters'`, `'durationMillis'`).
3.  Call `Route.computeRoutes(request)`.
4.  Render the route on the map using helper methods (`route.createPolylines()`
    and `route.createWaypointAdvancedMarkers()`) and iterate through
    `route.legs` and `leg.steps` to access step-by-step instructions and
    geometry.

--------------------------------------------------------------------------------

## Modern Pattern: `Route.computeRoutes()`

### 1. Vanilla JavaScript / TypeScript Implementation

The following example calculates a route between two coordinate pairs, renders
the route polyline and waypoint markers on a map, and extracts step-by-step
maneuver instructions from the route legs.

```typescript
async function initMap(): Promise<void> {
  const { Map } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;
  const { Route } = (await google.maps.importLibrary('routes')) as google.maps.RoutesLibrary;

  const map = new Map(document.getElementById('map') as HTMLElement, {
    zoom: 13,
    center: { lat: 40.771, lng: -73.974 },
    mapId: 'DEMO_MAP_ID', // Required for Advanced Markers
    internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
  });

  const request: google.maps.routes.ComputeRoutesRequest = {
    origin: { lat: 40.771, lng: -73.974 },
    destination: { lat: 40.758, lng: -73.985 },
    travelMode: 'WALKING',
    // Specify 'legs' to retrieve step-by-step maneuver instructions and geometry
    fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
  };

  try {
    const { routes } = await Route.computeRoutes(request);
    if (!routes || routes.length === 0) return;

    const route = routes[0];

    // 1. Render route polylines on the map
    const polylines = route.createPolylines();
    polylines.forEach((polyline) => {
      polyline.setOptions({
        strokeColor: '#3b82f6',
        strokeOpacity: 0.85,
        strokeWeight: 6,
      });
      polyline.setMap(map);
    });

    // 2. Render origin/destination/waypoint Advanced Markers
    const markers = await route.createWaypointAdvancedMarkers();
    markers.forEach((marker) => {
      marker.map = map;
    });

    // 3. Fit map to the route viewport
    if (route.viewport) {
      map.fitBounds(route.viewport);
    }

    // 4. Extract maneuver descriptions from route legs and steps
    const stepsPanel = document.getElementById('steps-panel');
    if (stepsPanel && route.legs) {
      stepsPanel.innerHTML = '';
      route.legs.forEach((leg, legIndex) => {
        leg.steps?.forEach((step, stepIndex) => {
          const stepEl = document.createElement('div');
          stepEl.textContent = `Leg ${legIndex + 1}, Step ${stepIndex + 1}: ${
            step.instructions || ''
          } (${step.distanceMeters}m)`;
          stepsPanel.appendChild(stepEl);
        });
      });
    }
  } catch (error) {
    console.error('Error computing routes:', error);
  }
}

initMap();
```

--------------------------------------------------------------------------------

### 2. React Implementation (`@vis.gl/react-google-maps`)

When using React, manage async lifecycle state and clean up previously created
`Polyline` and `AdvancedMarkerElement` instances when inputs change or the
component unmounts.

Source:
[visgl/react-google-maps/examples/directions/src/app.tsx](https://github.com/visgl/react-google-maps/blob/HEAD/examples/directions/src/app.tsx?utm_campaign=gmp_git_agentskills_v1)

```tsx
import React, { useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY as string;

export default function App() {
  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        mapId={'bf51a910020fa25a'}
        defaultCenter={{ lat: -23.588363, lng: -46.658475 }}
        defaultZoom={15}
        gestureHandling={'greedy'}
        fullscreenControl={false}
        internalUsageAttributionIds={['gmp_git_agentskills_v1']}>
        <Directions
          origin={{ lat: -23.598, lng: -46.642 }}
          destination={{ lat: -23.592, lng: -46.665 }}
          travelMode="DRIVING"
        />
      </Map>
    </APIProvider>
  );
}

interface DirectionsProps {
  origin: google.maps.LatLngLiteral | string;
  destination: google.maps.LatLngLiteral | string;
  travelMode?: google.maps.TravelModeString;
}

export function Directions({
  origin,
  destination,
  travelMode = 'DRIVING',
}: DirectionsProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');

  // Refs for cleaning up polylines and markers created with the Routes API
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;

    // Cancel async operations on unmount (no AbortSignal support in Routes API)
    let isCancelled = false;

    // Clean up previous polylines & markers
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    markersRef.current.forEach((m) => {
      m.map = null;
    });
    markersRef.current = [];

    const request: google.maps.routes.ComputeRoutesRequest = {
      origin,
      destination,
      travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
      internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
    };

    routesLib.Route.computeRoutes(request)
      .then(async ({ routes }) => {
        if (isCancelled) return;
        if (!routes || routes.length === 0) return;

        const route = routes[0];

        // Render and append polylines
        const newPolylines = route.createPolylines();
        newPolylines.forEach((polyline) => {
          polyline.setOptions({
            strokeColor: '#3b82f6',
            strokeOpacity: 0.85,
            strokeWeight: 6,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        // Render waypoint advanced markers
        const newMarkers = await route.createWaypointAdvancedMarkers();

        if (isCancelled) return;

        newMarkers.forEach((marker) => {
          marker.map = map;
        });
        markersRef.current = newMarkers;

        if (route.viewport) map.fitBounds(route.viewport);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Error computing routes:', err);
      });

    return () => {
      isCancelled = true;

      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];

      markersRef.current.forEach((marker) => {
        marker.map = null;
      });
      markersRef.current = [];
    };
  }, [routesLib, map, origin, destination, travelMode]);

  return null;
}
```

--------------------------------------------------------------------------------

## Legacy Pattern: `DirectionsService` and `DirectionsRenderer`

In existing codebases using the legacy `DirectionsService`, routes and
step-by-step maneuver instructions are accessed via
`result.routes[0].legs[i].steps[j]`.

### Displaying Step Markers and InfoWindows Along a Route

Source:
[googlemaps/js-samples/samples/directions-complex/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/directions-complex/index.ts?utm_campaign=gmp_git_agentskills_v1)

```typescript
function initMap(): void {
  const markerArray: google.maps.Marker[] = [];
  const directionsService = new google.maps.DirectionsService();

  const map = new google.maps.Map(
    document.getElementById('map') as HTMLElement,
    {
      zoom: 13,
      center: { lat: 40.771, lng: -73.974 },
      internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
    }
  );

  const directionsRenderer = new google.maps.DirectionsRenderer({ map });
  const stepDisplay = new google.maps.InfoWindow();

  calculateAndDisplayRoute(
    directionsRenderer,
    directionsService,
    markerArray,
    stepDisplay,
    map
  );
}

function calculateAndDisplayRoute(
  directionsRenderer: google.maps.DirectionsRenderer,
  directionsService: google.maps.DirectionsService,
  markerArray: google.maps.Marker[],
  stepDisplay: google.maps.InfoWindow,
  map: google.maps.Map
) {
  // First, remove any existing markers from the map.
  for (let i = 0; i < markerArray.length; i++) {
    markerArray[i].setMap(null);
  }

  directionsService
    .route({
      origin: { lat: 40.771, lng: -73.974 },
      destination: { lat: 40.758, lng: -73.985 },
      travelMode: google.maps.TravelMode.WALKING,
    })
    .then((result: google.maps.DirectionsResult) => {
      directionsRenderer.setDirections(result);
      showSteps(result, markerArray, stepDisplay, map);
    })
    .catch((e) => {
      window.alert('Directions request failed due to ' + e);
    });
}

function showSteps(
  directionResult: google.maps.DirectionsResult,
  markerArray: google.maps.Marker[],
  stepDisplay: google.maps.InfoWindow,
  map: google.maps.Map
) {
  const myRoute = directionResult.routes[0]!.legs[0]!;

  for (let i = 0; i < myRoute.steps.length; i++) {
    const marker = (markerArray[i] =
      markerArray[i] || new google.maps.Marker());

    marker.setMap(map);
    marker.setPosition(myRoute.steps[i].start_location);
    attachInstructionText(
      stepDisplay,
      marker,
      myRoute.steps[i].instructions,
      map
    );
  }
}

function attachInstructionText(
  stepDisplay: google.maps.InfoWindow,
  marker: google.maps.Marker,
  text: string,
  map: google.maps.Map
) {
  google.maps.event.addListener(marker, 'click', () => {
    stepDisplay.setContent(text);
    stepDisplay.open(map, marker);
  });
}
```

### Multi-Waypoint Optimization and Leg Summaries

When routing through intermediate waypoints (`waypoints` array with
`optimizeWaypoints: true`), the route contains multiple `legs`—one for each
segment between stopover waypoints:

Source:
[googlemaps/js-samples/samples/directions-waypoints/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/directions-waypoints/index.ts?utm_campaign=gmp_git_agentskills_v1)

```typescript
directionsService
  .route({
    origin: { lat: 41.85, lng: -87.65 },
    destination: { lat: 34.0522, lng: -118.2437 },
    waypoints: [
      { location: { lat: 38.627, lng: -90.1994 }, stopover: true },
      { location: { lat: 35.1983, lng: -111.6513 }, stopover: true },
    ],
    optimizeWaypoints: true,
    travelMode: google.maps.TravelMode.DRIVING,
  })
  .then((response) => {
    directionsRenderer.setDirections(response);

    const route = response.routes[0];
    const summaryPanel = document.getElementById('directions-panel') as HTMLElement;
    summaryPanel.innerHTML = '';

    for (let i = 0; i < route.legs.length; i++) {
      const routeSegment = i + 1;
      summaryPanel.innerHTML += `<b>Route Segment: ${routeSegment}</b><br>`;
      summaryPanel.innerHTML += `${route.legs[i].start_address} to ${route.legs[i].end_address}<br>`;
      summaryPanel.innerHTML += `${route.legs[i].distance!.text}<br><br>`;
    }
  })
  .catch((e) => window.alert('Directions request failed due to ' + e));
```

--------------------------------------------------------------------------------

## Best Practices & Error Handling

1.  **Field Masking (`fields`)**: When calling `Route.computeRoutes()`, you must
    explicitly request the fields you need (e.g., `['path', 'legs', 'viewport',
    'distanceMeters', 'durationMillis']`). Omitting `'legs'` will prevent
    step-by-step instructions from being returned.
2.  **Resource Cleanup**: `route.createPolylines()` and
    `route.createWaypointAdvancedMarkers()` create map objects that persist
    across route recalculations. Always store references to created polylines
    and markers and clear them (`polyline.setMap(null)` and `marker.map = null`)
    before rendering a new route.
3.  **Transient Error Retries**: Network or quota errors (`OVER_QUERY_LIMIT`,
    `UNKNOWN_ERROR`) are transient and can be retried with backoff, whereas
    `INVALID_REQUEST` or `ZERO_RESULTS` should not be retried with identical
    parameters. (See
    [googlemaps/extended-component-library/src/place_building_blocks/place_distance_label/directions_controller.ts](https://github.com/googlemaps/extended-component-library/blob/HEAD/src/place_building_blocks/place_distance_label/directions_controller.ts?utm_campaign=gmp_git_agentskills_v1)).

## Reference Links

-   [Route class overview](https://developers.google.com/maps/documentation/javascript/routes/route-class-overview)
-   [Migrate to the new `Route` class](https://developers.google.com/maps/documentation/javascript/routes/routes-js-migration)
-   [Route matrix class overview](https://developers.google.com/maps/documentation/javascript/routes/route-matrix-class-overview)
-   [Get started with the Routes library](https://developers.google.com/maps/documentation/javascript/routes/start)
