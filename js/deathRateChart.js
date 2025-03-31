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
        this.colors = ["#a6bddb", "#74a9cf", "#3690c0","#0570b0","#045a8d","#023858"];

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

        // Intialize title 
		vis.title = vis.svg.append("text")
            .attr("class", "vis-title-circular-barplot")
            .attr("text-anchor", "center")
            .attr("x", -(vis.width/2.8))
            .attr("y", vis.height / 3)
            .style("font-size", 18)
            .style("font-weight", 600)
            .style("fill", "#525252")
            // .style("text-decoration","underline")
            .text("Top 17 Mountain Peaks in the Himalayas with the Highest Death Rates");
        
        // Intialize subtitle
        vis.subtitle = vis.svg.append("text")
            .attr("class", "vis-subtitle-circular-barplot")
            .attr("text-anchor", "center")
            .attr("x", -(vis.width/2.5))
            .attr("y", vis.height / 3 + vis.margin.top + vis.margin.bottom)
            .style("font-size", 14)
            .style("fill", "#666666")
            .text("Length of arc depicts the death rate of each mountain peak. Peaks have greater than 190 total expeditions.");
        
        // Initalize tooltip
        vis.tooltip = d3.select("body").append('div')
            .attr('class', "tooltip")
            .attr('id', 'circular-barplot-tooltip');

        // Define scale for colour
        vis.color = d3.scaleQuantize()
            .range(vis.colors);

        // Define legend scale
        vis.legendScale = d3.scaleSequential()
            .range([0, 150]);

        // Initate legend
        vis.legend = vis.svg.append("g")
            .attr('class', 'legend')
            .attr('transform', `translate(-${vis.width/2.3}, -${vis.height/2.6})`);
                
        // Create legend axis group 
        vis.legend.append("g")
            .attr("class", "legend-axis axis");  

        // Intialize legend title
        vis.legendTitle = vis.svg.append("text")
            .attr("class", "vis-legend-title-circular-barplot")
            .attr("text-anchor", "center")
            .attr("x", -(vis.width/2.3))
            .attr("y", -(vis.height/2.3))
            .style("font-size", 14)
            .style("fill", "#666666")
            .text("Death Rate (Death count / total expeditions)");

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
        vis.displayData.sort((peak1, peak2) => peak2.death_rate - peak1.death_rate);

        // Filter only for peaks with more than 190 expeditions
        vis.displayData = vis.displayData.filter((data => (data["expedition_count_peak"] > 190)))

        // Get only the top 17 peaks 
        vis.displayData = vis.displayData.slice(0, 17);

        // Set up object to store mountain peak info and color  
        vis.mountainInfoColor = {};

    }
    updateVis() {
        let vis = this;
        // Visualization is a circular barplot
        // Length of the bars on the outside = death_rate (Would be in red)        
        // Referenced: https://d3-graph-gallery.com/graph/circular_barplot_double.html

        // Define x scale's domain 
        vis.x.domain(vis.displayData.map(d => d.peak_name)); // The domain is the name of the peaks

        // Define y scale's domain
        // The domain is 0 to the max of death_rate
        vis.yOuter.domain([0, d3.max(vis.displayData, d=> d.death_rate)]);

        // Update domain for colour
        vis.color.domain([(d3.min(vis.displayData, d => d.death_rate)), 
        d3.max(vis.displayData, d => d.death_rate)]);
        
        // Draw the bars - outer 
        // Arc path generator 
        vis.arcOuter = d3.arc()     
            .innerRadius(vis.innerRadius)
            .outerRadius(d => vis.yOuter(d.death_rate))
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
            .attr("fill", d => {
                for (let i = 0; i < vis.displayData.length; i++) {
                    if (vis.displayData[i].peak_name == d.peak_name) {
                        // Assign colour to peak
                        vis.displayData[i].color = vis.color(vis.displayData[i].death_rate);
                        // Store mountain info and colour
                        vis.mountainInfoColor[vis.displayData[i].peak_name] = vis.displayData[i]; 
                        return vis.displayData[i].color;
                    }
                }
            }
            )
            .attr("class", "circular-barplot-outer")
            .attr("d", vis.arcOuter);

      	// 4. Remove any extra paths that don't have data attached to them
        vis.outsideBars.exit().remove();

        // Update tooltip
        // Info it contains: 
        // - Peak Name 
        // - Highest height reached by member 
        // - Death percentage + Death ratio
        // Reselect outside bars  
        vis.outsideBars = vis.svg.selectAll(".circular-barplot-outer");

        // Add event listener to each outside bar
        vis.outsideBars.on('mousemove', function(event, d){
            // Change the opacity of all bars
            vis.outsideBars.style("opacity", 0.2)
            // Changes the stroke and fill of the bar that is hovered over
            d3.select(this) // This is now referring to the actual bar that is hovered over 
                .attr('stroke-width', '4px')
                .attr('stroke', 'white')
                .attr('fill', '#b17485')
                .style("opacity", 1)
            // Display info when bar is hovered over
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
                // Change the opacity of all bars back to 1
                vis.outsideBars.style("opacity", 1)
                // Resets everything
                d3.select(this)
                    .attr('stroke-width', '0px')
                    .attr("fill", d => {
                        return vis.mountainInfoColor[d.peak_name].color;
                    })

                vis.tooltip
                    .style("opacity", 0)
                    .style("left", 0)
                    .style("top", 0)
                    .html(``);
            });

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
            .attr("fill", "#525252")
            .attr("text-anchor", d => (vis.x(d.peak_name) + vis.x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI ? "end" : "start")
            .attr("transform", d => {
                        let angle = (vis.x(d.peak_name) + vis.x.bandwidth() / 2) * 180 / Math.PI - 90;
                        // Figure out if the text should be rotated upside down
                        let flipRotation = ((vis.x(d.peak_name) + vis.x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) < Math.PI) ? 180 : 0;
                        let finalAngle = angle + flipRotation;
                        let radius = vis.yOuter(d.death_rate) + 20;
                        return `translate(${Math.cos(angle * Math.PI / 180) * radius}, ${Math.sin(angle * Math.PI / 180) * radius}) rotate(${finalAngle})`;
                    })
                    .style("font-size", "16px")
                    .text(d => d.peak_name);

        // Remove extra labels that don't have data attached to them
        labelsForBars.exit().remove();

        // Define domain of legend 
        vis.legendScale.domain([0.4, d3.max(vis.displayData, d => d.death_rate)]);

        // Create legend axis 
        vis.legendAxis = d3.axisBottom()
            .scale(vis.legendScale)
            .tickValues([d3.min(vis.displayData, d => d.death_rate), d3.max(vis.displayData, d => d.death_rate)]);
    
        // Call the legend axis inside the legend axis group
        // Update the legend 
        vis.legend.select(".legend-axis").call(vis.legendAxis);
        
        // Creating a legend 
        let rectLegend = vis.legend
            .selectAll("rect")
            .data(vis.colors);

        // Create new rectangles if needed 
        rectLegend.enter().append("rect")
                // Enter and update
            .merge(rectLegend)
            // Position and Style
            .attr("class", "bar") 
            .attr("x", (d, i) => 0 + (i*25))
            .attr("y", -(vis.margin.top + 10))
            .attr("height", 30) 
            .attr("width", 25)
            .style("fill", (d, i) => {return vis.colors[i];});

        // Remove any extra rectangles that don't have data attached to them
        rectLegend.exit().remove();
    }
}
