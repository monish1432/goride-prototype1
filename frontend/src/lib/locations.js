// Preset Bengaluru locations for clean demo
export const PRESET_LOCATIONS = [
  { name: "Indiranagar", lat: 12.9719, lng: 77.6412 },
  { name: "Koramangala", lat: 12.9352, lng: 77.6245 },
  { name: "MG Road", lat: 12.9756, lng: 77.6097 },
  { name: "Whitefield", lat: 12.9698, lng: 77.7500 },
  { name: "Electronic City", lat: 12.8452, lng: 77.6602 },
  { name: "HSR Layout", lat: 12.9116, lng: 77.6474 },
  { name: "Marathahalli", lat: 12.9591, lng: 77.6974 },
  { name: "Jayanagar", lat: 12.9250, lng: 77.5938 },
  { name: "BTM Layout", lat: 12.9166, lng: 77.6101 },
  { name: "Yeshwantpur", lat: 13.0287, lng: 77.5547 },
  { name: "Kempegowda Airport", lat: 13.1986, lng: 77.7066 },
  { name: "Majestic Bus Stand", lat: 12.9774, lng: 77.5713 },
];

export const VEHICLE_TYPES = {
  bike:  { label: "Bike",  icon: "🏍",  category: "passenger", desc: "1 rider · zip through traffic" },
  auto:  { label: "Auto",  icon: "🛺",  category: "passenger", desc: "3 riders · meter-style fare" },
  car:   { label: "Car",   icon: "🚗",  category: "passenger", desc: "4 riders · AC sedan" },
  taxi:  { label: "Taxi",  icon: "🚕",  category: "passenger", desc: "4 riders · airport-ready" },
  tempo: { label: "Tempo", icon: "🛻",  category: "logistics", desc: "Up to 750 kg" },
  truck: { label: "Truck", icon: "🚚",  category: "logistics", desc: "Up to 3 tons" },
};
