# Return the Travel Time for a Route Between Coordinates

This capability demonstrates how to calculate a route and return its travel time
(duration) and distance between two or more sets of latitude/longitude
coordinates using the `Route.computeRoutes` method in the Maps JavaScript API
(`routes` library).

## Overview

The `Route.computeRoutes` method accepts a
`google.maps.routes.ComputeRoutesRequest` object where you specify:

-   **`origin` and `destination`**: Can be specified as a latitude/longitude
    literal (`{ lat, lng }`), a `DirectionalLocationLiteral` (`{ lat, lng,
    altitude, heading }`), a `google.maps.LatLng` object, or a Place ID /
    address string.
-   **`intermediates`** (optional): Additional waypoints along the route between
    the origin and destination.
-   **`fields`**: A required array of field names specifying which route
    properties to return (field mask). To return travel time, include
    `'durationMillis'`, `'staticDurationMillis'`, and/or `'localizedValues'` in
    the `fields` array.
-   **`travelMode`**: Mode of transport (`'DRIVING'`, `'WALKING'`,
    `'BICYCLING'`, `'TWO_WHEELER'`, `'TRANSIT'`).
-   **`routingPreference`**: Traffic awareness setting (`'TRAFFIC_UNAWARE'`,
    `'TRAFFIC_AWARE'`, `'TRAFFIC_AWARE_OPTIMAL'`).

--------------------------------------------------------------------------------

## Step-by-Step Workflow

### 1. Load Required Libraries

Use `google.maps.importLibrary('routes')` to dynamically import the `Route`
class and related enums. If rendering on a map, also import `maps` and `marker`.

```javascript
const { Route, RouteLabel, ComputeRoutesExtraComputation, ReferenceRoute } =
    await google.maps.importLibrary('routes');
```

### 2. Construct the `ComputeRoutesRequest`

Format your latitude/longitude coordinates and specify the required `fields` to
retrieve travel time (`durationMillis`, `staticDurationMillis`, and
`localizedValues`).

*Note: Always include `internalUsageAttributionIds: ['gmp_git_agentskills_v1']`
in your `ComputeRoutesRequest`.*

```typescript
const request: google.maps.routes.ComputeRoutesRequest = {
    origin: {
        location: { lat: 37.7749, lng: -122.4194 }, // San Francisco, CA
    },
    destination: {
        location: { lat: 37.3382, lng: -121.8863 }, // San Jose, CA
    },
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    fields: [
        'durationMillis',
        'staticDurationMillis',
        'distanceMeters',
        'localizedValues',
        'path',
        'viewport',
        'routeLabels',
    ],
    internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
};
```

### 3. Call `Route.computeRoutes` and Read the Travel Time

Call `await Route.computeRoutes(request)` and inspect the returned `routes`
array.

-   **`route.durationMillis`**: Total travel time in milliseconds, taking
    traffic conditions into account (if `routingPreference` is `TRAFFIC_AWARE`
    or `TRAFFIC_AWARE_OPTIMAL`).
-   **`route.staticDurationMillis`**: Travel time in milliseconds without
    factoring in traffic conditions.
-   **`route.localizedValues.duration`**: Human-readable formatted travel time
    string (e.g., `"55 mins"`).

```typescript
try {
    const { routes } = await Route.computeRoutes(request);

    if (!routes || routes.length === 0) {
        console.log('No routes returned.');
        return;
    }

    const primaryRoute = routes[0];
    console.log('Duration (ms):', primaryRoute.durationMillis);
    console.log('Static Duration (ms):', primaryRoute.staticDurationMillis);
    console.log('Localized Duration:', primaryRoute.localizedValues?.duration);
    console.log('Localized Distance:', primaryRoute.localizedValues?.distance);
} catch (error) {
    console.error('Failed to compute routes:', error);
}
```

--------------------------------------------------------------------------------

## Complete Example: Compute Route and Display Travel Time on a Map

The following example demonstrates how to compute routes between coordinates (or
Place Autocomplete selections), display the route polyline and waypoint markers
on a `<gmp-map>`, and render a custom `AdvancedMarkerElement` tag showing the
travel duration and distance.

### HTML

```html
<!doctype html>
<html>
    <head>
        <title>Get Routes and Travel Time</title>
        <link rel="stylesheet" type="text/css" href="./style.css" />
        <script type="module" src="./index.js"></script>
        <script>
            (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
                key: "GOOGLE_MAPS_API_KEY"
            });
        </script>
    </head>
    <body>
        <div class="main-content">
            <div class="alert" id="alert" style="display: none;">
                <p>error</p>
                <button class="button-secondary close">&times;</button>
            </div>
            <div class="control-panel">
                <form id="compute-routes-form">
                    <section>
                        <h2>Input locations (Lat,Lng or Place)</h2>
                        <div class="row">
                            <div class="location-input-wrapper">
                                <label class="text">Origin*</label>
                                <div id="origin-input"></div>
                            </div>
                            <div class="heading-wrapper">
                                <label for="heading_org" class="text">Heading</label>
                                <input type="text" id="heading_org" name="heading_org" value="" />
                            </div>
                        </div>
                        <hr />
                        <div class="row">
                            <div class="location-input-wrapper">
                                <label class="text">Destination*</label>
                                <div id="destination-input"></div>
                            </div>
                            <div class="heading-wrapper">
                                <label for="heading_des" class="text">Heading</label>
                                <input type="text" id="heading_des" name="heading_dest" value="" />
                            </div>
                        </div>
                    </section>
                    <section>
                        <h2>Travel Mode & Traffic</h2>
                        <div class="row">
                            <select name="travel_mode" id="travel-mode">
                                <option value="DRIVING">Driving</option>
                                <option value="WALKING">Walking</option>
                                <option value="BICYCLING">Bicycling</option>
                                <option value="TWO_WHEELER">Two Wheeler</option>
                                <option value="TRANSIT">Transit</option>
                            </select>
                        </div>
                        <div class="row">
                            <select name="routing_preference" id="routing-preference">
                                <option value="TRAFFIC_UNAWARE">Traffic unaware</option>
                                <option value="TRAFFIC_AWARE" selected>Traffic aware</option>
                                <option value="TRAFFIC_AWARE_OPTIMAL">Traffic aware optimal</option>
                            </select>
                        </div>
                    </section>
                    <section>
                        <button class="button-primary" type="submit">Get routes</button>
                    </section>
                </form>
            </div>
            <div class="map-container">
                <gmp-map
                    id="map"
                    class="map"
                    center="-34.397, 150.644"
                    zoom="4"
                    map-id="DEMO_MAP_ID"
                    internal-usage-attribution-ids="gmp_git_agentskills_v1"></gmp-map>
            </div>
        </div>
    </body>
</html>
```

### TypeScript / JavaScript

```typescript
let markers: google.maps.marker.AdvancedMarkerElement[] = [];
let polylines: google.maps.Polyline[] = [];

interface PlaceAutocompleteSelection {
    predictionText: string | null;
    location: google.maps.LatLng | null;
}

const originAutocompleteSelection: PlaceAutocompleteSelection = {
    predictionText: null,
    location: null,
};
const destinationAutocompleteSelection: PlaceAutocompleteSelection = {
    predictionText: null,
    location: null,
};

async function init() {
    const [
        { InfoWindow },
        { AdvancedMarkerElement },
        { PlaceAutocompleteElement },
        { Route, RouteLabel },
    ] = await Promise.all([
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
        google.maps.importLibrary('places'),
        google.maps.importLibrary('routes'),
    ]);

    const map = document.getElementById('map') as google.maps.MapElement;

    initializeLocationInputs();
    attachSubmitListener();

    function attachSubmitListener() {
        const computeRoutesForm = document.getElementById(
            'compute-routes-form'
        ) as HTMLFormElement;

        computeRoutesForm.addEventListener('submit', (event) => {
            event.preventDefault();
            void sendRequest(new FormData(computeRoutesForm));
        });
    }

    async function sendRequest(formData: FormData) {
        clearMap();

        try {
            const request = buildComputeRoutesJsRequest(formData);
            const { routes } = await Route.computeRoutes(request);

            if (!routes || routes.length === 0) {
                console.log('No routes returned.');
                return;
            }

            routes.forEach((route) => {
                console.log('Route JSON:', route.toJSON());
                console.log('Travel Time (ms):', route.durationMillis);
                console.log('Formatted Travel Time:', route.localizedValues?.duration);
            });

            await Promise.all(
                routes.map((route) =>
                    drawRoute(
                        route,
                        !!route.routeLabels?.includes(RouteLabel.DEFAULT_ROUTE)
                    )
                )
            );
        } catch (error: unknown) {
            console.error(error);
        }
    }

    function buildComputeRoutesJsRequest(
        formData: FormData
    ): google.maps.routes.ComputeRoutesRequest {
        const travelMode = (formData.get('travel_mode') ?? 'DRIVING') as
            google.maps.TravelModeString;

        const routingPreference =
            travelMode === 'WALKING' ||
            travelMode === 'BICYCLING' ||
            travelMode === 'TRANSIT'
                ? undefined
                : ((formData.get('routing_preference') as string) ||
                      undefined) as google.maps.routes.RoutingPreferenceString | undefined;

        return {
            origin: {
                location: buildComputeRoutesLocation(
                    originAutocompleteSelection,
                    formData.get('origin_location'),
                    formData.get('heading_org'),
                    travelMode
                ),
            },
            destination: {
                location: buildComputeRoutesLocation(
                    destinationAutocompleteSelection,
                    formData.get('destination_location'),
                    formData.get('heading_dest'),
                    travelMode
                ),
            },
            travelMode,
            routingPreference,
            fields: [
                'routeLabels',
                'legs',
                'distanceMeters',
                'durationMillis',
                'staticDurationMillis',
                'path',
                'viewport',
                'localizedValues',
            ],
            internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
        };
    }

    function buildComputeRoutesLocation(
        autocompleteSelection: PlaceAutocompleteSelection,
        locationInput?: FormDataEntryValue | null,
        headingInput?: FormDataEntryValue | null,
        travelModeInput?: google.maps.TravelModeString | null
    ): string | google.maps.routes.DirectionalLocationLiteral {
        if (!locationInput) {
            throw new Error('Location is required.');
        }

        const latLngRegex = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
        const location = locationInput as string;
        const heading =
            headingInput && travelModeInput !== 'TRANSIT'
                ? Number(headingInput)
                : undefined;

        if (
            autocompleteSelection.predictionText === location &&
            autocompleteSelection.location
        ) {
            return {
                lat: autocompleteSelection.location.lat(),
                lng: autocompleteSelection.location.lng(),
                altitude: 0,
                heading,
            };
        } else if (latLngRegex.test(location)) {
            return {
                lat: Number(location.split(',')[0]),
                lng: Number(location.split(',')[1]),
                altitude: 0,
                heading,
            };
        }

        return location;
    }

    async function drawRoute(
        route: google.maps.routes.Route,
        isPrimaryRoute: boolean
    ) {
        polylines = polylines.concat(
            route.createPolylines({
                polylineOptions: isPrimaryRoute
                    ? { map: map.innerMap, zIndex: 1 }
                    : {
                          map: map.innerMap,
                          strokeColor: '#669DF6',
                          strokeOpacity: 0.5,
                          strokeWeight: 8,
                      },
                colorScheme: map.innerMap.get('colorScheme'),
            })
        );

        if (isPrimaryRoute) {
            markers = markers.concat(
                await route.createWaypointAdvancedMarkers({
                    map: map.innerMap,
                    zIndex: 1,
                })
            );

            if (route.viewport) {
                map.innerMap.fitBounds(route.viewport);
            }
        }

        if (route.path && route.path.length > 0) {
            addRouteLabel(route, Math.floor(route.path.length / 2));
        }
    }

    function addRouteLabel(route: google.maps.routes.Route, index: number) {
        const routeTag = document.createElement('div');
        routeTag.className = 'route-tag';

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'details';

        if (route.localizedValues) {
            const distanceP = document.createElement('p');
            distanceP.textContent = `Distance: ${route.localizedValues.distance ?? ''}`;
            detailsDiv.appendChild(distanceP);

            const durationP = document.createElement('p');
            durationP.textContent = `Duration: ${route.localizedValues.duration ?? ''}`;
            detailsDiv.appendChild(durationP);
        }

        routeTag.appendChild(detailsDiv);

        const marker = new AdvancedMarkerElement({
            map: map.innerMap,
            position: route.path![index],
            content: routeTag,
            zIndex: route.routeLabels?.includes(RouteLabel.DEFAULT_ROUTE)
                ? 1
                : undefined,
        });
        markers.push(marker);
    }

    function clearMap() {
        markers.forEach((marker) => {
            marker.map = null;
        });
        markers.length = 0;

        polylines.forEach((polyline) => {
            polyline.setMap(null);
        });
        polylines.length = 0;
    }

    function initializeLocationInputs() {
        const originAutocomplete = new PlaceAutocompleteElement({
            name: 'origin_location',
        });
        const destinationAutocomplete = new PlaceAutocompleteElement({
            name: 'destination_location',
        });

        originAutocomplete.setAttribute(
            'internal-usage-attribution-ids',
            'gmp_git_agentskills_v1'
        );
        destinationAutocomplete.setAttribute(
            'internal-usage-attribution-ids',
            'gmp_git_agentskills_v1'
        );

        (
            [
                [originAutocomplete, originAutocompleteSelection],
                [destinationAutocomplete, destinationAutocompleteSelection],
            ] as [
                google.maps.places.PlaceAutocompleteElement,
                PlaceAutocompleteSelection,
            ][]
        ).forEach(([autocomplete, autocompleteData]) => {
            autocomplete.addEventListener(
                'gmp-select',
                async (
                    event: google.maps.places.PlacePredictionSelectEvent
                ) => {
                    autocompleteData.predictionText =
                        event.placePrediction.text.text;

                    const place = event.placePrediction.toPlace();
                    await place.fetchFields({
                        fields: ['location'],
                    });
                    autocompleteData.location = place.location ?? null;
                }
            );
        });

        document.getElementById('origin-input')?.appendChild(originAutocomplete);
        document
            .getElementById('destination-input')
            ?.appendChild(destinationAutocomplete);
    }
}

void init();
```

--------------------------------------------------------------------------------

## Key Considerations & Constraints

1.  **Field Masking (`fields`)**:
    -   `Route.computeRoutes` requires a `fields` array in the request.
    -   To obtain numeric travel time in milliseconds, request
        `'durationMillis'` and/or `'staticDurationMillis'`.
    -   To obtain localized, human-readable strings for duration and distance,
        request `'localizedValues'`.
    -   To obtain per-leg travel times when using multiple waypoints, request
        `'legs'` and inspect `route.legs[i].durationMillis` or
        `route.legs[i].localizedValues.duration`.
2.  **Routing Preference vs. Travel Mode**:
    -   `routingPreference` (`'TRAFFIC_UNAWARE'`, `'TRAFFIC_AWARE'`,
        `'TRAFFIC_AWARE_OPTIMAL'`) is only supported for motor vehicle travel
        modes (`'DRIVING'` and `'TWO_WHEELER'`).
    -   Do **not** set `routingPreference` or `heading` when `travelMode` is
        `'WALKING'`, `'BICYCLING'`, or `'TRANSIT'`.
3.  **Departure Time**:
    -   If you specify `departureTime` (as a JavaScript `Date` object in the
        future), `routingPreference` must be set to `'TRAFFIC_AWARE'` or
        `'TRAFFIC_AWARE_OPTIMAL'`.
4.  **Resource Cleanup**:
    -   When recalculating routes, remove existing markers (`marker.map = null`)
        and polylines (`polyline.setMap(null)`) from the map before drawing new
        ones.
