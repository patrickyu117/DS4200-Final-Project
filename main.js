const width = 800;
const height = 500;
const margin = { top: 40, right: 40, bottom: 60, left: 60 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Create SVG element
const svg = d3.select("#vis2")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Load the data
d3.csv("d3_data.csv").then(data => {
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
        .range(["#440154FF", "#7AD151FF"]);


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
        .text("Average GDP per Capita (USD)");

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
            const [x, y] = d3.pointer(event, g.node());

            const text = `Country: ${d.Country}
        GDP: ${d.GDP.toFixed(2)}
        Life Expectancy: ${d["Life expectancy"].toFixed(2)}
        Status: ${d.Status}`;

            const lines = text.split("\n");

            // Join text lines
            const textElement = svgTooltip.select("text")
                .selectAll("tspan")
                .data(lines);

            textElement.enter()
                .append("tspan")
                .merge(textElement)
                .attr("x", 5)
                .attr("dy", (d, i) => i === 0 ? 0 : 15)
                .text(d => d);

            textElement.exit().remove();

            const textNode = svgTooltip.select("text").node();
            const { width, height } = textNode.getBBox();

            svgTooltip.select("rect")
                .attr("width", width + 10)
                .attr("height", height + 10);

            svgTooltip
                .attr("transform", `translate(${x + 10},${y - 10})`)
                .style("display", null);
        })
        .on("mouseout", function () {
            svgTooltip.style("display", "none");
        });

    d3.selectAll("input[name='status']").on("change", function () {
        const selected = this.value;

        const filtered = countries.filter(d => selected === "All" || d.Status === selected);

        points.transition()
            .duration(300)
            .attr("opacity", d => selected === "All" || d.Status === selected ? 1 : 0.1);

        updateRegressionLine(filtered);
    });

    // Compute regression line
    function linearRegression(data) {
        const n = data.length;
        const sumX = d3.sum(data, d => d.GDP);
        const sumY = d3.sum(data, d => d["Life expectancy"]);
        const sumXY = d3.sum(data, d => d.GDP * d["Life expectancy"]);
        const sumX2 = d3.sum(data, d => d.GDP * d.GDP);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        // Format regression equation
        const regressionText = `y = ${slope.toFixed(4)}x + ${intercept.toFixed(2)}`;
        g.selectAll(".regression-legend").remove();
        // Add legend text
        g.append("text")
            .attr("class", "regression-legend")
            .attr("x", innerWidth - 150)
            .attr("y", 10)
            .attr("text-anchor", "start")
            .style("font-size", "12px")
            .style("fill", "black")
            .text(regressionText);
        return { slope, intercept };
    }

    // Function to draw/update regression line
    function updateRegressionLine(filteredData) {
        const { slope, intercept } = linearRegression(filteredData);

        const xMin = xScale.domain()[0];
        const xMax = xScale.domain()[1];
        const yMin = slope * xMin + intercept;
        const yMax = slope * xMax + intercept;

        const line = g.selectAll(".regression-line").data([null]);

        line.enter()
            .append("line")
            .attr("class", "regression-line")
            .merge(line)
            .transition()
            .duration(500)
            .attr("x1", xScale(xMin))
            .attr("y1", yScale(yMin))
            .attr("x2", xScale(xMax))
            .attr("y2", yScale(yMax))
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");
    }
    updateRegressionLine(countries);

    const svgTooltip = g.append("g")
        .style("display", "none");

    svgTooltip.append("rect")
        .attr("fill", "black")
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("opacity", 0.7);

    svgTooltip.append("text")
        .attr("fill", "white")
        .attr("x", 5)
        .attr("y", 15)
        .style("font-size", "12px");
});