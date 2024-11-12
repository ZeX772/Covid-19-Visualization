const width = 1000, height = 700;
const canvas = d3.select("#globeCanvas").attr("width", width).attr("height", height).node();
const context = canvas.getContext("2d");
const tooltip = d3.select("#tooltip");
const projection = d3.geoOrthographic().scale(350).translate([width / 2, height / 2]).clipAngle(90);
const path = d3.geoPath(projection, context);

let scaleFactor = 1, countryData = {}, datesArray = [], currentDate = null;
let land, borders;
const searchHighlightColor = "#00ffff"; // Cyan for better contrast for color-blind users
const hoverHighlightColor = "#ffcccc"; 

const colors = { ocean: '#e5f5f9', borders: '#333' };

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

// Tooltip hover functionality
canvas.addEventListener("mousemove", function(event) {
  const [mouseX, mouseY] = d3.pointer(event);
  const geographicCoordinates = projection.invert([mouseX, mouseY]);
  const hoveredCountry = land.find(d => d3.geoContains(d, geographicCoordinates));

  if (hoveredCountry) {
    const countryName = hoveredCountry.properties.name;
    const cases = countryData[countryName]?.[currentDate] || "No data";

    // Display the tooltip with the country data
    tooltip.style("display", "block")
      .style("position", "absolute")
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY + 10}px`)
      .style("background", "#333")
      .style("color", "#fff")
      .style("padding", "5px")
      .style("border-radius", "3px")
      .html(`<strong>${countryName}</strong><br>Cases: ${cases}`);

    // Log to confirm tooltip should be visible
    console.log(`Tooltip for ${countryName}: Cases - ${cases}`);
    
    // Render the map with the highlighted country
    render(countryName);  // Pass hovered country name to keep it fully opaque
  } else {
    // Hide tooltip when not hovering over a country
    tooltip.style("display", "none");
    render(); // Reset map rendering when mouse is not over a country
  }
});


// Rotate to country by name, highlight in cyan without opacity, and zoom in
function rotateToCountryByName(countryName) {
  const normalizedCountryName = countryName.toLowerCase();
  const countryFeature = land.find(d => d.properties.name.toLowerCase() === normalizedCountryName);

  if (countryFeature) {
    const centroid = d3.geoCentroid(countryFeature);

    // Set zoom scale factor
    scaleFactor = 1.5;
    projection.scale(350 * scaleFactor);

    // Debug log to confirm rotation is being applied
    console.log(`Rotating to country: ${countryFeature.properties.name}`);

    // Animate rotation to the target country
    d3.transition().duration(2000).ease(d3.easeCubicOut).tween("rotate", () => {
      const r = d3.interpolate(projection.rotate(), [-centroid[0], -centroid[1]]);
      return t => {
        projection.rotate(r(t));
        render(countryFeature.properties.name, true); // Apply cyan color directly to the searched country
      };
    });

    // Reset the highlight after 3 seconds
    setTimeout(() => {
      console.log(`Resetting highlight for country: ${countryFeature.properties.name}`);
      render(); // Re-render without the cyan highlight after timeout
    }, 3000);
  } else {
    console.log("Country not found:", countryName);
  }
}

// Updated render function to use cyan color for the searched country without opacity change
function render(highlightedCountry = null, highlightForSearch = false) {
  context.clearRect(0, 0, width, height);

  // Draw the ocean with full opacity
  context.beginPath();
  path({ type: "Sphere" });
  context.fillStyle = colors.ocean;
  context.globalAlpha = 1; // Full opacity for the ocean
  context.fill();

  // Draw each country
  land.forEach(feature => {
    context.beginPath();
    path(feature);
    const countryName = feature.properties.name;
    const cases = countryData[countryName]?.[currentDate] || 0;

    // Apply cyan color for the searched country
    if (highlightForSearch && countryName === highlightedCountry) {
      context.fillStyle = searchHighlightColor; // Cyan color for searched country
      context.globalAlpha = 1; // Full opacity for the searched country
      console.log(`Applying cyan to ${countryName}`); // Debug log
    } else if (!highlightForSearch && highlightedCountry && countryName === highlightedCountry) {
      context.fillStyle = colorScale(cases);
      context.globalAlpha = 1; // Full opacity for the hovered country
    } else {
      context.fillStyle = colorScale(cases);
      context.globalAlpha = highlightedCountry && !highlightForSearch ? 0.3 : 1;
    }

    context.fill();
    context.strokeStyle = colors.borders;
    context.lineWidth = 1.2; // Increased line width for visible borders
    context.stroke();
  });

  // Draw the borders between countries
  context.beginPath();
  path(borders);
  context.strokeStyle = colors.borders;
  context.lineWidth = 1.5; // Thicker border lines for better visibility
  context.globalAlpha = 1; // Full opacity for borders
  context.stroke();
}


// Arrow key panning functions
function rotateMap(direction) {
  const rotation = projection.rotate();
  const rotationAmount = 3;
  if (direction === 'left') projection.rotate([rotation[0] - rotationAmount, rotation[1]]);
  if (direction === 'right') projection.rotate([rotation[0] + rotationAmount, rotation[1]]);
  if (direction === 'up') projection.rotate([rotation[0], rotation[1] - rotationAmount]);
  if (direction === 'down') projection.rotate([rotation[0], rotation[1] + rotationAmount]);
  render();
}

// Event listeners for arrow buttons
d3.select("#arrowLeft").on("click", () => rotateMap('left'));
d3.select("#arrowRight").on("click", () => rotateMap('right'));
d3.select("#arrowUp").on("click", () => rotateMap('up'));
d3.select("#arrowDown").on("click", () => rotateMap('down'));

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
  
  // Function to calculate min and max cases for the current date and update the legend
function updateLegendForCurrentDate() {
  let minCases = Infinity;
  let maxCases = -Infinity;

  // Loop through all country data for the current date to find min and max cases
  Object.keys(countryData).forEach(country => {
    const cases = countryData[country][currentDate] || 0;
    if (cases > maxCases) maxCases = cases;
    if (cases < minCases) minCases = cases;
  });

  // Update the legend based on min and max cases for the current date
  createDynamicLegend(minCases, maxCases);
}

// Updated createDynamicLegend function to display min and max cases dynamically
function createDynamicLegend(min, max) {
  // Clear existing legend
  d3.select("#legendContainer").selectAll("*").remove();

  const legendWidth = 300;
  const legendHeight = 20;

  const svg = d3.select("#legendContainer")
    .append("svg")
    .attr("width", legendWidth + 40)
    .attr("height", legendHeight + 50);

  // Title for the legend
  svg.append("text")
    .attr("x", legendWidth / 2)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", "#333")
    .text("Number of Cases");

  // Define color scale based on the provided min and max
  const colorScale = d3.scaleLinear()
    .domain([min, max])
    .range(["#ffcccc", "#990000"]);

  // Gradient definition
  const defs = svg.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", "legendGradient");

  linearGradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", colorScale(min));

  linearGradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", colorScale(max));

  // Draw the gradient rectangle
  svg.append("rect")
    .attr("x", 20)
    .attr("y", 30)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legendGradient)")
    .style("stroke", "#333")
    .style("stroke-width", "0.5px");

  // Create scale and axis for legend ticks
  const legendScale = d3.scaleLinear()
    .domain([min, max])
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(5)
    .tickFormat(d => Math.round(d));

  svg.append("g")
    .attr("transform", `translate(20, ${legendHeight + 30})`)
    .call(legendAxis)
    .selectAll("text")
    .attr("font-size", "10px")
    .attr("fill", "#333");
}

// Initialize legend when data is loaded
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

  updateLegendForCurrentDate(); // Initialize the legend for the first date
  render(); // Initial render after data is loaded
}).catch(error => console.error("Error loading data:", error));

// Update legend dynamically when date changes
d3.select("#dateSlider").on("input", function() {
  const dateIndex = +this.value;
  currentDate = datesArray[dateIndex];
  d3.select("#selectedDate").text(currentDate);
  updateLegendForCurrentDate(); // Update legend based on the current date's data
  render();
});
