class GuessLineChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.rawData = data;
        this.userDrawnPoints = [];
        this.visibleYears = 20;
        this.data = [];

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = { top: 20, right: 30, bottom: 40, left: 60 };
        vis.width = 800 - vis.margin.left - vis.margin.right;
        vis.height = 500 - vis.margin.top - vis.margin.bottom;

        vis.svg = d3.select("#" + vis.parentElement)
                    .append("svg")
                    .attr("width", vis.width + vis.margin.left + vis.margin.right)
                    .attr("height", vis.height + vis.margin.top + vis.margin.bottom);

        vis.chartArea = vis.svg.append("g")
                                .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

        vis.x = d3.scaleTime()
                    .range([0, vis.width]);

        vis.y = d3.scaleLinear()
                    .range([vis.height, 0]);

        vis.xAxis = vis.chartArea.append("g")
                                .attr("class", "x-axis")
                                .attr("transform", `translate(0, ${vis.height})`);

        vis.yAxis = vis.chartArea.append("g")
                                .attr("class", "y-axis");

        vis.chartArea.append("text")
                    .attr("class", "y-axis-label")
                    .attr("x", -vis.height / 2)
                    .attr("y", -50)
                    .attr("transform", "rotate(-90)")
                    .attr("text-anchor", "middle")
                    .style("font-size", "14px")
                    .style("fill", "#333")
                    .text("Average Death Rate");

        vis.line = d3.line()
                    .x(d => vis.x(d.Year))
                    .y(d => vis.y(d.DeathRate))
                    .curve(d3.curveMonotoneX);

        vis.trueLine = vis.chartArea.append("path")
                                    .attr("fill", "none")
                                    .attr("stroke", "red")
                                    .attr("stroke-width", 4);

        vis.fullTrueLine = vis.chartArea.append("path")
                                        .attr("fill", "none")
                                        .attr("stroke", "red")
                                        .attr("stroke-width", 4)
                                        .attr("stroke-dasharray", 4)
                                        .attr("opacity", 0);

        vis.userLine = vis.chartArea.append("path")
                                    .attr("fill", "none")
                                    .attr("stroke", "blue")
                                    .attr("stroke-width", 4);

        vis.overlay = vis.chartArea.append("rect")
                                    .attr("width", vis.width)
                                    .attr("height", vis.height)
                                    .attr("fill", "transparent")
                                    .style("cursor", "crosshair");

        vis.svg.append("text")
                .attr("class", "x-axis-label")
                .attr("x", vis.width / 2)
                .attr("y", vis.height + 55)
                .style("text-anchor", "middle")
                .style("font-size", "14px")
                .style("fill", "#333")
                .text("Year");
                        

        vis.isDrawing = false;

        vis.overlay.on("mousedown", () => { vis.isDrawing = true; vis.userDrawnPoints = []; });

        vis.overlay.on("mousemove", (event) => vis.handleDrawing(event));

        vis.overlay.on("mouseup", () => vis.isDrawing = false);

        d3.select("body").on("mouseup", () => vis.isDrawing = false);

        d3.select("#reveal-btn").on("click", () => vis.onRevealClick());

        vis.wrangleData();
    }


    wrangleData() {
        let vis = this;
        vis.data = vis.computeMovingAverage(vis.rawData, 25);


        vis.initialData = vis.data.slice(0, vis.visibleYears);
        vis.remainingData = vis.data.slice(vis.visibleYears);

        vis.lastVisibleYear = vis.initialData[vis.initialData.length - 1].Year.getTime();

        vis.x.domain(d3.extent(vis.data, d => d.Year));
        vis.y.domain([0, d3.max(vis.data, d => d.DeathRate)]);
        
        vis.updateVis();
    }


    updateVis() {
        let vis = this;

        vis.xAxis.transition()
                .duration(750)
                .call(d3.axisBottom(vis.x));

        vis.yAxis.transition()
                .duration(750)
                .call(d3.axisLeft(vis.y));

        vis.trueLine.datum(vis.initialData)
                    .transition()
                    .duration(750)
                    .attr("d", vis.line);

        vis.fullTrueLine.datum(vis.data)
                        .attr("d", vis.line);
    }

    // Helper Functions Outside of the Traditional Vis cycle

    handleDrawing(event) {
        let vis = this;
        if (!vis.isDrawing) return;

        let coords = d3.pointer(event, vis.chartArea.node());
        let year = vis.x.invert(coords[0]);
        let deathRate = vis.y.invert(coords[1]);

        if (year.getTime() >= vis.lastVisibleYear) {
            vis.userDrawnPoints.push({ Year: year, DeathRate: deathRate });
            vis.updateUserLine();
        }
    }

    updateUserLine() {
        let vis = this;

        let userLineGen = d3.line()
                            .x(d => vis.x(d.Year))
                            .y(d => vis.y(d.DeathRate))
                            .curve(d3.curveLinear); 

        vis.userLine.attr("d", userLineGen(vis.userDrawnPoints));
    }

    onRevealClick() {
        let vis = this;

        vis.fullTrueLine.transition()
            .duration(750)
            .attr("opacity", 1);

        d3.select(".reveal-text")
            .transition()
            .duration(750)
            .style("opacity", 1);
    }

    computeMovingAverage(data, windowSize) {
        return data.map((d, i, arr) => {
            let start = Math.max(0, i - windowSize + 1);
            let subset = arr.slice(start, i + 1);
            let avgDeathRate = d3.mean(subset, d => d.DeathRate);
            return { Year: d.Year, DeathRate: avgDeathRate };
        });
    }
}
