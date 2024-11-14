d3.csv("Dataset2.csv").then(function(rawData) {
    // Log the data to ensure it is loaded correctly
    console.log("Loaded data:", rawData);

    // Aggregate data to get total deaths for each region
    const dataAsiaEurope = d3.rollup(
        rawData,
        v => d3.sum(v, d => +d.total_deaths), // Sum total deaths for each region
        d => d.region
    );

    // Convert rollup result to a more convenient array for plotting
    const aggregatedData = Array.from(dataAsiaEurope, ([region, total]) => ({ region, total }));

    console.log("Aggregated data:", aggregatedData);


    const lineChartData = Array.from(
        d3.group(rawData, d => d.region + d.date), // Group by region and date combination
        ([key, values]) => ({
            region: values[0].region,
            date: values[0].date,
            total_deaths: d3.sum(values, v => +v.total_deaths) // Sum total_deaths for each group
        })
    );

    console.log("Line Chart Data:", lineChartData);

    const margin = { top: 40, right: 40, bottom: 80, left: 100 };
    const width = 600 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Bar Chart
    function drawBarChart() {
        d3.select("#barChart").html("");

        const svg = d3.select("#barChart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(aggregatedData.map(d => d.region))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(aggregatedData, d => d.total)])
            .range([height, 0]);

        svg.selectAll(".bar")
            .data(aggregatedData)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.region))
            .attr("width", x.bandwidth())
            .attr("y", height)
            .attr("height", 0)
            .attr("fill", d => d.region === "Asia" ? "steelblue" : "orange")
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(`${d.region}: ${d.total.toLocaleString()}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition().duration(500).style("opacity", 0);
            })
            .transition()
            .duration(1000)
            .attr("y", d => y(d.total))
            .attr("height", d => height - y(d.total));

        // X-axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Y-axis
        svg.append("g")
            .call(d3.axisLeft(y));

        // X-axis label
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 20)
            .attr("text-anchor", "middle")
            .text("Region");

        // Y-axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 30)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .text("Total Deaths");
    }


    
    // Function to draw the line chart
    function drawLineChart() {
        // Clear existing chart
        d3.select("#lineChart").html("");
        
        const svg = d3.select("#lineChart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // Create tooltip div
        const tooltip = d3.select("#lineChart")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "1px solid #ddd")
            .style("border-radius", "4px")
            .style("padding", "8px")
            .style("pointer-events", "none");
        
        // Parse date and set up scales
        const parseDate = d3.timeParse("%d/%m/%Y");
        lineChartData.forEach(d => {
            d.date = parseDate(d.date);
        });
        
        const x = d3.scaleTime()
            .domain(d3.extent(lineChartData, d => d.date))
            .range([0, width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(lineChartData, d => d.total_deaths)])
            .range([height, 0]);
        
        // Line generator
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.total_deaths));
        
        // Filter data by region
        const asiaData = lineChartData.filter(d => d.region === "Asia");
        const europeData = lineChartData.filter(d => d.region === "Europe");
        
        // Create invisible overlay for better tooltip interaction
        const bisect = d3.bisector(d => d.date).left;
        
        // Add overlay for mouse tracking
        const focus = svg.append("g")
            .style("display", "none");
        
        // Add vertical line
        focus.append("line")
            .attr("class", "focus-line")
            .style("stroke", "#999")
            .style("stroke-dasharray", "3,3")
            .attr("y1", 0)
            .attr("y2", height);
        
        // Add circles for each line
        focus.append("circle")
            .attr("class", "focus-circle-asia")
            .style("fill", "steelblue")
            .attr("r", 5);
        
        focus.append("circle")
            .attr("class", "focus-circle-europe")
            .style("fill", "orange")
            .attr("r", 5);
        
        // Add the lines
        svg.append("path")
            .datum(asiaData)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", line);
        
        svg.append("path")
            .datum(europeData)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "orange")
            .attr("stroke-width", 2)
            .attr("d", line);
        
        // Add overlay rectangle for mouse events
        svg.append("rect")
            .attr("class", "overlay")
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all")
            .on("mouseover", () => {
                focus.style("display", null);
                tooltip.style("opacity", 1);
            })
            .on("mouseout", () => {
                focus.style("display", "none");
                tooltip.style("opacity", 0);
            })
            .on("mousemove", mousemove);
        
        function formatDate(date) {
            // Create UTC date to avoid timezone issues
            const utcDate = new Date(Date.UTC(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            ));
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                timeZone: 'UTC'
            }).format(utcDate);
        }
        
        function mousemove(event) {
            const x0 = x.invert(d3.pointer(event)[0]);
            const iAsia = bisect(asiaData, x0, 1);
            const iEurope = bisect(europeData, x0, 1);
            
            const dAsia = asiaData[iAsia];
            const dEurope = europeData[iEurope];
            
            if (dAsia && dEurope) {
                focus.select(".focus-line")
                    .attr("x1", x(dAsia.date))
                    .attr("x2", x(dAsia.date));
                
                focus.select(".focus-circle-asia")
                    .attr("cx", x(dAsia.date))
                    .attr("cy", y(dAsia.total_deaths));
                
                focus.select(".focus-circle-europe")
                    .attr("cx", x(dEurope.date))
                    .attr("cy", y(dEurope.total_deaths));
                
                tooltip.html(`<span style="color: black"><strong>Year:</strong> ${formatDate(dAsia.date)}</span><br/>
                             <span style="color: steelblue"><strong>Asia:</strong> ${d3.format(",")(dAsia.total_deaths)}</span><br/>
                             <span style="color: orange"><strong>Europe:</strong> ${d3.format(",")(dEurope.total_deaths)}</span>`)
                             .style("left", (event.pageX - 900) + "px")
                             .style("top", (event.pageY - 550) + "px");
            }
        }
        
        // X-axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y")));
        
        // Y-axis
        svg.append("g")
            .call(d3.axisLeft(y));
        
        // Labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 20)
            .attr("text-anchor", "middle")
            .text("Year");
        
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 30)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .text("Total Deaths");
    }
    // Draw both charts initially
    drawBarChart();
    drawLineChart();

    // Tab switching logic
    d3.selectAll(".tab").on("click", function() {
        d3.selectAll(".tab").classed("active", false);
        d3.selectAll(".chart").classed("active", false);

        const target = d3.select(this).attr("data-target");
        d3.select(this).classed("active", true);
        d3.select(target).classed("active", true);
    });
});
