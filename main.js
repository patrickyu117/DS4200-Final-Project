const width = 800;
const height = 500;
const margin = { top: 40, right: 40, bottom: 60, left: 60 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Create SVG element
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// Create chart group
const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

// Load the data
d3.csv("d3_data.csv").then(data => {
    // Process data - group by country and status, calculate averages
    const processedData = d3.rollup(
        data,
        v => ({
            "GDP": d3.mean(v, d => +d.GDP),
            "Life expectancy": d3.mean(v, d => +d["Life expectancy"]),
            "Country": v[0].Country,
            "Status": v[0].Status
        }),
        d => d.Country
    );

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .attr("class", "chart-title")
        .text("Average Life Expectancy by Country Status and GDP per Capita (USD) in 2015")
        .style("font-size", "20px");

    // Convert the map to array
    const countries = Array.from(processedData.values());

    // Create scales
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(countries, d => d.GDP) * 1.1])
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(countries, d => d["Life expectancy"]) * 1.1])
        .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(["Developed", "Developing"])
        .range(["steelblue", "orange"]);

    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(xAxis);

    g.append("g")
        .call(yAxis);

    // Add axis labels
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text("Average GDP");

    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Average Life Expectancy");

    // Draw points
    const points = g.selectAll("circle")
        .data(countries)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.GDP))
        .attr("cy", d => yScale(d["Life expectancy"]))
        .attr("r", 5)
        .attr("fill", d => colorScale(d.Status))
        .attr("opacity", 1)
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip.html(`Country: ${d.Country} <br /> GDP: ${d.GDP.toFixed(2)} <br /> Life Expectancy: ${d["Life expectancy"].toFixed(2)}<br>Status: ${d.Status}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Handle radio button selection
    d3.selectAll("input[name='status']").on("change", function () {
        const selected = this.value;

        points.transition()
            .duration(300)
            .attr("opacity", d => d.Status === selected ? 1 : 0.1);
    });

    // Initialize with "Developed" selected
    points.attr("opacity", d => d.Status === "Developed" ? 1 : 0.1);
});