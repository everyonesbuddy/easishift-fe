export function getPunchLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          latitude: Number(coords.latitude),
          longitude: Number(coords.longitude),
          accuracyMeters: Number(coords.accuracy),
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  });
}
