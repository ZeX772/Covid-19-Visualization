const svg = d3.select("svg")
.attr("width", "100%")
.attr("height", "100%");

const width = parseInt(svg.style("width"));
const height = parseInt(svg.style("height"));
const playButton = document.getElementById("playPause");
const resetButton = document.getElementById("reset");
const loadOriginalButton = document.getElementById("loadOriginalButton");
const loadOECDButton = document.getElementById("loadOECDButton");
const dateSlider = document.getElementById("dateSlider");
const dateLabel = document.getElementById("dateLabel");
const selectedDateLabel = document.getElementById("selectedDate");
const zoomInButton = document.getElementById("zoomIn");
const zoomOutButton = document.getElementById("zoomOut");
const zoomLabel = document.getElementById("zoomLabel");
const description1 = document.getElementById("description1");
const description2 = document.getElementById("description2");
const mainTitle = document.getElementById("mainTitle");
const tooltip = document.getElementById("tooltip");


const projection = d3.geoMercator().center([60, 40]).scale(200).translate([width / 2, height / 2]);
const path = d3.geoPath().projection(projection);

let countryDeathData = {};
let dates = [];
let isPlaying = false;
let interval;
let isOECDDataset = false;
let scaleFactor = 1;

function formatNumber(value) {
return value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value;
}

function updateMap(selectedDate) {
const maxDeaths = d3.max(Object.values(countryDeathData[selectedDate])) || 0;
const colorScale = d3.scaleSequential(d3.interpolateYlGnBu).domain([0, maxDeaths]);
updateLegend(maxDeaths);

d3.json("map.json").then(geojson => {
    svg.selectAll("path")
        .data(geojson.features)
        .join("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", d => {
            const country = d.properties.name;
            const deaths = countryDeathData[selectedDate]?.[country] || 0;
            return colorScale(deaths);
        })
        .style("opacity", 1)
        .on("mouseover", function(event, d) {
            const country = d.properties.name;
            const deaths = countryDeathData[selectedDate]?.[country] || 'No data';
    
            console.log("Country:", country, "Deaths per million:", deaths);
    
            d3.selectAll(".country").style("opacity", 0.3);
            d3.select(this).style("opacity", 1);
    
            // Inline d3.select("#tooltip") to avoid `style` error
            d3.select("#tooltip")
                .style("display", "block")
                .style("position", "absolute")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`)
                .style("background", "#333")
                .style("color", "#fff")
                .style("padding", "5px")
                .style("border-radius", "3px")
                .html(`<strong>${country}</strong><br>Deaths: ${deaths}`);
        })
        .on("mousemove", function(event) {
            // Use d3.select("#tooltip") again to move it on mousemove
            d3.select("#tooltip")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function() {
            d3.selectAll(".country").style("opacity", 1);
            
            // Hide the tooltip on mouseout
            d3.select("#tooltip").style("display", "none");
        });
    
});
}

// Zoom functionality
zoomInButton.addEventListener("click", () => {
scaleFactor = Math.min(scaleFactor * 1.2, 5);
projection.scale(200 * scaleFactor);
zoomLabel.innerText = `Zoom: ${scaleFactor.toFixed(1)}`;
updateMap(dates[dateSlider.value]);
});

zoomOutButton.addEventListener("click", () => {
scaleFactor = Math.max(scaleFactor * 0.8, 0.5);
projection.scale(200 * scaleFactor);
zoomLabel.innerText = `Zoom: ${scaleFactor.toFixed(1)}`;
updateMap(dates[dateSlider.value]);
});
function updateLegend(maxDeaths) {
    const legendContainer = document.getElementById("legendContainer");
    legendContainer.innerHTML = ''; // Clear previous content

    const legendWidth = 400;
    const legendHeight = 20;

    // Create SVG for legend with increased width to accommodate labels
    const svg = d3.select("#legendContainer")
        .append("svg")
        .attr("width", legendWidth + 80) // Increased width to make room for labels
        .attr("height", legendHeight + 60); // Increased height for additional padding

    // Title for the legend
    svg.append("text")
        .attr("x", (legendWidth + 80) / 2) // Centered title with adjusted width
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#333")
        .text("Number of Cases");

    // Define color scale based on the provided maxDeaths
    const colorScale = d3.scaleLinear()
        .domain([0, maxDeaths])
        .range(["#f7fcf0", "#2c7fb8"]);

    // Gradient definition
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legendGradient");

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(0));

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(maxDeaths));

    // Draw the gradient rectangle
    svg.append("rect")
        .attr("x", 40) // Shifted right to make room for the 'Low' label
        .attr("y", 30)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)")
        .style("stroke", "#333")
        .style("stroke-width", "0.5px");

    // Low label
    svg.append("text")
        .attr("x", 0)  // Positioned to the left of the gradient
        .attr("y", 45)
        .attr("text-anchor", "start")
        .attr("font-size", "12px")
        .attr("fill", "#333")
        .text("Low");

    // High label
    svg.append("text")
        .attr("x", legendWidth + 70)  // Positioned to the right of the gradient
        .attr("y", 45)
        .attr("text-anchor", "end")
        .attr("font-size", "12px")
        .attr("fill", "#333")
        .text("High");

    // Create scale and axis for legend ticks
    const legendScale = d3.scaleLinear()
        .domain([0, maxDeaths])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d => formatNumber(d));

    svg.append("g")
        .attr("transform", `translate(40, ${legendHeight + 30})`) // Adjusted to align with gradient
        .call(legendAxis)
        .selectAll("text")
        .attr("font-size", "10px")
        .attr("fill", "#333");
}



function loadOECDDataset() {
d3.csv("oecd.csv").then(data => {
    countryDeathData = {};
    dates = ["OECD"];
    isOECDDataset = true;

    playButton.style.display = "none";
    resetButton.style.display = "none";
    dateSlider.style.display = "none";
    dateLabel.style.display = "none";
    loadOECDButton.style.display = "none";
    loadOriginalButton.style.display = "inline";
    description1.style.display = "none";
    description2.style.display = "block";
    mainTitle.innerText = "OECD Deaths per Million";

    data.forEach(d => {
        const country = d.Country;
        const deaths = +d["COVID-19 deaths (2020-21 per million)"];
        countryDeathData["OECD"] = countryDeathData["OECD"] || {};
        countryDeathData["OECD"][country] = deaths;
    });

    const maxDeaths = d3.max(Object.values(countryDeathData["OECD"]));
    updateLegend(maxDeaths);
    updateMap("OECD");
});
}

function loadOriginalDataset() {
d3.csv("countries-aggregated.csv").then(data => {
    countryDeathData = {};
    dates = [];
    isOECDDataset = false;

    playButton.style.display = "inline";
    resetButton.style.display = "inline";
    dateSlider.style.display = "block";
    dateLabel.style.display = "block";
    loadOriginalButton.style.display = "none";
    loadOECDButton.style.display = "inline";
    description1.style.display = "block";
    description2.style.display = "none";
    mainTitle.innerText = "COVID-19 Deaths (Europe vs. Asia)";

    data.forEach(d => {
        const country = d.Country;
        const date = d.Date;
        const deaths = +d.Deaths;

        if (!countryDeathData[date]) {
            countryDeathData[date] = {};
            dates.push(date);
        }
        countryDeathData[date][country] = deaths;
    });

    dates.sort();
    dateSlider.max = dates.length - 1;

    updateMap(dates[0]);
});
}

loadOriginalDataset();

playButton.addEventListener("click", togglePlay);
resetButton.addEventListener("click", resetPlay);

function togglePlay() {
if (isPlaying) {
    clearInterval(interval);
    playButton.innerText = "▶ Play";
} else {
    interval = setInterval(() => {
        let dateIndex = +dateSlider.value;
        if (dateIndex < dates.length - 1) {
            dateIndex++;
        } else {
            dateIndex = 0;
        }
        dateSlider.value = dateIndex;
        const selectedDate = dates[dateIndex];
        selectedDateLabel.innerText = selectedDate;
        updateMap(selectedDate);
    }, 750 / 3);
    playButton.innerText = "⏸ Pause";
}
isPlaying = !isPlaying;
}

function resetPlay() {
clearInterval(interval);
isPlaying = false;
dateSlider.value = 0;
const selectedDate = dates[0];
selectedDateLabel.innerText = selectedDate;
updateMap(selectedDate);
playButton.innerText = "▶ Play";
}

loadOriginalButton.addEventListener("click", () => {
resetPlay();
loadOriginalDataset();
});

loadOECDButton.addEventListener("click", () => {
resetPlay();
loadOECDDataset();
});

dateSlider.addEventListener("input", function () {
const dateIndex = +this.value;
const selectedDate = dates[dateIndex];
selectedDateLabel.innerText = selectedDate;
updateMap(selectedDate);
});

 // Check that elements are found, if not log an error
 if (!dateSliderContainer || !loadOECDButton || !loadOriginalButton) {
    console.error("One or more elements were not found. Please check your HTML structure.");
} else {
    // Function to hide the date slider container
    function hideDateSliderContainer() {
        dateSliderContainer.style.display = "none";
        console.log("Date slider container hidden.");
    }

    // Function to show the date slider container
    function showDateSliderContainer() {
        dateSliderContainer.style.display = "block";
        console.log("Date slider container shown.");
    }

    // Event listeners for buttons
    loadOECDButton.addEventListener("click", hideDateSliderContainer);
    loadOriginalButton.addEventListener("click", showDateSliderContainer);
}