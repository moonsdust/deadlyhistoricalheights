/*******************************************
 *               deathRateChart.js        *
 *******************************************/

class DeathRateChart {
    /**
     * @param {string} parentId - The ID of the parent DOM element (no "#" prefix).
     * @param {Array} membersData - Array of objects from members.csv
     *                              Each object should have at least:
     *                              { died: "TRUE" or "FALSE", ... }
     * @param {Array} displayData - Array containing mountain peaks with the highest 
     *                              and lowest rates of deaths and their own arrays 
     */
    constructor(parentId, membersData) {
        this.parentElement = document.getElementById(parentId);
        this.membersData = membersData;
        this.displayData = membersData;

        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;

        this.innerRadius = 90;
        this.outerRadius = Math.min(this.width, this.height) / 2;

        // Initialize the visualization
        this.initVis();
    }

    initVis() {
        let vis = this;
        // Initalize drawing space 
        vis.svg = d3.select(vis.parentElement).append("svg")
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
        // Y-scale for inner bar 
        vis.yInner= d3.scaleRadial()
            .range([vis.innerRadius, 5]);

        // Initalize tooltip
        

        // Prepare data and then update visualization
        vis.wrangleData();
        vis.updateVis();
    }

    /**
     * wrangleData() prepares the data to be used by the visualization
     */
    wrangleData() {
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

        // Define y scale's domain (NEED TO CHECK IF I NEED TO DEFINE THE DOMAIN BEFORE OR WHILE CREATING THE BINS)
        // The domain is 0 to the max of death_count_peak
        vis.yOuter.domain([0, d3.max(vis.displayData, d=> d.death_count_peak)]);
        // The domain is 0 to the max of alive_count_peak
        vis.yInner.domain([0, d3.max(vis.displayData, d=> d.alive_count_peak)]);

        // Draw the bars - outer 
        // Arc path generator 
        vis.arcOuter = d3.arc()     
            .innerRadius(vis.innerRadius)
            .outerRadius(d => vis.yOuter(d.death_count_peak))
            .startAngle(d => vis.x(d.peak_name))
            .endAngle(d => vis.x(d.peak_name) + vis.x.bandwidth())
            .padAngle(0.01)
            .padRadius(vis.innerRadius);

        // 1. Pass in data 
        // Select all paths in the circular barplot
        vis.outsideBars = vis.svg.selectAll("path")
            .data(vis.displayData)
            .attr("class", "circular-barplot-outer");
            
        // 2. Create new paths for the data 
        vis.outsideBars.enter().append("path")
            // 3. Enter and update 
            .merge(vis.outsideBars)
            // Position and style 
            .attr("fill", "#69b3a2")
            .attr("class", "outside-bars")
            .attr("d", vis.arcOuter);

      	// 4. Remove any extra paths that don't have data attached to them
        vis.outsideBars.exit().remove();



        




       // Update tooltip
       // Reference: https://jsdatav.is/chap07.html#creating-a-unique-visualization
       // Info it contains: 
       // - Peak Name 
       // - Highest height reached by member 
       // - Death percentage + Death ratio
       // - Alive percentage + Alive ratio 
    }
}