
d3.csv("Dataset4.csv").then(function(rawData) {
    // Data
    const years = ['1/6/2020', '1/12/2020', '1/1/2021', '1/6/2021', '1/12/2021', '1/1/2022', '1/6/2022', '1/12/2022', '1/6/2023', '1/12/2023', '1/1/2024', '1/6/2024'];
    const yearIndexMap = years.reduce((acc, year, index) => ({ ...acc, [year]: index }), {}); // Map dates to indices for easy access

    const data = {};

    // Parse raw data into structured format
    rawData.forEach(entry => {
        const region = entry.region;
        const country = entry.country;
        const dateIndex = yearIndexMap[entry.date];
        const totalVaccinated = parseInt(entry.total_vacinated, 10);

        // Initialize region and country if not already done
        if (!data[region]) data[region] = {};
        if (!data[region][country]) data[region][country] = new Array(years.length).fill(0);

        // Insert the total vaccinated count at the correct date index
        data[region][country][dateIndex] = totalVaccinated;
    });

    console.log(data);

    // Setup
    const margin = { top: 20, right: 200, bottom: 30, left: 120 };
    let width = parseInt(d3.select('.chart-container').style('width')) - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select('.chart-container')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scaleBand().range([0, height]).padding(0.1);

    // Colors
    const colors = {
        "Asia": "#ef4444",
        "Europe": "#3b82f6",
    };

    // Animation state
    let currentYearIndex = 0;
    let isPlaying = false;
    let interval;

    // Transform data for visualization
    function transformData(yearIndex) {
        const result = [];
        Object.entries(data).forEach(([region, countries]) => {
            Object.entries(countries).forEach(([country, vaccinations]) => {
                result.push({
                    country,
                    region,
                    population: vaccinations[yearIndex] || 0
                });
            });
        });
        return result.sort((a, b) => b.population - a.population);
    }

    // Update visualization
    function update(yearIndex) {
        const currentData = transformData(yearIndex);
        
        // Update scales
        x.domain([0, d3.max(currentData, d => d.population)]);
        y.domain(currentData.map(d => d.country));

        // Update axis
        const xAxis = d3.axisBottom(x).ticks(5).tickFormat(d3.format('.2s'));
        const yAxis = d3.axisLeft(y);

        svg.selectAll('.x-axis').remove();
        svg.selectAll('.y-axis').remove();

        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis);

        svg.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);

        // Update bars
        const bars = svg.selectAll('.bar')
            .data(currentData, d => d.country);

        bars.enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('fill', d => colors[d.region])
            .merge(bars)
            .transition()
            .duration(750)
            .attr('x', 0)
            .attr('y', d => y(d.country))
            .attr('width', d => x(d.population))
            .attr('height', y.bandwidth());

        bars.exit().remove();

        // Update labels
        const labels = svg.selectAll('.bar-label')
            .data(currentData, d => d.country);

        labels.enter()
            .append('text')
            .attr('class', 'bar-label')
            .merge(labels)
            .transition()
            .duration(750)
            .attr('x', d => x(d.population) + 5)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .text(d => d3.format(',')(d.population));

        labels.exit().remove();

        // Update year and total population displays with transition
        d3.select('#current-year')
            .transition()
            .duration(750)
            .text(years[yearIndex]);

        const totalPop = currentData.reduce((sum, d) => sum + d.population, 0);
        d3.select('#total-population')
            .transition()
            .duration(750)
            .text(d3.format(',')(totalPop));
    }

    // Controls
    document.getElementById('playPause').addEventListener('click', () => {
        isPlaying = !isPlaying;
        const button = document.getElementById('playPause');
        if (isPlaying) {
            button.textContent = '⏸ Pause';
            interval = setInterval(() => {
                currentYearIndex = (currentYearIndex + 1) % years.length;
                update(currentYearIndex);
            }, 2000);
        } else {
            button.textContent = '▶ Play';
            clearInterval(interval);
        }
    });

    document.getElementById('next').addEventListener('click', () => {
        currentYearIndex = (currentYearIndex + 1) % years.length;
        update(currentYearIndex);
    });

    document.getElementById('prev').addEventListener('click', () => {
        currentYearIndex = (currentYearIndex - 1 + years.length) % years.length;
        update(currentYearIndex);
    });

    document.getElementById('reset').addEventListener('click', () => {
        currentYearIndex = 0;
        isPlaying = false;
        document.getElementById('playPause').textContent = '▶ Play';
        clearInterval(interval);
        update(currentYearIndex);
    });

    // Initialize
    update(currentYearIndex);

    // Tooltip
    svg.selectAll('.bar')
        .on('mouseover', function(event, d) {
            const tooltip = document.getElementById('tooltip');
            tooltip.style.display = 'block';
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
            tooltip.innerHTML = `
                <strong>${d.country}</strong><br>
                Region: ${d.region}<br>
                Population: ${d3.format(',')(d.population)}
            `;
            d3.select(this).attr('fill', d3.color(colors[d.region]).darker(0.5)); // Highlight bar
        })
        .on('mousemove', function(event) {
            const tooltip = document.getElementById('tooltip');
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
        })
        .on('mouseout', function(d) {
            document.getElementById('tooltip').style.display = 'none';
            // d3.select(this).attr('fill', colors[d.region]); // Reset color
        });

    // Responsive resizing
    window.addEventListener('resize', () => {
        width = parseInt(d3.select('.chart-container').style('width')) - margin.left - margin.right;
        svg.attr('width', width + margin.left + margin.right);
        x.range([0, width]);
        update(currentYearIndex);
    });
});

