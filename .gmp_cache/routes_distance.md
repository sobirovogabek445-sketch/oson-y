# Return the Distance for a Route Between Coordinates

This capability guide details how to compute travel distances and durations
between two or more sets of latitude/longitude coordinates using the **Routes
Library** in the Maps JavaScript API.

> **European Economic Area (EEA) developers** If your billing address is in the
> European Economic Area, effective on 8 July 2025, the
> [Google Maps Platform EEA Terms of Service](https://cloud.google.com/terms/maps-platform/eea)
> will apply to your use of the Services. Functionality varies by region.
> [Learn more](https://developers.google.com/maps/comms/eea/faq).

--------------------------------------------------------------------------------

## Overview: Modern vs. Legacy Classes

The **Routes Library** (`routes`) in the Maps JavaScript API includes the modern
`Route` and `RouteMatrix` classes, which replace the legacy `DirectionsService`
and `DistanceMatrixService` objects:

Use Case                                                         | Modern Class (Recommended)       | Legacy Class                        | Key Method
:--------------------------------------------------------------- | :------------------------------- | :---------------------------------- | :---------
**Single Route** (with optional intermediate waypoints)          | `google.maps.routes.Route`       | `google.maps.DirectionsService`     | `Route.computeRoutes()`
**Multi-Origin / Multi-Destination Matrix** (up to 625 elements) | `google.maps.routes.RouteMatrix` | `google.maps.DistanceMatrixService` | `RouteMatrix.computeRouteMatrix()`

--------------------------------------------------------------------------------

## 1. Using the Modern `Route` Class (Single Route / Waypoints)

The `Route` class provides the `computeRoutes()` method, which returns the ideal
route—along with distance and duration—between two locations (and optional
intermediate locations) for driving, walking, biking, transit, or 2-wheel
motorized vehicles.

### Implementation Pattern

```typescript
async function getRouteDistance(
  originCoords: google.maps.LatLngLiteral,
  destinationCoords: google.maps.LatLngLiteral
) {
  // 1. Dynamically import the routes library
  const { Route } = (await google.maps.importLibrary(
    "routes"
  )) as google.maps.RoutesLibrary;

  // 2. Build the ComputeRoutesRequest with usage attribution
  const request: google.maps.routes.ComputeRoutesRequest = {
    origin: originCoords,
    destination: destinationCoords,
    travelMode: "DRIVING",
    fields: ["distanceMeters", "durationMillis", "legs"],
    internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
  };

  // 3. Compute the route and extract distance
  const { routes } = await Route.computeRoutes(request);

  if (routes && routes.length > 0) {
    const primaryRoute = routes[0];
    console.log(`Total Distance (meters): ${primaryRoute.distanceMeters}`);
    console.log(`Total Duration (ms): ${primaryRoute.durationMillis}`);
    return primaryRoute;
  }

  return null;
}
```

### Key References

-   [Route class overview](https://developers.google.com/maps/documentation/javascript/routes/route-class-overview)
-   [Migrate to the new `Route` class](https://developers.google.com/maps/documentation/javascript/routes/routes-js-migration)
-   [Try the Routes library demo](https://developers.google.com/maps/documentation/javascript/routes/demo)

--------------------------------------------------------------------------------

## 2. Using the Modern `RouteMatrix` Class (Multiple Coordinate Sets)

The `RouteMatrix` class returns distances and travel times for a matrix of
routes between multiple origin and destination locations (up to 625 route
elements).

### Implementation Pattern

```typescript
async function getDistanceMatrix(
  origins: google.maps.LatLngLiteral[],
  destinations: google.maps.LatLngLiteral[]
) {
  // 1. Dynamically import the routes library
  const { RouteMatrix } = (await google.maps.importLibrary(
    "routes"
  )) as google.maps.RoutesLibrary;

  // 2. Build the ComputeRouteMatrixRequest
  const request: google.maps.routes.ComputeRouteMatrixRequest = {
    origins: origins.map((coord) => ({ waypoint: coord })),
    destinations: destinations.map((coord) => ({ waypoint: coord })),
    travelMode: "DRIVING",
    fields: ["distanceMeters", "durationMillis", "condition"],
    internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
  };

  // 3. Compute the matrix
  const { matrix } = await RouteMatrix.computeRouteMatrix(request);
  return matrix;
}
```

### Key References

-   [Route matrix class overview](https://developers.google.com/maps/documentation/javascript/routes/route-matrix-class-overview)
-   [Migrate to the new `RouteMatrix` class](https://developers.google.com/maps/documentation/javascript/routes/route-matrix-js-migration)

--------------------------------------------------------------------------------

## 3. Verified Open-Source Code Patterns (Legacy & Migration Context)

While `Route` and `RouteMatrix` are recommended for new development, many
existing codebases and libraries interact with `DistanceMatrixService` and
`DirectionsService`. Below are verified patterns from official Google Maps
Platform repositories demonstrating coordinate handling, caching, and error
recovery.

### Distance Matrix with Coordinate and Address Mix

Source:
https://github.com/googlemaps/js-samples/blob/HEAD/samples/distance-matrix/index.ts?utm_campaign=gmp_git_agentskills_v1

This sample demonstrates querying distances across multiple origins and
destinations using `LatLngLiteral` coordinates alongside string addresses, and
fitting the map bounds to the results:

```typescript
async function initMap(): Promise<void> {
  const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
  const { DistanceMatrixService } = (await google.maps.importLibrary("routes")) as google.maps.RoutesLibrary;

  const map = new Map(document.getElementById("map") as HTMLElement, {
    center: { lat: 55.53, lng: 9.4 },
    zoom: 10,
    internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
  });

  const service = new DistanceMatrixService();

  // Coordinates can be LatLngLiteral objects or string queries
  const origin1 = { lat: 55.93, lng: -3.118 };
  const origin2 = "Greenwich, England";
  const destinationA = "Stockholm, Sweden";
  const destinationB = { lat: 50.087, lng: 14.421 };

  const request: google.maps.DistanceMatrixRequest = {
    origins: [origin1, origin2],
    destinations: [destinationA, destinationB],
    travelMode: google.maps.TravelMode.DRIVING,
    unitSystem: google.maps.UnitSystem.METRIC,
    avoidHighways: false,
    avoidTolls: false,
  };

  const response = await service.getDistanceMatrix(request);

  // Parse distance and duration for each origin-destination pair
  response.rows.forEach((row, originIndex) => {
    row.elements.forEach((element, destIndex) => {
      if (element.status === "OK") {
        console.log(
          `From Origin ${originIndex} to Dest ${destIndex}: ` +
          `${element.distance.text} (${element.distance.value}m) in ${element.duration.text}`
        );
      }
    });
  });
}
```

### Idiomatic Error Handling, Caching, and Retries

Source:
https://github.com/googlemaps/extended-component-library/blob/HEAD/src/place_building_blocks/place_distance_label/directions_controller.ts?utm_campaign=gmp_git_agentskills_v1

When computing route distances in reactive UI components, avoid redundant
network calls by caching promises and only retrying transient errors
(`OVER_QUERY_LIMIT` or `UNKNOWN_ERROR`). Non-transient errors (like
`INVALID_REQUEST` or `ZERO_RESULTS`) should not be automatically retried.

```typescript
/**
 * Determines whether a failed route request should be retried vs cached as a failure.
 */
function isTransientRouteError(error: google.maps.MapsRequestError): boolean {
  return (
    error.code === ("OVER_QUERY_LIMIT" as google.maps.DirectionsStatus) ||
    error.code === ("UNKNOWN_ERROR" as google.maps.DirectionsStatus)
  );
}

/**
 * Extracts formatted distance and duration from a single-leg route response.
 * Source: https://github.com/googlemaps/extended-component-library/blob/HEAD/src/place_building_blocks/place_distance_label/place_distance_label.ts?utm_campaign=gmp_git_agentskills_v1
 */
function extractLegDistanceAndDuration(result: google.maps.DirectionsResult | null) {
  const leg = result?.routes?.[0]?.legs?.[0];
  if (!leg) return null;

  return {
    distanceText: leg.distance?.text,   // e.g., "1.5 mi"
    distanceValue: leg.distance?.value, // Value in meters, e.g., 2414
    durationText: leg.duration?.text,   // e.g., "15 mins"
    durationValue: leg.duration?.value, // Value in seconds, e.g., 900
  };
}
```

### Visualizing Route Steps and Viewport Bounds in React

Source:
https://github.com/visgl/react-google-maps/blob/HEAD/examples/routes-api/src/components/route.tsx?utm_campaign=gmp_git_agentskills_v1

When working with the Routes API in React (`@vis.gl/react-google-maps`), you can
compute the route between `origin` and `destination` coordinates and
automatically adjust the map viewport using the returned `viewport` high/low
bounds:

```tsx
import React, { useEffect, useState } from 'react';
import { Map, useMap } from '@vis.gl/react-google-maps';

export function RouteView({
  apiClient,
  origin,
  destination,
  routeOptions
}: {
  apiClient: any;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  routeOptions?: any;
}) {
  const [route, setRoute] = useState<any>(null);
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    apiClient.computeRoutes(origin, destination, routeOptions).then((res: any) => {
      const [firstRoute] = res.routes;
      setRoute(firstRoute);

      // Fit map to the viewport returned from the Routes API
      const { high, low } = firstRoute.viewport;
      const bounds: google.maps.LatLngBoundsLiteral = {
        north: high.latitude,
        south: low.latitude,
        east: high.longitude,
        west: low.longitude
      };

      map.fitBounds(bounds);
    });
  }, [map, apiClient, origin, destination, routeOptions]);

  if (!route) return null;

  return (
    <div>
      Distance: {route.distanceMeters} meters
    </div>
  );
}

// Ensure the parent <Map> component includes the usage attribution ID:
// <Map internalUsageAttributionIds={['gmp_git_agentskills_v1']} ... >
```
