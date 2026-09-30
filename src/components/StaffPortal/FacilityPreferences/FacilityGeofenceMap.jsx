import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  MapContainer,
  Marker,
  TileLayer,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const getCoordinates = (geofence) => {
  const latitude = Number(geofence?.latitude);
  const longitude = Number(geofence?.longitude);
  if (
    geofence?.latitude === null ||
    geofence?.longitude === null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return [latitude, longitude];
};

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function MapViewport({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 15));
  }, [map, position]);

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function FacilityGeofenceMap({ geofence, onChange, disabled }) {
  const [query, setQuery] = useState(geofence?.address || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const position = getCoordinates(geofence);
  const radius = Number(geofence?.radiusMeters) || 150;

  useEffect(() => {
    setQuery(geofence?.address || "");
  }, [geofence?.address]);

  const searchAddress = async (event) => {
    event.preventDefault();
    const search = query.trim();
    if (!search) return;

    setSearching(true);
    setSearchError("");
    setResults([]);
    try {
      const params = new URLSearchParams({
        q: search,
        format: "jsonv2",
        limit: "5",
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error("Address search is unavailable");
      const matches = await response.json();
      setResults(Array.isArray(matches) ? matches : []);
      if (!matches.length) setSearchError("No matching addresses found.");
    } catch (error) {
      setSearchError(error.message || "Address search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const selectPosition = (latitude, longitude, address = query.trim()) => {
    if (address) onChange("address", address);
    onChange("latitude", Number(latitude));
    onChange("longitude", Number(longitude));
  };

  const selectResult = (result) => {
    const address = result.display_name || query.trim();
    selectPosition(result.lat, result.lon, address);
    setQuery(address);
    setResults([]);
  };

  return (
    <Stack spacing={1.5}>
      <Box component="form" onSubmit={searchAddress}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            fullWidth
            label="Search facility address"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={disabled || searching}
          />
          <Button
            type="submit"
            variant="outlined"
            disabled={disabled || searching || !query.trim()}
            sx={{ minWidth: { sm: 130 } }}
            startIcon={searching ? <CircularProgress size={16} /> : null}
          >
            Search
          </Button>
        </Stack>
      </Box>

      {searchError ? <Alert severity="info">{searchError}</Alert> : null}

      {results.length > 0 ? (
        <List
          dense
          disablePadding
          sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}
        >
          {results.map((result) => (
            <ListItemButton
              key={result.place_id}
              onClick={() => selectResult(result)}
              disabled={disabled}
              divider
            >
              <ListItemText primary={result.display_name} />
            </ListItemButton>
          ))}
        </List>
      ) : null}

      <Box
        sx={{
          height: { xs: 280, sm: 360 },
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <MapContainer
          center={position || [20, 0]}
          zoom={position ? 15 : 2}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler
            onSelect={(latitude, longitude) => {
              if (!disabled) {
                selectPosition(
                  latitude,
                  longitude,
                  query.trim() || geofence?.address || "",
                );
              }
            }}
          />
          <MapViewport position={position} />
          {position ? (
            <>
              <Marker
                position={position}
                icon={markerIcon}
                draggable={!disabled}
                eventHandlers={{
                  dragend: (event) => {
                    const point = event.target.getLatLng();
                    selectPosition(
                      point.lat,
                      point.lng,
                      geofence?.address || query.trim(),
                    );
                  },
                }}
              />
              <Circle
                center={position}
                radius={radius}
                pathOptions={{ color: "#1565c0", fillOpacity: 0.12 }}
              />
            </>
          ) : null}
        </MapContainer>
      </Box>
      <Typography variant="caption" color="text.secondary">
        OpenStreetMap address search. Select a result, then click the map or
        drag the pin to confirm the facility center. The circle previews the
        allowed radius.
      </Typography>
      {!position ? (
        <Alert severity="warning">
          Search for and select the facility address before saving geofence
          mode.
        </Alert>
      ) : null}
    </Stack>
  );
}
