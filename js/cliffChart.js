class CliffChart {
    /**
     * @param {Array} membersData - e.g. [{ year: 1900, died: "TRUE" }, ... ]
     *   Each object needs { year: Number, died: Boolean/String }.
     */
    constructor(membersData) {
        this.data = this.prepareData(membersData);
        this.data.sort((a, b) => d3.ascending(a.year, b.year));

        this.margin = { top: 20, right: 20, bottom: 20, left: 40 };
        this.width = 600 - this.margin.left - this.margin.right;
        this.height = 600 - this.margin.top - this.margin.bottom;

        this.partialData = [];
        this.index = 0;

        this.initVis();
    }

    prepareData(membersData) {
        const cleanedRows = membersData.map(d => {
            return {
                year: +d.year,
                died: (d.died && d.died.toUpperCase() === "TRUE") ? 1 : 0
            };
        });

        const deathsByYear = d3.rollup(
            cleanedRows,
            rows => d3.sum(rows, r => r.died),
            d => d.year
        );

        let result = [];
        for (let [year, totalDeaths] of deathsByYear) {
            if (!isNaN(year) && year > 0) {
                result.push({ year, deathCount: totalDeaths });
            }
        }

        result.sort((a, b) => d3.ascending(a.year, b.year));

        return result;
    }

    initVis() {
        this.svg = d3.select("#myCliffSvg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom);

        this.svg.append("defs")
            .append("filter")
            .attr("id", "blurFilter")
            .append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", 1);

        const scatterChartHeight = this.height * 0.8;
        this.scatterChartHeight = scatterChartHeight;
        const scatterChartY = this.margin.top;

        this.scatterG = this.svg.append("g")
            .attr("class", "scatter-chart")
            .attr("transform", `translate(${this.margin.left}, ${scatterChartY})`);

        const years = this.data.map(d => d.year);
        this.xScaleScatter = d3.scaleLinear()
            .domain([d3.min(years), d3.max(years)])
            .range([0, this.width]);

        const maxDeaths = d3.max(this.data, d => d.deathCount || 0);
        this.yScaleScatter = d3.scaleLinear()
            .domain([0, maxDeaths])
            .range([scatterChartHeight, 0]);

        this.scatterG.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${scatterChartHeight})`)
            .call(d3.axisBottom(this.xScaleScatter).tickFormat(d3.format("d")));

        this.scatterG.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(this.yScaleScatter));

        this.scatterG.append("text")
            .attr("class", "x-axis-label")
            .attr("text-anchor", "middle")
            .attr("x", this.width / 2)
            .attr("y", scatterChartHeight + this.margin.bottom + 10)
            .text("Year");

        this.scatterG.append("text")
            .attr("class", "y-axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -scatterChartHeight / 2)
            .attr("y", -this.margin.left + 15)
            .text("Death Count");
        
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

    flowStep() {
        if (this.index < this.data.length) {
            const newDatum = this.data[this.index];

            this.partialData.push(newDatum);

            this.updateScatterPlot();

            this.index++;
            setTimeout(() => this.flowStep(), 200);
        }
    }


    updateScatterPlot() {
        const dots = this.scatterG.selectAll(".dot")
            .data(this.partialData, d => d.year);

        const dotsEnter = dots.enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => this.xScaleScatter(d.year))
            .attr("cy", -20) 
            .attr("r", 4) 
            .attr("fill", "white");

        dotsEnter.transition()
            .duration(100)
            .attr("cy", d => this.yScaleScatter(d.deathCount));
    }
}