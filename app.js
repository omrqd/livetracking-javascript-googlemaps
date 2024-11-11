/*
@author: @omrqd
@date: 2024-11-11
@github: https://github.com/omrqd
*/
// Initialize map variables
let map;
let userMarker;
let deliveryMarker;
let userPosition;
let deliverySimulationInterval;
let deliveryPath; // Line between delivery and user
let distanceInfoWindow; // Info window for distance/time

// Initialize the map centered on a default position
function initMap() {
  // Create map centered on a default position
  const defaultPosition = { lat: 51.505, lng: -0.09 };

  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 13,
    center: defaultPosition,
  });

  // Create a marker for user location (initially hidden)
  userMarker = new google.maps.Marker({
    position: defaultPosition,
    map: map,
    visible: false
  });

  // Create a marker for delivery person (initially hidden)
  deliveryMarker = new google.maps.Marker({
    position: defaultPosition,
    map: map,
    visible: false,
    icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png", // Different color for delivery marker
      scaledSize: new google.maps.Size(32, 32)
    }
  });

  // Create delivery path line (initially hidden)
  deliveryPath = new google.maps.Polyline({
    path: [],
    geodesic: true,
    strokeColor: '#4CAF50',
    strokeOpacity: 1.0,
    strokeWeight: 2,
    map: map,
    visible: false
  });

  // Create info window for distance/time
  distanceInfoWindow = new google.maps.InfoWindow();

  // Start tracking user location
  trackUserLocation();
}

// Function to animate marker movement smoothly
function animateMarkerMovement(marker, startPos, endPos) {
  const frames = 50; // Number of animation frames
  let count = 0;

  const deltaLat = (endPos.lat - startPos.lat) / frames;
  const deltaLng = (endPos.lng - startPos.lng) / frames;

  const animate = () => {
    count++;

    const lat = startPos.lat + deltaLat * count;
    const lng = startPos.lng + deltaLng * count;

    marker.setPosition({ lat, lng });

    if (count < frames) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
}

// Function to update delivery path and info
function updateDeliveryInfo() {
  const deliveryPos = deliveryMarker.getPosition();
  const userPos = userMarker.getPosition();

  // Update path between delivery and user
  deliveryPath.setPath([
    { lat: deliveryPos.lat(), lng: deliveryPos.lng() },
    { lat: userPos.lat(), lng: userPos.lng() }
  ]);
  deliveryPath.setVisible(true);

  // Calculate distance
  const distance = google.maps.geometry.spherical.computeDistanceBetween(deliveryPos, userPos);

  // Estimate time (assuming average speed of 30 km/h = 8.33 m/s)
  const timeInSeconds = distance / 8.33;
  const minutes = Math.round(timeInSeconds / 60);

  // Update info window
  const content = `
    Distance: ${Math.round(distance)}m<br>
    Estimated arrival: ${minutes} min
  `;

  distanceInfoWindow.setContent(content);
  distanceInfoWindow.setPosition(google.maps.geometry.spherical.interpolate(deliveryPos, userPos, 0.5));
  distanceInfoWindow.open(map);
}

// Function to simulate delivery person movement
function simulateDeliveryMovement() {
  // Random movement between -0.0005 and 0.0005 degrees (roughly 50 meters)
  const randomLat = (Math.random() - 0.5) * 0.001;
  const randomLng = (Math.random() - 0.5) * 0.001;

  const currentPosition = deliveryMarker.getPosition();
  const newPosition = {
    lat: currentPosition.lat() + randomLat,
    lng: currentPosition.lng() + randomLng
  };

  // Calculate heading for car rotation
  const heading = google.maps.geometry.spherical.computeHeading(
    currentPosition,
    new google.maps.LatLng(newPosition.lat, newPosition.lng)
  );

  // Update car icon with rotation
  deliveryMarker.setIcon({
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 6,
    fillColor: "#4CAF50",
    fillOpacity: 1,
    strokeWeight: 2,
    rotation: heading
  });

  // Animate the movement
  animateMarkerMovement(
    deliveryMarker,
    { lat: currentPosition.lat(), lng: currentPosition.lng() },
    newPosition
  );

  // Update delivery path and info
  updateDeliveryInfo();
}

// Function to track user location
function trackUserLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(
      (position) => {
        userPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Update marker position and make visible
        userMarker.setPosition(userPosition);
        userMarker.setVisible(true);

        // Center map on user
        map.setCenter(userPosition);
        map.setZoom(17); // Increased zoom level for better accuracy

        // Add accuracy circle
        const accuracyCircle = new google.maps.Circle({
          map: map,
          center: userPosition,
          radius: position.coords.accuracy, // Circle radius based on accuracy in meters
          fillColor: '#4285F4',
          fillOpacity: 0.2,
          strokeColor: '#4285F4',
          strokeOpacity: 0.4,
          strokeWeight: 1
        });

        // Initialize delivery marker near user position
        if (!deliveryMarker.getVisible()) {
          const initialDeliveryPosition = {
            lat: userPosition.lat + 0.002,
            lng: userPosition.lng + 0.002
          };
          deliveryMarker.setPosition(initialDeliveryPosition);
          deliveryMarker.setVisible(true);

          // Start delivery simulation
          if (!deliverySimulationInterval) {
            deliverySimulationInterval = setInterval(simulateDeliveryMovement, 2000); // Update every 2 seconds
          }
        }

        // Update delivery path and info when user moves
        if (deliveryMarker.getVisible()) {
          updateDeliveryInfo();
        }
      },
      (error) => {
        console.error("Error getting location:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000, // Increased timeout for better accuracy
        distanceFilter: 1 // Update position when user moves more than 1 meter
      }
    );
  } else {
    console.error("Geolocation is not supported by this browser.");
  }
}

// Add CSS styles for the map container
const mapStyles = document.createElement('style');
mapStyles.textContent = `
  #map {
    height: 400px;
    width: 100%;
  }
  .map-container {
    padding: 20px;
  }
`;
document.head.appendChild(mapStyles);

// Load Google Maps script with geometry library
const scriptElement = document.createElement('script');
scriptElement.src = `https://maps.googleapis.com/maps/api/js?key={YOUR_API_KEY}&libraries=geometry&callback=initMap`;
scriptElement.async = true;
scriptElement.defer = true;
document.head.appendChild(scriptElement);
