d3.csv("Dataset1.csv").then(function(rawData) {

    // Log the data to ensure it is loaded correctly
    console.log("Loaded data:", rawData);

    const data = rawData.map(d => ({
        Region: d.Region,
        Country: d.Country,
        Cases: parseInt(d['Total Cases'].replace(/,/g, ''))
    }));

    console.log(data);

// Setup dimensions
    const margin = { top: 40, right: 200, bottom: 60, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);


    // Scales
    const regions = [...new Set(data.map(d => d.Region))];
    const countries = [...new Set(data.map(d => d.Country))];

    // Color scales for different regions
    const asiaColorScale = d3.scaleOrdinal()
    .domain(data.filter(d => d.Region === 'Asia').map(d => d.Country))
    .range(d3.quantize(t => d3.interpolateBlues(0.3 + 0.7 * t), 48));

    const europeColorScale = d3.scaleOrdinal()
    .domain(data.filter(d => d.Region === 'Europe').map(d => d.Country))
    .range(d3.quantize(t => d3.interpolateReds(0.3 + 0.7 * t), 50));


    const x0 = d3.scaleBand()
        .domain(regions)
        .range([0, width])
        .padding(0.3);

    const x1 = d3.scaleBand()
        .domain(countries)
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const y = d3.scaleLinear()
        .range([height, 0]);

    // Create axes groups
    const xAxis = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0,${height})`);

    const yAxis = svg.append("g")
        .attr("class", "y axis");

    // Create bars container
    const barsContainer = svg.append("g")
        .attr("class", "bars-container");

    // Create tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Update function
    function updateChart(grouped = false) {
        // Clear previous content
        barsContainer.selectAll("*").remove();

        if (grouped) {
            // Grouped view
            y.domain([0, d3.max(data, d => d.Cases)]).nice();

            regions.forEach(region => {
                const regionData = data.filter(d => d.Region === region);
                const colorScale = region === 'Asia' ? asiaColorScale : europeColorScale;
                
                // Calculate the total width of bars for centering
                const totalBarsWidth = regionData.length * x1.bandwidth();
                const startOffset = (x0.bandwidth() - totalBarsWidth) / 2;
                
                const regionGroup = barsContainer.append("g")
                    .attr("transform", `translate(${x0(region)},0)`);

                regionGroup.selectAll("rect")
                    .data(regionData)
                    .enter()
                    .append("rect")
                    .attr("x", (d, i) => startOffset + i * x1.bandwidth())
                    .attr("width", x1.bandwidth())
                    .attr("y", height)
                    .attr("height", 0)
                    .attr("fill", d => colorScale(d.Country))
                    .transition()
                    .duration(750)
                    .attr("y", d => y(d.Cases))
                    .attr("height", d => height - y(d.Cases));

                // Add hover effects
                regionGroup.selectAll("rect")
                    .on("mouseover", function(event, d) {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", .9);
                        tooltip.html(`Region: ${d.Region}<br>Country: ${d.Country}<br>Cases: ${d.Cases.toLocaleString()}`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });
            });
        } else {
            // Stacked view
            const stackedData = d3.stack()
                .keys(countries)
                .value((d, key) => {
                    const match = data.find(item => item.Region === d && item.Country === key);
                    return match ? match.Cases : 0;
                })(regions);

            y.domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])]).nice();

            const layers = barsContainer.selectAll("g")
                .data(stackedData)
                .enter()
                .append("g")
                .attr("fill", d => {
                    const matchingData = data.find(item => item.Country === d.key);
                    return matchingData.Region === 'Asia' ? 
                        asiaColorScale(d.key) : europeColorScale(d.key);
                });

            layers.selectAll("rect")
                .data(d => d)
                .enter()
                .append("rect")
                .attr("x", d => x0(d.data))
                .attr("width", x0.bandwidth())
                .attr("y", height)
                .attr("height", 0)
                .transition()
                .duration(750)
                .attr("y", d => y(d[1]))
                .attr("height", d => y(d[0]) - y(d[1]));

            // Add hover effects
            layers.selectAll("rect")
                .on("mouseover", function(event, d) {
                    const key = d3.select(this.parentNode).datum().key;
                    const value = data.find(item => item.Region === d.data && item.Country === key);
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(`Region: ${value.Region}<br>Country: ${key}<br>Cases: ${value.Cases.toLocaleString()}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        }

        // Update axes
        xAxis.transition()
            .duration(750)
            .call(d3.axisBottom(x0));

        yAxis.transition()
            .duration(750)
            .call(d3.axisLeft(y)
                .tickFormat(d => (d / 1000000).toFixed(1) + "M"));
    }

    // Add legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 10}, 0)`);

    // Create separate legends for Asia and Europe
    const asiaLegend = legend.append("g")
        .attr("class", "asia-legend");
    
    const europeLegend = legend.append("g")
        .attr("class", "europe-legend")
        .attr("transform", "translate(0, 1)");

    // Asia legend title
    asiaLegend.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("font-weight", "bold")
        .text("Asia");

    // Europe legend title
    europeLegend.append("text")
        .attr("x", 110)
        .attr("y", -10)
        .attr("font-weight", "bold")
        .text("Europe");

    // Add Asia items
    const asiaData = data.filter(d => d.Region === 'Asia');
    asiaLegend.selectAll("text").remove();
    asiaLegend.selectAll("rect")
    .data(asiaData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 15) // reduced spacing
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", d => asiaColorScale(d.Country));

    asiaLegend.selectAll("text")
    .data(asiaData)
    .enter()
    .append("text")
    .attr("x", 20)
    .attr("y", (d, i) => i * 15 + 10) // adjusted for new spacing
    .text(d => d.Country);

    // Add Europe items
    const europeData = data.filter(d => d.Region === 'Europe');
    europeLegend.selectAll("text").remove();
    europeLegend.selectAll("rect")
        .data(europeData)
        .enter()
        .append("rect")
        .attr("x", 100)
        .attr("y", (d, i) => i * 15) // adjusted spacing
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", d => europeColorScale(d.Country));

    europeLegend.selectAll("text")
        .data(europeData)
        .enter()
        .append("text")
        .attr("x", 120)
        .attr("y", (d, i) => i * 15 + 10) // matching spacing
        .text(d => d.Country);

    // Add axis labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text("Region");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .text("Total Cases");

    // Initial render
    updateChart(false);

    // Toggle button handler
    let isGrouped = false;
    d3.select("#toggleButton").on("click", function() {
        isGrouped = !isGrouped;
        this.textContent = isGrouped ? "Switch to Stacked View" : "Switch to Grouped View";
        updateChart(isGrouped);

    });
});
