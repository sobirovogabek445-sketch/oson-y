# Specify the Travel Mode for a Route Request

This capability guide covers specifying the travel mode (such as driving,
walking, bicycling, transit, or two-wheeled motorized vehicles) when requesting
routes in the Maps JavaScript API.

## Overview

The Maps JavaScript API provides the `Route` and `RouteMatrix` classes in the
`routes` library (which replace the legacy `DirectionsService` and
`DistanceMatrixService` objects). Both the modern Routes library and the legacy
Directions service allow you to specify how a user will travel between locations
so the API can return an appropriate path, distance, and duration.

### Supported Travel Modes

#### `Route` Class (`google.maps.routes.Route`)

When using `Route.computeRoutes()` or `RouteMatrix.computeRouteMatrix()`,
specify the `travelMode` parameter in the request object. The `Route` class
supports directions with real-time traffic for:

-   **Driving** (`DRIVING`)
-   **Transit** (`TRANSIT`)
-   **Walking** (`WALKING`)
-   **Bicycling** (`BICYCLING`)
-   **2-wheel motorized vehicles** (`TWO_WHEELER`)

#### Legacy `DirectionsService` (`google.maps.DirectionsService`)

When using the legacy `DirectionsService.route()` method, specify the
`travelMode` property using the `google.maps.TravelMode` enum:

-   `google.maps.TravelMode.DRIVING` (Default)
-   `google.maps.TravelMode.TRANSIT`
-   `google.maps.TravelMode.WALKING`
-   `google.maps.TravelMode.BICYCLING`
-   `google.maps.TravelMode.TWO_WHEELER`

--------------------------------------------------------------------------------

## Implementation Patterns

### 1. Using the `Route` Class (`routes` Library)

The modern `Route.computeRoutes()` method accepts a `ComputeRoutesRequest`
object containing the `travelMode` and required `fields`.

```javascript
async function calculateRouteWithMode(selectedMode = 'DRIVING') {
  // Import the Map and Routes libraries
  const { Map } = await google.maps.importLibrary('maps');
  const { Route } = await google.maps.importLibrary('routes');

  const map = new Map(document.getElementById('map'), {
    zoom: 14,
    center: { lat: 37.77, lng: -122.447 },
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
  });

  // Construct the ComputeRoutesRequest
  const request = {
    origin: { lat: 37.77, lng: -122.447 }, // Haight
    destination: { lat: 37.768, lng: -122.511 }, // Ocean Beach
    travelMode: selectedMode, // 'DRIVING', 'TRANSIT', 'WALKING', 'BICYCLING', or 'TWO_WHEELER'
    fields: ['path', 'legs', 'viewport'],
    internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
  };

  try {
    const { routes } = await Route.computeRoutes(request);
    if (routes && routes.length > 0) {
      const route = routes[0];

      // Render the route on the map using createPolylines()
      const polylines = route.createPolylines();
      polylines.forEach((polyline) => polyline.setMap(map));

      // Adjust map viewport to fit the route
      if (route.viewport) {
        map.fitBounds(route.viewport);
      }
    }
  } catch (error) {
    console.error('Routes request failed:', error);
  }
}
```

### 2. Switching Travel Modes Dynamically (Legacy `DirectionsService`)

The following sample from the official Google Maps JavaScript samples
demonstrates listening to a UI `<select>` element to dynamically update the
`travelMode` using `google.maps.TravelMode[selectedMode]`.

Source:
[samples/directions-travel-modes/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/directions-travel-modes/index.ts?utm_campaign=gmp_git_agentskills_v1)

```typescript
function initMap(): void {
  const directionsRenderer = new google.maps.DirectionsRenderer();
  const directionsService = new google.maps.DirectionsService();
  const map = new google.maps.Map(
    document.getElementById("map") as HTMLElement,
    {
      zoom: 14,
      center: { lat: 37.77, lng: -122.447 },
      internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
    }
  );

  directionsRenderer.setMap(map);

  calculateAndDisplayRoute(directionsService, directionsRenderer);
  (document.getElementById("mode") as HTMLInputElement).addEventListener(
    "change",
    () => {
      calculateAndDisplayRoute(directionsService, directionsRenderer);
    }
  );
}

function calculateAndDisplayRoute(
  directionsService: google.maps.DirectionsService,
  directionsRenderer: google.maps.DirectionsRenderer
) {
  const selectedMode = (document.getElementById("mode") as HTMLInputElement)
    .value as keyof typeof google.maps.TravelMode;

  directionsService
    .route({
      origin: { lat: 37.77, lng: -122.447 }, // Haight.
      destination: { lat: 37.768, lng: -122.511 }, // Ocean Beach.
      // Access the TravelMode constant using bracket notation:
      // e.g., "DRIVING", "WALKING", "BICYCLING", "TRANSIT", "TWO_WHEELER"
      travelMode: google.maps.TravelMode[selectedMode],
    })
    .then((response) => {
      directionsRenderer.setDirections(response);
    })
    .catch((e) => window.alert("Directions request failed due to " + e.message));
}
```

#### Corresponding HTML Control

```html
<div id="floating-panel">
  <b>Mode of Travel: </b>
  <select id="mode">
    <option value="DRIVING">Driving</option>
    <option value="WALKING">Walking</option>
    <option value="BICYCLING">Bicycling</option>
    <option value="TRANSIT">Transit</option>
  </select>
</div>
<div id="map"></div>
```

--------------------------------------------------------------------------------

### 3. Step-Level Travel Mode Styling (Multi-Modal Transit Routes)

When requesting a `TRANSIT` route, individual steps within a route leg
(`route.legs[0].steps`) may have different travel modes (for example, `WALK`
steps to reach a station followed by `TRANSIT` steps on a train or bus). You can
inspect `step.travelMode` and `step.transitDetails` to style each segment
appropriately.

Source:
[examples/routes-api/src/components/route.tsx](https://github.com/visgl/react-google-maps/blob/HEAD/examples/routes-api/src/components/route.tsx?utm_campaign=gmp_git_agentskills_v1)

```tsx
// Every step of the route is visualized using a polyline;
// color and weight depend on the travel mode. For public transit lines
// with established colors, the official color will be used.
const polylines = routeSteps.map((step, index) => {
  const isWalking = step.travelMode === 'WALK';
  const color = isWalking
    ? appearance.walkingPolylineColor
    : (step?.transitDetails?.transitLine?.color ??
      appearance.defaultPolylineColor);

  return (
    <Polyline
      key={`${index}-polyline`}
      encodedPath={step.polyline.encodedPolyline}
      strokeWeight={isWalking ? 2 : 6}
      strokeColor={color}
    />
  );
});
```

--------------------------------------------------------------------------------

### 4. Declarative Web Components (`@googlemaps/extended-component-library`)

If you are using the Google Maps Extended Component Library
(`<gmpx-route-data-provider>`), you can set the travel mode declaratively via
the `travel-mode` HTML attribute (lowercase) or the `travelMode` property. The
component automatically normalizes the value to uppercase
`google.maps.TravelMode` before executing the request.

Source:
[src/route_building_blocks/route_data_provider/route_data_provider.ts](https://github.com/googlemaps/extended-component-library/blob/HEAD/src/route_building_blocks/route_data_provider/route_data_provider.ts?utm_campaign=gmp_git_agentskills_v1)

```html
<gmp-map
  center="37.77,-122.48"
  zoom="13"
  map-id="DEMO_MAP_ID"
  internal-usage-attribution-ids="gmp_git_agentskills_v1">

  <gmpx-route-data-provider
    origin-address="Haight-Ashbury, San Francisco, CA"
    destination-address="Ocean Beach, San Francisco, CA"
    travel-mode="walking">

    <gmpx-route-polyline fit-in-viewport stroke-color="#4285F4" stroke-weight="5"></gmpx-route-polyline>
    <gmpx-route-marker waypoint="origin"></gmpx-route-marker>
    <gmpx-route-marker waypoint="destination"></gmpx-route-marker>

  </gmpx-route-data-provider>
</gmp-map>
```

--------------------------------------------------------------------------------

## Best Practices & Troubleshooting

-   **Migrate to the `Route` Class**: The `Route` and `RouteMatrix` classes in
    the `routes` library replace `DirectionsService` and
    `DistanceMatrixService`. Prefer `Route.computeRoutes()` for new development.
-   **Case Sensitivity**: `google.maps.TravelMode` constants and `Route` travel
    mode strings are uppercase (`'DRIVING'`, `'WALKING'`, `'BICYCLING'`,
    `'TRANSIT'`, `'TWO_WHEELER'`). When binding to HTML inputs or custom
    attributes, ensure values are converted using `.toUpperCase()` or mapped to
    `google.maps.TravelMode` enum keys.
-   **Regional Availability & EEA Compliance**: Travel modes like `TRANSIT`,
    `BICYCLING`, and `TWO_WHEELER` vary in availability depending on regional
    data coverage. Always attach a `.catch()` handler or `try / catch` block to
    handle `ZERO_RESULTS` or unsupported mode errors gracefully.
-   **Transit Layer Overlay**: When displaying `TRANSIT` routes, you can
    optionally overlay the public transit network on the map using `new
    google.maps.TransitLayer()` and calling `transitLayer.setMap(map)`
    ([samples/layer-transit/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/layer-transit/index.ts?utm_campaign=gmp_git_agentskills_v1)).
