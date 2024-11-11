d3.csv("Dataset3.csv").then(function(rawData) {
    console.log(rawData);

    // Parse `population_in_thousands` correctly by removing commas and calculate `total`
    rawData.forEach(d => {
        // Remove commas from population values and convert to number
        const population = +d.population_in_thousands.replace(/,/g, '');
        d.total = d.total ? +d.total : (+d.hospital_beds_per_thousand * population / 1000) || 0;
        d.total_hospital_beds = +d.total_hospital_beds || 0;
    });

    // Calculate the overall grand total for percentage calculation
    const grandTotal = d3.sum(rawData, d => d.total) || 1;

    // Calculate percentage for each country and store it
    rawData.forEach(d => {
        d.percentage = grandTotal > 0 ? ((d.total / grandTotal) * 100).toFixed(2) : "0.00"; // Avoid NaN if grandTotal is 0
    });

    // Calculate the total of all percentages (should be close to 100%)
    const totalPercentage = d3.sum(rawData, d => parseFloat(d.percentage));
    console.log("Total percentage across all countries:", totalPercentage);

    const svg = d3.select("#chart")
        .attr("width", 600)
        .attr("height", 500)
        .append("g")
        .attr("transform", "translate(300, 250)");

    const radius = Math.min(600, 400) / 2 - 10;

    const colorArray = [
        "#e6194b", "#3cb44b", "#ffe119", "#0082c8", "#f58231", "#911eb4", "#46f0f0", "#f032e6",
        "#d2f53c", "#fabebe", "#008080", "#e6beff", "#aa6e28", "#fffac8", "#800000", "#aaffc3",
        "#808000", "#ffd8b1", "#000080", "#808080", "#ffffff", "#000000", "#fbb4ae", "#b3cde3",
        "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc", "#e5d8bd", "#fddaec"
    ];

    const color = d3.scaleOrdinal()
        .domain(rawData.map(d => d.country))
        .range(colorArray);

    const tooltip = d3.select("#tooltip");

    const pie = d3.pie().value(d => d.total);
    const arc = d3.arc().outerRadius(radius).innerRadius(0);

    function updateChart(region) {
        let filteredData;
        let regionTotal;
    
        if (region === "All") {
            regionTotal = d3.sum(rawData, d => d.total);
            filteredData = Array.from(
                d3.rollup(rawData, v => d3.sum(v, d => d.total), d => d.country),
                ([key, total]) => ({
                    key,
                    total,
                    percentage: regionTotal > 0 ? ((total / regionTotal) * 100).toFixed(2) : "0.00" // Calculate percentage
                })
            );
        } else {
            const regionData = rawData.filter(d => d.region === region);
            regionTotal = d3.sum(regionData, d => d.total);
            filteredData = Array.from(
                d3.rollup(regionData, v => d3.sum(v, d => d.total), d => d.country),
                ([key, total]) => ({
                    key,
                    total,
                    percentage: regionTotal > 0 ? ((total / regionTotal) * 100).toFixed(2) : "0.00" // Calculate percentage
                })
            );
        }
    
        const pieData = pie(filteredData);
    
        const slices = svg.selectAll("path").data(pieData, d => d.data.key);
    
        slices.enter()
            .append("path")
            .attr("d", arc)
            .attr("fill", d => color(d.data.key))
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("transform", "scale(1.1)");
    
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
    
                tooltip.html(`${d.data.key}: ${d.data.total} (${d.data.percentage}%)`)
                tooltip.style("left", (event.pageX - 1200) + "px")
                       .style("top", (event.pageY - 250) + "px");
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX - 1200) + "px")
                       .style("top", (event.pageY - 250) + "px");
            })
            .on("mouseleave", function() {
                d3.select(this).transition().duration(200).attr("transform", "scale(1.0)");
                tooltip.transition().duration(200).style("opacity", 0);
            })
            .merge(slices)
            .transition()
            .duration(500)
            .attrTween("d", function(d) {
                const i = d3.interpolate(this._current, d);
                this._current = i(0);
                return t => arc(i(t));
            });
    
        slices.exit().remove();
    
        const legend = d3.select(".legend");
        legend.html("");
        filteredData.forEach(d => {
            legend.append("div")
                .attr("class", "legend-item")
                .html(`<div class="legend-color" style="background-color: ${color(d.key)};"></div> ${d.key}: ${d.total} (${d.percentage}%)`);
        });
    }

    updateChart("All");

    d3.selectAll('input[name="region"]').on("change", function() {
        const selectedRegion = d3.select(this).property("value");
        updateChart(selectedRegion);
    });
});
