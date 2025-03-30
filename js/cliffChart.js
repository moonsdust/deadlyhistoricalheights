/*******************************************
 *             CliffChart.js               *
 *******************************************/

class CliffChart {
    /**
     * @param {Array} membersData - e.g. [{ year: 1900, died: "TRUE" }, ... ]
     *   Each object needs { year: Number, died: Boolean/String }.
     */
    constructor(membersData) {
        // 1) Store data and sort by year
        this.data = this.prepareData(membersData);
        this.data.sort((a, b) => d3.ascending(a.year, b.year));

        // 2) Chart dimensions
        this.margin = { top: 20, right: 20, bottom: 20, left: 40 };
        this.width = 600 - this.margin.left - this.margin.right;
        this.height = 600 - this.margin.top - this.margin.bottom;

        // 3) For the incremental scatter plot:
        //    We'll accumulate data in partialData, drawing each dot as it falls.
        this.partialData = [];
        this.index = 0; // index for next data item

        // Initialize visualization
        this.initVis();
    }

    /**
     * prepareData(membersData):
     *   - Convert strings to numbers/booleans
     *   - Group by year, sum the number of deaths
     *   - Return an array of { year, deathCount }, sorted by year
     */
    prepareData(membersData) {
        // A) Clean & parse each row
        const cleanedRows = membersData.map(d => {
            return {
                year: +d.year,
                died: (d.died && d.died.toUpperCase() === "TRUE") ? 1 : 0
            };
        });

        // B) Group by year, summing the died column
        const deathsByYear = d3.rollup(
            cleanedRows,
            rows => d3.sum(rows, r => r.died),
            d => d.year
        );

        // C) Convert the rollup map into an array of { year, deathCount }
        let result = [];
        for (let [year, totalDeaths] of deathsByYear) {
            if (!isNaN(year) && year > 0) {
                result.push({ year, deathCount: totalDeaths });
            }
        }

        // D) Sort by ascending year
        result.sort((a, b) => d3.ascending(a.year, b.year));

        return result;
    }

    initVis() {
        // A) Create the main SVG
        this.svg = d3.select("#myCliffSvg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom);

        // Add a blur filter definition for the background image
        this.svg.append("defs")
            .append("filter")
            .attr("id", "blurFilter")
            .append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", 1);

        // Use most of the vertical space for the scatterplot
        const scatterChartHeight = this.height * 0.8;
        this.scatterChartHeight = scatterChartHeight;
        const scatterChartY = this.margin.top; // starting at the top margin

        // B) Scatter Plot Chart Group
        this.scatterG = this.svg.append("g")
            .attr("class", "scatter-chart")
            .attr("transform", `translate(${this.margin.left}, ${scatterChartY})`);

        // X scale for scatter plot
        const years = this.data.map(d => d.year);
        this.xScaleScatter = d3.scaleLinear()
            .domain([d3.min(years), d3.max(years)])
            .range([0, this.width]);


        // Y scale for scatter plot
        const maxDeaths = d3.max(this.data, d => d.deathCount || 0);
        this.yScaleScatter = d3.scaleLinear()
            .domain([0, maxDeaths])
            .range([scatterChartHeight, 0]);

        // Optionally add axes
        this.scatterG.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${scatterChartHeight})`)
            .call(d3.axisBottom(this.xScaleScatter).tickFormat(d3.format("d")));

        this.scatterG.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(this.yScaleScatter));

        // Add X axis label
        this.scatterG.append("text")
            .attr("class", "x-axis-label")
            .attr("text-anchor", "middle")
            .attr("x", this.width / 2)
            .attr("y", scatterChartHeight + this.margin.bottom + 10)
            .text("Year");

        // Add Y axis label
        this.scatterG.append("text")
            .attr("class", "y-axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -scatterChartHeight / 2)
            .attr("y", -this.margin.left + 15)
            .text("Death Count");
        

        // Draw a blurred mountain background using a real image
        this.drawMountainBackground();
    }

    drawMountainBackground() {
        this.scatterG.insert("image", ":first-child")
            .attr("xlink:href", "images/mountain.png")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.width)
            .attr("height", this.scatterChartHeight)
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("filter", "url(#blurFilter)");
    }

    startFlow() {
        this.flowStep();
    }

    /**
     * flowStep()
     *   - Adds one new data point
     *   - Animates the new dot falling into the scatter plot
     */
    flowStep() {
        if (this.index < this.data.length) {
            const newDatum = this.data[this.index];

            // Add this point to partialData for the scatter plot
            this.partialData.push(newDatum);

            // Update the scatter plot (animate falling dot)
            this.updateScatterPlot();

            // Increment index & schedule next step
            this.index++;
            setTimeout(() => this.flowStep(), 200);
        }
    }

    /**
     * updateScatterPlot()
     *   - Adds a new dot to the scatter plot.
     *   - The dot starts above the chart (to mimic "falling off the mountain")
     *     and then transitions down to its proper y position.
     */
    updateScatterPlot() {
        const dots = this.scatterG.selectAll(".dot")
            .data(this.partialData, d => d.year);

        const dotsEnter = dots.enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => this.xScaleScatter(d.year))
            .attr("cy", -20)  // Start above the scatter area
            .attr("r", 4)     // Smaller dot
            .attr("fill", "white");

        dotsEnter.transition()
            .duration(100)
            .attr("cy", d => this.yScaleScatter(d.deathCount));
    }
}