/*******************************************
 *               SeasonChart.js            *
 *******************************************/

class SeasonChart {
    /**
     * @param {string} parentId - The ID of the parent DOM element (no "#" prefix).
     * @param {Array} membersData - Array of objects from members.csv
     *                              Each object should have at least:
     *                              { season, success: "TRUE" or "FALSE", ... }
     */
    constructor(parentId, membersData) {
        // 1. Store references to DOM element and data
        this.parentElement = document.getElementById(parentId);
        this.membersData = membersData;

        // 2. Define chart dimensions, margins, etc.
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;

        // 3. Initialize the visualization
        this.initVis();
    }

    initVis() {
        // Create the SVG
        this.svg = d3.select(this.parentElement)
            .append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

        // Prepare data and draw
        this.prepareData();
        this.updateVis();
    }

    /**
     * prepareData() computes:
     * - total attempts (rows) by season
     * - total successes (sum of success)
     * - success rate = (successCount / attempts) * 100
     */
    prepareData() {
        // Convert success to 0 or 1
        this.membersData.forEach(d => {
            d.success = (d.success && d.success.toString().toLowerCase() === "true") ? 1 : 0;
        });

        // Filter valid seasons
        const validSeasons = new Set(["winter", "spring", "summer", "autumn"]);
        this.membersData = this.membersData.filter(d => 
            d.season && validSeasons.has(d.season.toLowerCase())
        );

        // Group by season -> attempts
        const attemptsBySeason = d3.rollup(
            this.membersData,
            arr => arr.length,
            d => d.season
        );

        // Group by season -> sum of success
        const successBySeason = d3.rollup(
            this.membersData,
            arr => d3.sum(arr, d => d.success),
            d => d.season
        );

        // Combine into seasonData
        const allSeasons = Array.from(attemptsBySeason.keys());
        this.seasonData = allSeasons.map(season => {
            const attempts = attemptsBySeason.get(season);
            const successCount = successBySeason.get(season) || 0;
            const successRate = attempts === 0 ? 0 : (successCount / attempts) * 100;
            return { season, successCount, attempts, successRate };
        });

        // Sort seasons if desired
        const seasonOrder = ["Winter", "Spring", "Summer", "Autumn"];
        this.seasonData.sort((a, b) => 
            seasonOrder.indexOf(a.season) - seasonOrder.indexOf(b.season)
        );
    }

    updateVis() {
        if (!this.seasonData || this.seasonData.length === 0) {
            console.warn("No valid season data.");
            return;
        }

        // A. Color scale
        const colorScale = d3.scaleOrdinal()
            .domain(["Winter", "Spring", "Summer", "Autumn"])
            .range(["#1f77b4", "#2ca02c", "#ff7f0e", "#d62728"]);

        // B. X-scale for season centers
        const xScale = d3.scaleBand()
            .domain(this.seasonData.map(d => d.season))
            .range([0, this.width])
            .padding(0.2);

        const centerY = this.height / 2;

        // C. Create groups for each season
        const seasonGroups = this.svg.selectAll(".season-group")
            .data(this.seasonData)
            .join("g")
            .attr("class", "season-group")
            .attr("transform", d => {
                const cx = xScale(d.season) + xScale.bandwidth() / 2;
                return `translate(${cx}, ${centerY})`;
            });

        // D. Dot logic
        seasonGroups.each((d, i, nodes) => {
            const group = d3.select(nodes[i]);
            const { season, successCount, attempts, successRate } = d;

            // Each dot = 10 successes
            const numDots = Math.floor(successCount / 10);
            const maxScatterRadius = 120;
            const fillColor = colorScale(season);

            // Precompute final positions
            const finalPositions = d3.range(numDots).map(() => {
                const angle = 2 * Math.PI * Math.random();
                const radius = maxScatterRadius * Math.sqrt(Math.random());
                return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
            });

            const totalAnimationTime = (numDots - 1) * 50 + 700;

            // Create the dots
            group.selectAll(".dot")
                .data(finalPositions)
                .join("circle")
                .attr("class", "dot")
                .attr("r", 5)
                .attr("fill", fillColor)
                .attr("cx", 0)
                .attr("cy", 0)
                .transition()
                .delay((pos, idx) => idx * 50)
                .duration(700)
                .attr("cx", pos => pos.x)
                .attr("cy", pos => pos.y)
                .ease(d3.easeCubicOut);

            // E. Multi-line label using <tspan>
            //    We'll have 3 lines:
            //    1) Season
            //    2) "X successes / Y attempts"
            //    3) "Z%" for success rate
            //    We'll animate lines 2 and 3 from 0 to final values.
            const label = group.append("text")
                .attr("class", "season-label")
                .attr("text-anchor", "middle")
                .style("fill", fillColor)
                .style("font-size", "14px")
                .style("font-weight", "bold")
                .attr("y", -maxScatterRadius - 50);

            // Line 1: static season name
            const line1 = label.append("tspan")
                .attr("x", 0)
                .attr("dy", 0)    // first line
                .text(season);

            // Line 2: "0 successes / Y attempts" (will animate the successes)
            const line2 = label.append("tspan")
                .attr("x", 0)
                .attr("dy", "1.2em") 
                .text(`0 successes / ${attempts} attempts`);

            // Line 3: "0.0%" (will animate the success rate)
            const line3 = label.append("tspan")
                .attr("x", 0)
                .attr("dy", "1.2em")
                .text(`0.0%`);

            // Animate lines 2 & 3
            label.transition()
                .duration(totalAnimationTime)
                .ease(d3.easeLinear)
                .tween("text", function() {
                    const iSuccess = d3.interpolateNumber(0, successCount);
                    const iRate = d3.interpolateNumber(0, successRate);
                    return function(t) {
                        const currSuccess = Math.floor(iSuccess(t));
                        const currRate = iRate(t).toFixed(1);
                        line2.text(`${currSuccess} / ${attempts} successed`);
                        line3.text(`${currRate}%`);
                    };
                });
        });
    }
}