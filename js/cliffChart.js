/*******************************************
 *               CliffChart.js             *
 *******************************************/

/**
 * A simple stick figure path with a full circle head,
 * from y=-30 (head) to y=0 (feet).
 */
const STICK_FIGURE_PATH = `
  M 0 -30
  m -5 0
  a 5 5 0 1 1 10 0
  a 5 5 0 1 1 -10 0

  M 0 -25
  L 0 -5

  M 0 -20
  L -5 -15
  M 0 -20
  L 5 -15

  M 0 -5
  L -5 0
  M 0 -5
  L 5 0
`;

class CliffChart {
    /**
     * @param {Array} data - e.g. [{ year: 1900, deathCount: 10 }, ... ]
     *   Each object needs { year: Number, deathCount: Number }.
     */
    constructor(membersData) {
        // 1) Store data and sort by year
        this.data = this.prepareData(membersData);
        this.data.sort((a, b) => d3.ascending(a.year, b.year));

        // 2) Chart dimensions
        this.margin = { top: 20, right: 20, bottom: 20, left: 40 };
        this.width = 600 - this.margin.left - this.margin.right;
        this.height = 600 - this.margin.top - this.margin.bottom;

        // 3) Rolling queue for stick figures (max 5)
        this.activeData = [];
        this.index = 0; // which data item we add next

        // 4) For the incremental line chart:
        //    We'll accumulate data in partialData, drawing one segment at a time.
        this.partialData = [];

        // Initialize everything
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
        // Make a new array of cleaned rows
        const cleanedRows = membersData.map(d => {
            return {
                year: +d.year,
                died: (d.died && d.died.toUpperCase() === "TRUE") ? 1 : 0
                // plus any other columns you need
            };
        });

        // B) Group by year, sum the died column
        //    We'll use d3.rollup for grouping:
        const deathsByYear = d3.rollup(
            cleanedRows,
            rows => d3.sum(rows, r => r.died),
            d => d.year
        );

        // C) Convert the rollup map into an array of { year, deathCount }
        //    Note: Some years might be 0 if no one died; if you want to include them, handle missing years as needed.
        let result = [];
        for (let [year, totalDeaths] of deathsByYear) {
            // You might want to skip invalid years (like year=0 or NaN) if they exist
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

        // B) We'll split the vertical space into two sections:
        //    - Top "stick figure" chart
        //    - Bottom line chart
        this.topChartHeight = this.height * 0.5;
        const lineChartHeight = this.height * 0.4; // 40% for line chart
        const lineChartY = this.margin.top + this.topChartHeight + 30; // gap

        //----------------------------------
        // 1) TOP CHART (stick figures)
        //----------------------------------
        this.topG = this.svg.append("g")
            .attr("class", "top-chart")
            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

        // A vertical range for the band scale (bottom -> top)
        this.yScaleTop = d3.scaleBand()
            .range([this.topChartHeight, 0])
            .padding(0.3);

        // We'll position stick figures horizontally at centerX
        this.centerX = this.width / 2;

        // A size scale for the stick figure
        const maxDeaths = d3.max(this.data, d => d.deathCount || 0);
        this.sizeScale = d3.scaleLinear()
            .domain([0, maxDeaths])
            .range([10, 50]);

        // Single text message to show the newly added year's info
        this.messageText = this.topG.append("text")
            .attr("class", "year-message")
            .attr("x", this.width * 0.8)
            .attr("y", this.topChartHeight * 0.5)
            .attr("text-anchor", "middle")
            .style("font-size", "15px")
            .style("fill", "black");

        //----------------------------------
        // 2) BOTTOM CHART (line chart)
        //----------------------------------
        this.lineG = this.svg.append("g")
            .attr("class", "line-chart")
            .attr("transform", `translate(${this.margin.left}, ${lineChartY})`);

        // X scale for the entire dataset
        const years = this.data.map(d => d.year);
        this.xScaleLine = d3.scaleLinear()
            .domain([d3.min(years), d3.max(years)])
            .range([0, this.width]);

        // Y scale for the entire dataset
        this.yScaleLine = d3.scaleLinear()
            .domain([0, maxDeaths])
            .range([lineChartHeight, 0]);

        // Axes (optional)
        this.lineG.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${lineChartHeight})`)
            .call(d3.axisBottom(this.xScaleLine).tickFormat(d3.format("d")));

        this.lineG.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(this.yScaleLine));

        // A <g> container for line segments
        this.segmentsG = this.lineG.append("g")
            .attr("class", "line-segments");

        // A line generator for 2-point segments
        this.lineGen = d3.line()
            .x(d => this.xScaleLine(d.year))
            .y(d => this.yScaleLine(d.deathCount));
    }

    /**
     * startFlow()
     *   Begins the step-by-step process of adding data points.
     */
    startFlow() {
        this.flowStep();
    }

    /**
     * flowStep()
     *   - Adds one new data point
     *   - If >5 in stick figure queue, remove oldest
     *   - Draw a new line segment from the last partialData point to the new one
     *   - Update the chart & schedule the next step
     */
    flowStep() {
        if (this.index < this.data.length) {
            const newDatum = this.data[this.index];

            // 1) Update the rolling queue for stick figures
            this.activeData.push(newDatum);
            if (this.activeData.length > 5) {
                this.activeData.shift();
            }

            // 2) Add this point to partialData for the line
            this.partialData.push(newDatum);

            // 3) Update the top chart (stick figures)
            this.updateStickFigures();

            // 4) Update the single text message
            this.updateMessage(newDatum);

            // 5) Draw a new line segment from the previous point to this new one
            if (this.partialData.length > 1) {
                const lastIndex = this.partialData.length - 1;
                const segmentData = [
                    this.partialData[lastIndex - 1],
                    this.partialData[lastIndex]
                ];
                this.drawNewSegment(segmentData);
            }

            // 6) Increment index & schedule next step
            this.index++;
            setTimeout(() => this.flowStep(), 500); // e.g. 1.5s
        }
    }

    /**
     * updateStickFigures()
     *   Standard D3 enter/update/exit for the top chart
     */
    updateStickFigures() {
        // Update band scale domain
        this.yScaleTop.domain(this.activeData.map(d => d.year));

        // Data join
        const persons = this.topG.selectAll(".person")
            .data(this.activeData, d => d.year);

        // EXIT
        persons.exit()
            .transition()
            .duration(500)
            .attr("opacity", 0)
            .remove();

        // ENTER
        const personsEnter = persons.enter()
            .append("g")
            .attr("class", "person")
            .attr("opacity", 0);

        // The stick figure path
        personsEnter.append("path")
            .attr("d", STICK_FIGURE_PATH)
            .attr("stroke", "red")
            .attr("fill", "none")
            .attr("stroke-width", 2);

        // Year label above the head
        personsEnter.append("text")
            .attr("x", 0)
            .attr("y", -40)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text(d => d.year);

        // ENTER + UPDATE
        personsEnter.merge(persons)
            .transition()
            .duration(500)
            .attr("opacity", 1)
            .attr("transform", d => {
                const yPos = this.yScaleTop(d.year);
                // Scale the figure based on deathCount
                const scaleFactor = this.sizeScale(d.deathCount) / 40; // half the original
                return `
                  translate(${this.centerX}, ${yPos})
                  scale(${scaleFactor})
                  rotate(-45)
                `;
            });
    }

    /**
     * updateMessage(newDatum)
     *   - Single line of text about the newly added year
     */
    updateMessage(newDatum) {
        this.messageText
            .text(`Year ${newDatum.year}: ${newDatum.deathCount} people died`);
    }

    /**
     * drawNewSegment(segmentData)
     *   - segmentData is exactly 2 points: [prevDatum, newDatum]
     *   - We create a new path for just this segment and animate its "draw"
     */
    drawNewSegment(segmentData) {
        // 1) Append a new path
        const newPath = this.segmentsG.append("path")
            .attr("class", "line-segment")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", this.lineGen(segmentData));

        // 2) Animate via stroke-dash
        const totalLength = newPath.node().getTotalLength();

        newPath
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
    }
}