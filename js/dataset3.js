d3.csv("Dataset3.csv").then(function(rawData) {
    rawData.forEach(d => d.total = +d.total);

    const svg = d3.select("#chart")
        .attr("width", 600)
        .attr("height", 500)
        .append("g")
        .attr("transform", "translate(300, 250)");

    const radius = Math.min(600, 400) / 2 - 10;

    // Define a custom array of 100 unique hex color codes
    const colorArray = [
        "#e6194b", "#3cb44b", "#ffe119", "#0082c8", "#f58231", "#911eb4", "#46f0f0", "#f032e6",
        "#d2f53c", "#fabebe", "#008080", "#e6beff", "#aa6e28", "#fffac8", "#800000", "#aaffc3",
        "#808000", "#ffd8b1", "#000080", "#808080", "#FF5733", "#33FF57", "#5733FF", "#FF33A5",
        "#33A5FF", "#A5FF33", "#A533FF", "#FF33F4", "#33FFD5", "#FFA533", "#C70039", "#900C3F",
        "#DAF7A6", "#FFC300", "#581845", "#1ABC9C", "#3498DB", "#9B59B6", "#34495E", "#16A085",
        "#27AE60", "#2980B9", "#8E44AD", "#2C3E50", "#F39C12", "#D35400", "#E74C3C", "#ECF0F1",
        "#95A5A6", "#7F8C8D", "#FF5733", "#33FF57", "#5733FF", "#FF33A5", "#33A5FF", "#A5FF33",
        "#A533FF", "#FF33F4", "#33FFD5", "#FFA533", "#FFD700", "#ADFF2F", "#00FF7F", "#8A2BE2",
        "#7FFF00", "#32CD32", "#4682B4", "#B22222", "#5F9EA0", "#00CED1", "#4B0082", "#D2691E",
        "#556B2F", "#FF4500", "#DC143C", "#FF1493", "#00BFFF", "#FF8C00", "#9932CC", "#8B0000",
        "#3CB371", "#808000", "#6A5ACD", "#2E8B57", "#DA70D6", "#FF6347", "#B0C4DE", "#00008B",
        "#FFD700", "#DDA0DD", "#20B2AA", "#778899", "#000080", "#FF69B4", "#6B8E23", "#CD5C5C",
        "#F4A460", "#B8860B", "#4B0082", "#8B008B", "#ADFF2F", "#7CFC00", "#FFFF54", "#FF8C00"
    ];

    // Create a color scale with the custom array of 100 colors
    const color = d3.scaleOrdinal()
        .domain(rawData.map(d => d.country))
        .range(colorArray);

    const tooltip = d3.select("#tooltip");

    const pie = d3.pie().value(d => d.total);
    const arc = d3.arc().outerRadius(radius).innerRadius(0);

    function updateChart(region) {
        let filteredData;

        if (region === "All") {
            filteredData = Array.from(
                d3.rollup(rawData, v => d3.sum(v, d => d.total), d => d.country),
                ([key, total]) => ({ key, total })
            );
        } else {
            filteredData = Array.from(
                d3.rollup(
                    rawData.filter(d => d.region === region),
                    v => d3.sum(v, d => d.total),
                    d => d.country
                ),
                ([key, total]) => ({ key, total })
            );
        }

        const pieData = pie(filteredData);

        const slices = svg.selectAll("path").data(pieData, d => d.data.key);

        slices.enter()
            .append("path")
            .attr("d", arc)
            .attr("fill", d => color(d.data.key)) // Use the custom color scale
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("transform", "scale(1.1)");
            
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
            
                tooltip.html(`${d.data.key}: ${d.data.total}`)
                    .style("left", (event.pageX - 150) + "px")  // Move tooltip more to the left
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX - 650) + "px") // Maintain position further left on mousemove
                       .style("top", (event.pageY - 450) + "px");
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
                .html(`<div class="legend-color" style="background-color: ${color(d.key)};"></div> ${d.key}: ${d.total}`);
        });
    }

    updateChart("All");

    d3.selectAll('input[name="region"]').on("change", function() {
        const selectedRegion = d3.select(this).property("value");
        updateChart(selectedRegion);
    });
});