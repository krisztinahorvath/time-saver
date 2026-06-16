import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Job {
  id: number;
  title: string;
  location: string;
  budget: number;
}

interface Props {
  jobs: Job[];
  selectedJobId?: number;
  onJobSelect?: (id: number) => void;
}

// Static table of major Romanian cities → [lat, lng]
const CITIES: [string, [number, number]][] = [
  ['bucuresti',              [44.4268, 26.1025]],
  ['bucharest',              [44.4268, 26.1025]],
  ['sector',                 [44.4268, 26.1025]],
  ['cluj-napoca',            [46.7712, 23.6236]],
  ['cluj napoca',            [46.7712, 23.6236]],
  ['cluj',                   [46.7712, 23.6236]],
  ['timisoara',              [45.7489, 21.2087]],
  ['iasi',                   [47.1585, 27.6014]],
  ['constanta',              [44.1598, 28.6348]],
  ['craiova',                [44.3302, 23.7949]],
  ['brasov',                 [45.6427, 25.5887]],
  ['galati',                 [45.4353, 28.0078]],
  ['ploiesti',               [44.9444, 26.0198]],
  ['oradea',                 [47.0722, 21.9216]],
  ['braila',                 [45.2652, 27.9594]],
  ['arad',                   [46.1866, 21.3123]],
  ['pitesti',                [44.8565, 24.8690]],
  ['sibiu',                  [45.7983, 24.1253]],
  ['bacau',                  [46.5670, 26.9146]],
  ['targu mures',            [46.5386, 24.5621]],
  ['baia mare',              [47.6567, 23.5681]],
  ['buzau',                  [45.1500, 26.8167]],
  ['ramnicu valcea',         [45.1000, 24.3700]],
  ['rimnicu valcea',         [45.1000, 24.3700]],
  ['satu mare',              [47.7925, 22.8875]],
  ['suceava',                [47.6635, 26.2732]],
  ['piatra neamt',           [46.9259, 26.3690]],
  ['targoviste',             [44.9274, 25.4567]],
  ['deva',                   [45.8897, 22.9097]],
  ['targu jiu',              [45.0500, 23.2800]],
  ['tulcea',                 [45.1667, 28.8000]],
  ['resita',                 [45.3003, 21.8886]],
  ['alexandria',             [43.9761, 25.3342]],
  ['sfantu gheorghe',        [45.8672, 25.7877]],
  ['alba iulia',             [46.0667, 23.5833]],
  ['zalau',                  [47.1833, 23.0333]],
  ['slobozia',               [44.5631, 27.3671]],
  ['giurgiu',                [43.9021, 25.9699]],
  ['turda',                  [46.5667, 23.7833]],
  ['mangalia',               [43.8000, 28.5833]],
  ['lugoj',                  [45.6869, 21.9003]],
  ['sinaia',                 [45.3589, 25.5478]],
  ['medias',                 [46.1581, 24.3553]],
  ['fagaras',                [45.8423, 24.9731]],
  ['roman',                  [46.9223, 26.9165]],
  ['drobeta',                [44.6322, 22.6573]],
  ['turnu severin',          [44.6322, 22.6573]],
  ['vaslui',                 [46.6407, 27.7276]],
  ['focsani',                [45.6955, 27.1881]],
  ['campulung',              [45.2706, 25.0456]],
  ['miercurea ciuc',         [46.3594, 25.7964]],
  ['drobeta-turnu severin',  [44.6322, 22.6573]],
  ['dej',                    [47.1333, 23.8667]],
];

// Normalize Romanian diacritics for fuzzy matching
function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[ăâ]/g, 'a').replace(/î/g, 'i');
}

function geocodeLocation(location: string): [number, number] | null {
  if (!location) return null;
  const n = normalize(location);
  for (const [city, coords] of CITIES) {
    if (n.includes(normalize(city))) return coords;
  }
  return null;
}

// Create a colored circle DivIcon — avoids PNG asset resolution issues
function makeIcon(selected: boolean) {
  return L.divIcon({
    html: `<div style="
      width:${selected ? 16 : 12}px;
      height:${selected ? 16 : 12}px;
      background:${selected ? '#1d4ed8' : '#2563eb'};
      border-radius:50%;
      border:2px solid #fff;
      box-shadow:0 1px 5px rgba(0,0,0,.4);
      transition:all .15s;
    "></div>`,
    iconSize:   [selected ? 16 : 12, selected ? 16 : 12],
    iconAnchor: [selected ? 8  : 6,  selected ? 8  : 6 ],
    className: '',
  });
}

const ROMANIA_CENTER: [number, number] = [45.9432, 24.9668];

const JobMap: React.FC<Props> = ({ jobs, selectedJobId, onJobSelect }) => {
  const geocoded = useMemo(() =>
    jobs.flatMap(j => {
      const coords = geocodeLocation(j.location);
      return coords ? [{ ...j, coords }] : [];
    }),
    [jobs]
  );

  const pinCount = geocoded.length;

  return (
    <div className="job-map-container">
      <MapContainer
        center={ROMANIA_CENTER}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geocoded.map(j => (
          <Marker
            key={j.id}
            position={j.coords}
            icon={makeIcon(j.id === selectedJobId)}
            eventHandlers={{ click: () => onJobSelect?.(j.id) }}
          >
            <Popup>
              <strong>{j.title}</strong><br />
              📍 {j.location}<br />
              💰 {j.budget} RON
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="job-map-notice">
        {pinCount > 0
          ? `📍 ${pinCount} din ${jobs.length} joburi afișate pe hartă`
          : '📍 Niciun job nu a putut fi localizat pe hartă'}
      </div>
    </div>
  );
};

export default JobMap;
