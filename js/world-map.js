const width = 1000, height = 700;
const canvas = d3.select("#globeCanvas").attr("width", width).attr("height", height).node();
const context = canvas.getContext("2d");
const tooltip = d3.select("#tooltip");
const projection = d3.geoOrthographic().scale(350).translate([width / 2, height / 2]).clipAngle(90);
const path = d3.geoPath(projection, context);

let scaleFactor = 1, countryData = {}, datesArray = [], currentDate = null;
let land, borders;
const highlightColor = "#00ffff"; // Cyan for better contrast for color-blind users

const colors = { ocean: '#e5f5f9', borders: '#d62728' };

// Full list of countries for Europe and Asia
const europeCountries = [
  'Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus', 'Belgium',
  'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece',
  'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kazakhstan', 'Kosovo', 'Latvia',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco',
  'Montenegro', 'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal',
  'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain',
  'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom', 'Vatican City'
];

const asiaCountries = [
  'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei',
  'Cambodia', 'China', 'Cyprus', 'Georgia', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Israel', 'Japan', 'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos',
  'Lebanon', 'Malaysia', 'Maldives', 'Mongolia', 'Myanmar', 'Nepal', 'North Korea',
  'Oman', 'Pakistan', 'Palestine', 'Philippines', 'Qatar', 'Russia', 'Saudi Arabia',
  'Singapore', 'South Korea', 'Sri Lanka', 'Syria', 'Taiwan', 'Tajikistan',
  'Thailand', 'Timor-Leste', 'Turkey', 'Turkmenistan', 'United Arab Emirates', 'Uzbekistan', 'Vietnam', 'Yemen'
];

// Populate dropdown menus for Europe and Asia
const europeDropdown = d3.select("#europeDropdown");
const asiaDropdown = d3.select("#asiaDropdown");

europeCountries.forEach(country => {
  europeDropdown.append("option").text(country).attr("value", country);
});

asiaCountries.forEach(country => {
  asiaDropdown.append("option").text(country).attr("value", country);
});

// Color scale based on COVID-19 case count, with light red for low and dark red for high cases
const colorScale = d3.scaleSequential(d3.interpolateReds).domain([0, 100000]);

// Load JSON and CSV data and render the map once both are loaded
Promise.all([
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'),
  d3.csv("total_cases.csv") // CSV path with COVID data
]).then(([world, data]) => {
  land = topojson.feature(world, world.objects.countries).features;
  borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);

  const dateSlider = d3.select("#dateSlider");
  const selectedDate = d3.select("#selectedDate");
  const datesSet = new Set();

  data.forEach(row => {
    const date = row.date;
    datesSet.add(date);
    Object.keys(row).forEach(country => {
      if (country !== "date") {
        if (!countryData[country]) countryData[country] = {};
        countryData[country][date] = +row[country] || 0;
      }
    });
  });

  datesArray = Array.from(datesSet).sort();
  dateSlider.attr("max", datesArray.length - 1);
  currentDate = datesArray[0];
  selectedDate.text(currentDate);

  render(); // Initial render after data is loaded
}).catch(error => console.error("Error loading data:", error));

// Render function for the globe
function render(highlightedCountry = null) {
  context.clearRect(0, 0, width, height);
  context.beginPath();
  path({ type: "Sphere" });
  context.fillStyle = colors.ocean;
  context.fill();
  context.strokeStyle = colors.borders;
  context.stroke();

  land.forEach(feature => {
    context.beginPath();
    path(feature);
    const countryName = feature.properties.name;
    const cases = countryData[countryName]?.[currentDate] || 0;

    context.fillStyle = (highlightedCountry === countryName) ? highlightColor : colorScale(cases);
    context.fill();
    context.strokeStyle = "#fff";
    context.stroke();
  });

  context.beginPath();
  path(borders);
  context.strokeStyle = colors.borders;
  context.lineWidth = 0.5;
  context.stroke();
}

// Tooltip function for hovering
canvas.addEventListener("mousemove", function(event) {
  const [mouseX, mouseY] = d3.pointer(event);
  const geographicCoordinates = projection.invert([mouseX, mouseY]);
  const hoveredCountry = land.find(d => d3.geoContains(d, geographicCoordinates));

  if (hoveredCountry) {
    const countryName = hoveredCountry.properties.name;
    const cases = countryData[countryName]?.[currentDate] || "No data";

    tooltip.style("display", "block")
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY + 10}px`)
      .html(`<strong>${countryName}</strong><br>Cases on ${currentDate}: ${cases}`);

    render(countryName);
  } else {
    tooltip.style("display", "none");
    render(); // Reset the map rendering
  }
});

// Rotate to country by name and temporarily highlight
function rotateToCountryByName(countryName) {
  const countryFeature = land.find(d => d.properties.name.toLowerCase() === countryName.toLowerCase());
  if (countryFeature) {
    const centroid = d3.geoCentroid(countryFeature);
    d3.transition().duration(2000).ease(d3.easeCubicOut).tween("rotate", () => {
      const r = d3.interpolate(projection.rotate(), [-centroid[0], -centroid[1]]);
      return t => { projection.rotate(r(t)); render(countryName); };
    });
    
    setTimeout(() => render(), 3000); // Reset the highlight after 3 seconds
  }
}

// Dropdown and search bar event handlers
europeDropdown.on("change", function() {
  const selectedCountry = this.value;
  if (selectedCountry) {
    rotateToCountryByName(selectedCountry);
    asiaDropdown.property("value", ""); // Reset Asia dropdown
    d3.select("#searchBar").property("value", ""); // Clear search bar
  }
});

asiaDropdown.on("change", function() {
  const selectedCountry = this.value;
  if (selectedCountry) {
    rotateToCountryByName(selectedCountry);
    europeDropdown.property("value", ""); // Reset Europe dropdown
    d3.select("#searchBar").property("value", ""); // Clear search bar
  }
});

d3.select("#searchBar").on("keypress", function(event) {
  if (event.key === "Enter") {
    const searchText = this.value.trim().toLowerCase();
    rotateToCountryByName(searchText);
    europeDropdown.property("value", ""); // Reset Europe dropdown
    asiaDropdown.property("value", ""); // Reset Asia dropdown
  }
});

// Date slider functionality
d3.select("#dateSlider").on("input", function() {
  const dateIndex = +this.value;
  currentDate = datesArray[dateIndex];
  d3.select("#selectedDate").text(currentDate);
  render();
});

// Zoom controls
d3.select("#zoomIn").on("click", function() {
  scaleFactor = Math.min(scaleFactor * 1.2, 5);
  projection.scale(350 * scaleFactor);
  d3.select("#zoomLabel").text(`Zoom: ${scaleFactor.toFixed(1)}`);
  render();
});

d3.select("#zoomOut").on("click", function() {
  scaleFactor = Math.max(scaleFactor * 0.8, 0.5);
  projection.scale(350 * scaleFactor);
  d3.select("#zoomLabel").text(`Zoom: ${scaleFactor.toFixed(1)}`);
  render();
});

d3.select(canvas).call(d3.zoom()
  .scaleExtent([0.5, 5])
  .on("zoom", function(event) {
    scaleFactor = event.transform.k;
    projection.scale(350 * scaleFactor);
    d3.select("#zoomLabel").text(`Zoom: ${scaleFactor.toFixed(1)}`);
    render();
  }));