class DeathRateChart {
    constructor(parentId, membersData) {
        /**
         * @param {string} parentId - The ID of the parent DOM element (Doesn't have "#" in it).
         * @param {Array} membersData - Array of objects from members.csv
         */
        this.parentElement = parentId;
        this.membersData = membersData;
        this.displayData = membersData;
        
        // Controls sizing and position
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 1000 - this.margin.top - this.margin.bottom;

        // For the arcs/bars/circular barplot specifically
        this.innerRadius = 90;
        this.outerRadius = Math.min(this.width, this.height) / 2;

        // Controls the colors 
        this.aliveColor = "#2660A4";
        this.deathColor = "#D7263D";

        // Initialize the visualization
        this.initVis();
    }

    initVis() {
        let vis = this;
        // Initalize drawing space 
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${(vis.width + vis.margin.left) / 2}, ${(vis.height + vis.margin.top)/ 2})`);

        // Define x scale 
        vis.x = d3.scaleBand()
            .range([0, 2 * Math.PI]);
        
        vis.svg.append("g")
            .attr("class", "y-axis axis");

        // Define y scales
        // Y-scale for outer bar 
        vis.yOuter= d3.scaleRadial()
            .range([vis.innerRadius, vis.outerRadius]);
        // // Y-scale for inner bar 
        // vis.yInner= d3.scaleRadial()
        //     .range([vis.innerRadius, 5]);

        // Initalize legend 
        vis.legend = vis.svg.append("g")
            .attr("class", "legend-circular-barplot");

        // Intialize legend text 
		vis.legendText = vis.legend.selectAll(".legend-circular-barplot text");

        // Initalize tooltip
        vis.tooltip = d3.select("body").append('div')
            .attr('class', "tooltip")
            .attr('id', 'circular-barplot-tooltip');

        // Prepare data and then update visualization
        vis.wrangleData();
        vis.updateVis();
    }

    wrangleData() {
        /**
         * wrangleData() prepares the data to be used by the visualization
         */
        let vis = this;

        // Filter out rows where there is NaN from highpoint_metres (Highest height reached by climbers), peak_name, and died 
        vis.displayData = vis.membersData.filter(d => ((!isNaN(d.highpoint_metres) || !isNaN(d.peak_name)) || !isNaN(d.died)));

        // Convert to highpoint_metres to numeric and set died == TRUE to 1 and 0 others 
        vis.displayData.forEach(d => {
            d.highpoint_metres = +d.highpoint_metres;
            if (d.died == "TRUE") {
                d.died = 1;
            }
            else {
                d.died = 0;
            }
        });

        // Group by peak_name and get number of expeditions for that peak
        let tempDataExpeditionCount = d3.rollup(vis.displayData, leaves => leaves.length, d => d["peak_name"]);
        tempDataExpeditionCount = Array.from(tempDataExpeditionCount, ([peak_name, expedition_count_peak]) => ({peak_name, expedition_count_peak}));

        // Make shallow copy of vis.displayData
        let shallowCopyFilteredData = vis.displayData.map(data => data);
        // Filter only for data where died == 1 (TRUE)
        shallowCopyFilteredData = shallowCopyFilteredData.filter(d => (d["died"] == 1));
        // Group by peak_name and get number of died == 1 (TRUE) for that peak
        let tempDataDeathCount = d3.rollup(shallowCopyFilteredData, leaves => leaves.length, d => d["peak_name"]);
        tempDataDeathCount = Array.from(tempDataDeathCount, ([peak_name, expedition_death_peak]) => ({peak_name, expedition_death_peak}));

        // Combine all data together with the existing displayData  
        vis.displayData.map(function(d) {
            // Add in number of expeditions (expedition_count_peak)
            d.expedition_count_peak = tempDataExpeditionCount.filter(data => (data["peak_name"] == d.peak_name))[0]["expedition_count_peak"];
            // Add in death_count_peak key-value pair 
            d.death_count_peak = 0;
            if (tempDataDeathCount.filter(data => (data["peak_name"] == d.peak_name))[0] != undefined) {
                d.death_count_peak = (tempDataDeathCount.filter(data => (data["peak_name"] == d.peak_name))[0])["expedition_death_peak"] || 0;
            }
            // compute the death rate (Death count for that Peak / Expedition Count for that Peak) * 100
            // Round to two decimal places 
            d.death_rate = 0;
            if (d.expedition_count_peak > 0) {
                d.death_rate = parseFloat(((d.death_count_peak / d.expedition_count_peak) * 100).toFixed(2));
            }
            // Add in alive_count_peak 
            d.alive_count_peak = d.expedition_count_peak - d.death_count_peak;
            // Compute alive rate 
            d.alive_rate = 0;
            if (d.expedition_count_peak > 0) {
                d.alive_rate = parseFloat(((d.alive_count_peak / d.expedition_count_peak) * 100).toFixed(2));
            }
        });

        // Filter out data more so it only contain unique peak_name 
        vis.displayData = Array.from(new Map(vis.displayData.map(item => [item.peak_name, item])).values());
        
        // Sort in descending order by death count and then store in display array 
        vis.displayData.sort((peak1, peak2) => peak2.death_count_peak - peak1.death_count_peak);

        // Get only the top 20 peaks 
        vis.displayData = vis.displayData.slice(0, 20);

    }
    updateVis() {
        let vis = this;
        // Visualization is a circular barplot
        // Length of the bars on the outside = death_count_peak (Would be in red)
        // Length of the bars on the inside = alive_count_peak number of expeditions where members survived  
        
        // Referenced: https://d3-graph-gallery.com/graph/circular_barplot_double.html

        // Define x scale's domain 
        vis.x.domain(vis.displayData.map(d => d.peak_name)); // The domain is the name of the peaks

        // Define y scale's domain
        // The domain is 0 to the max of death_count_peak
        vis.yOuter.domain([0, d3.max(vis.displayData, d=> d.death_count_peak)]);
        // // The domain is 0 to the max of alive_count_peak
        // vis.yInner.domain([0, d3.max(vis.displayData, d=> d.alive_count_peak)]);

        // Draw the bars - outer 
        // Arc path generator 
        vis.arcOuter = d3.arc()     
            .innerRadius(vis.innerRadius)
            .outerRadius(d => vis.yOuter(d.death_count_peak))
            .startAngle(d => vis.x(d.peak_name))
            .endAngle(d => vis.x(d.peak_name) + vis.x.bandwidth())
            .padRadius(vis.innerRadius)
            .padAngle(0.01);

        // 1. Pass in data 
        // Select all paths in the circular barplot
        vis.outsideBars = vis.svg.selectAll(".circular-barplot-outer path")
            .data(vis.displayData);
        
        // 2. Create new paths for the data 
        vis.outsideBars.enter().append("path")
            // 3. Enter and update
            .merge(vis.outsideBars)
            // Position and style 
            .attr("fill", vis.deathColor)
            .attr("class", "circular-barplot-outer")
            .attr("d", vis.arcOuter);

      	// 4. Remove any extra paths that don't have data attached to them
        vis.outsideBars.exit().remove();

        // Update tooltip
        // Reference: https://jsdatav.is/chap07.html#creating-a-unique-visualization
        // Info it contains: 
        // - Peak Name 
        // - Highest height reached by member 
        // - Death percentage + Death ratio
        // Reselect outside bars  
        vis.outsideBars = vis.svg.selectAll(".circular-barplot-outer");

        // Add event listener to each outside bar
        vis.outsideBars.on('mousemove', function(event, d){
            // Changes the stroke and fill of the bar that is hovered over
            d3.select(this) // This is now referring to the actual country that is hovered over 
                .attr('stroke-width', '4px')
                .attr('stroke', 'white')
                .attr('fill', '#b17485')
            // Display info when country is hovered over
            vis.tooltip
                .style("opacity", 1)
                .style("left", event.pageX + 20 + "px")
                .style("top", event.pageY + "px")
                .html(`
                    <div style="color: white; border: thin solid grey; border-radius: 5px; background: #1D1D1D; padding: 20px">
                        <h5>${d.peak_name}</h5>
                        <p>Death Proportion (Death count / Total expeditions): <strong style = "color: #FF474D;">${d.death_count_peak} / ${d.expedition_count_peak}</strong> (${d.death_rate}%)</p> 
                        <p>Highest height reached: <strong style = "color: #90D5FF;">${d.highpoint_metres} m</strong></p>              
                    </div>`);

            })
            .on('mouseout', function(event, d){
                // Resets everything
                d3.select(this)
                    .attr('stroke-width', '0px')
                    .attr("fill", d => {
                        return vis.deathColor;
                    })

                vis.tooltip
                    .style("opacity", 0)
                    .style("left", 0)
                    .style("top", 0)
                    .html(``);
            });


        // Draw the bars - Inner 
        // Arc path generator 
        vis.arcInner = d3.arc()
            .innerRadius(d => vis.yInner(0))
            .outerRadius(d => vis.yInner(d.alive_count_peak))
            .startAngle(d => vis.x(d.peak_name))
            .endAngle(d => vis.x(d.peak_name) + vis.x.bandwidth())
            .padRadius(vis.innerRadius)
            .padAngle(0.01);

        // // 1. Pass in data 
        // // Select all paths in the circular barplot
        // vis.insideBars = vis.svg.selectAll("circular-barplot-inner path")
        //     .data(vis.displayData);
            
        // // 2. Create new paths for the data 
        // vis.insideBars.enter().append("path")
        //     // 3. Enter and update 
        //     .merge(vis.insideBars)
        //     // Position and style 
        //     .attr("fill", vis.aliveColor)
        //     .attr("class", "circular-barplot-inner")
        //     .attr("d", vis.arcInner);

      	// // 4. Remove any extra paths that don't have data attached to them
        // vis.insideBars.exit().remove();

        // Add labels 
        // Code from: https://d3-graph-gallery.com/graph/circular_barplot_double.html
		// and labels for each bar
		let labelsForBars = vis.svg.selectAll(".bar-label")
			.data(vis.displayData);
        
        labelsForBars.enter().append("text")
            .attr("class", "bar-label")
            .merge(labelsForBars)
            .transition()
            .duration(500)
            .attr("text-anchor", d => (vis.x(d.peak_name) + vis.x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start")
            .attr("transform", d => {
                let angle = (vis.x(d.peak_name) + vis.x.bandwidth() / 2) * 180 / Math.PI - 90;
                // Figure out if the text should be rotated upside down
                let flipRotation = ((vis.x(d.peak_name) + vis.x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI) ? 180 : 0;
                let finalAngle = angle + flipRotation;
                let radius = vis.yOuter(d.death_count_peak) + 20;
                return `translate(${Math.cos(angle * Math.PI / 180) * radius}, ${Math.sin(angle * Math.PI / 180) * radius}) rotate(${finalAngle})`;
            })
            .style("font-size", "16px")
            .text(d => d.peak_name);

		// Remove extra labels that don't have data attached to them
		labelsForBars.exit().remove();

        // LEGEND 
        // Create rectangles in legend 
        let rectangles = vis.legend.selectAll(".legend-circular-barplot rect")
            .data([{death: true}]);

        // Create new rectangles for the data elements without a rectangle 
		rectangles.enter().append("rect")
            // 3. Enter and update 
            .merge(rectangles)
            .transition()
            // 4. Position and Style
            .attr("class", "bar") // Set class to be bar so they inherit the styles that's already set
            .attr("x", vis.width / 6) 
            .attr("y", (d, i) => (i * 50) + 290)
            .attr("height", 50) // Makes it so that all bars are even in width across chart 
            .attr("width", 50)
            .style("fill", d => {
                if (!d.death) {
                    // Death is false, return color set for vis.aliveColor
                    return vis.aliveColor;
                }
                return vis.deathColor;
            });

        // 4. Remove any extra rectangles that don't have data attached to them
        rectangles.exit().remove();

        let labelLegend = vis.legendText.data([{death: true}]);

        // Add in text for legend 
        labelLegend.enter().append("text")
            .attr("class", "legend-text-circular-barplot")
            .merge(labelLegend)
            .transition()
            .duration(500)
            .attr("x", vis.width / 4) 
            .attr("y", (d, i) => (i * 50) + 320)
            .style("font-size", "12px")
            .text(d => {
                if (d.death) {
                    return "Number of climbers who have died";
                }
                return "Number of climbers who have survived"
            });
    }
}