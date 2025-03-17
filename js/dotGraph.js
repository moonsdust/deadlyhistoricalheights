class DotGraph {
    constructor(parentId, membersData, filterName) {
        /**
         * @param {string} parentId - The ID of the parent DOM element (Doesn't have "#" in it).
         * @param {Array} membersData - Array of objects from members.csv
         * @param {string} filterName - Represents the type of data we should filter for.
         */

        this.parentElement = parentId;
        this.membersData = membersData;
        this.displayData = [];
        this.filterDataOption = filterName;
        
        // Controls sizing and position
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.width = 600 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;

        // Controls the colors 
        this.colors = ["#2166ac", "#c994c7","#d6604d","#f4a582", "#fddbc7", "#d1e5f0","#92c5de","#4393c3","#b2182b"];

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
            .attr("transform", `translate(0, 0)`);

        // Define x scale 
        vis.x = d3.scaleBand()
            .domain(d3.range(10))
            .range([0, vis.width/2])
            .padding(0.05);
        
        // Define y scale
        vis.y = d3.scaleBand()
            .domain(d3.range(10))
            .range([vis.height, 0])
            .padding(0.05);

        // Define scale for colour
        vis.color = d3.scaleOrdinal()
            .range(vis.colors);

        // Initate legend
        vis.legend = vis.svg.append("g")
            .attr('class', 'legend-dot-graph')
            .attr('transform', `translate(${vis.width/1.5}, ${vis.height/1.5})`);
                
        // Create legend axis group 
        vis.legend.append("g")
            .attr("class", "legend-axis axis");  

        // Intialize legend title
        vis.legendTitle = vis.svg.append("text")
            .attr("class", "vis-legend-title-dot-graph")
            .attr("text-anchor", "center")
            .attr("x", (vis.width/1.5))
            .attr("y", (vis.height/5.5))
            .style("font-size", 14)
            .style("font-weight", 600)
            .style("fill", "#525252")
            .text("Group");

        
        // Intialize subtitle
        vis.subtitle = vis.svg.append("text")
            .attr("class", "vis-subtitle-dot-graph")
            .attr("text-anchor", "center")
            .attr("x", (vis.width/1.5))
            .attr("y", (vis.height/4.2))
            .style("font-size", 12)
            .style("fill", "#666666")
            .text("One circle is approximately equal to 1%.");

        // Initalize tooltip
        vis.tooltip = d3.select("body").append('div')
            .attr('class', "tooltip")
            .attr('id', 'dot-graph-tooltip');
        
         
        // Prepare data
        vis.wrangleData();
    }

    wrangleData() {
        /**
         * wrangleData() prepares the data to be used by the visualization
         * 
         * Attributes we will be using: age_group, sex, success, oxygen_used 
         */
        let vis = this;

        // Filter out rows where there is None for the age_group
        vis.displayData = vis.membersData.map(d => ({ ...d })).filter(d => (d.age_group != "None"));
        // Convert to sex to numeric (0 = Female, 1 = Male) and set oxygen_used == TRUE to 1 and 0 others 
        vis.displayData.forEach(d => {
            // Check the sex
            if (d.sex == "M") {
                d.sex = 1;
            }
            else {
                d.sex = 0;
            }
            // Check oxygen_used
            if (d.oxygen_used == "TRUE") {
                d.oxygen_used = 1;
            }
            else {
                d.oxygen_used = 0;
            }
        });

        // Make shallow copy of vis.displayData
        let shallowCopyFilteredData = vis.displayData.map(d => ({ ...d })).map(data => data);

        // User selected the selectedCategoryForDotGraph option 
        // Group by selectedCategoryForDotGraph and get total number of expeditions for each selectedCategoryForDotGraph
        let tempDataCategoryTotal =  d3.rollup(shallowCopyFilteredData, leaves => leaves.length, d => d[selectedCategoryForDotGraph]);
        tempDataCategoryTotal = Array.from(tempDataCategoryTotal, ([key, expedition_peak_per_category]) => ({key, expedition_peak_per_category}));

        // Filter only for data where vis.filterDataOption == 1 
        shallowCopyFilteredData = shallowCopyFilteredData.filter(d => (d[vis.filterDataOption] == 1));
       
        // Group by selectedCategoryForDotGraph and get number of total SUCCESSFUL expeditions for each selectedCategoryForDotGraph 
        let tempDataCategoryTotalSuccess =  d3.rollup(shallowCopyFilteredData, leaves => leaves.length, d => d[selectedCategoryForDotGraph]);
        tempDataCategoryTotalSuccess = Array.from(tempDataCategoryTotalSuccess, ([key, successful_expedition_peak_per_category]) => ({key, successful_expedition_peak_per_category}));

        // Calculate percentages, combine the two calculations we got before, and combine with existing displayData
        vis.displayData.map(function(d) {
            if (selectedCategoryForDotGraph == "age_group") {
                // Add in total number of expeditions per selectedCategoryForDotGraph
                d.expedition_peak_per_age_group = tempDataCategoryTotal.filter(data => (data["key"] == d[selectedCategoryForDotGraph]))[0]["expedition_peak_per_category"];

                // Add in successful_expedition_peak_per_age_group key-value pair 
                d.successful_expedition_peak_per_age_group = 0;
                if (tempDataCategoryTotalSuccess.filter(data => (data["key"] == d[selectedCategoryForDotGraph])).length != 0) {
                    d.successful_expedition_peak_per_age_group = tempDataCategoryTotalSuccess.filter(data => (data["key"] == d[selectedCategoryForDotGraph]))[0]["successful_expedition_peak_per_category"];
                }

                // Compute the success rate per age_group 
                // Round to two decimal places 
                d.success_rate_per_age_group = 0;
                if (d.expedition_peak_per_age_group > 0) {
                    d.success_rate_per_age_group = parseFloat(((d.successful_expedition_peak_per_age_group / d.expedition_peak_per_age_group) * 100).toFixed(2));
                }
                // Add in success proportion by selectedCategoryForDotGraph 
                d.success_proportion = 0;

                let totalExpeditionsSuccessful = 0;
                for (let i = 0; i < tempDataCategoryTotalSuccess.length; i++) {
                    totalExpeditionsSuccessful += tempDataCategoryTotalSuccess[i].successful_expedition_peak_per_category;
                }
                if (totalExpeditionsSuccessful > 0) {
                    d.success_proportion = +((d.successful_expedition_peak_per_age_group / totalExpeditionsSuccessful) * 100).toFixed(2);
                }

            }
            else {
                // Add in total number of expeditions per selectedCategoryForDotGraph
                d.expedition_peak_per_sex = tempDataCategoryTotal.filter(data => (data["key"] == d[selectedCategoryForDotGraph]))[0]["expedition_peak_per_category"];

                // Add in successful_expedition_peak_per_sex key-value pair 
                d.successful_expedition_peak_per_sex = 0;
                if (tempDataCategoryTotalSuccess.filter(data => (data["key"] == d[selectedCategoryForDotGraph])).length != 0) {
                    d.successful_expedition_peak_per_sex = tempDataCategoryTotalSuccess.filter(data => (data["key"] == d[selectedCategoryForDotGraph]))[0]["successful_expedition_peak_per_category"];
                }
                
                // Compute the success rate per sex
                // Round to two decimal places 
                d.success_rate_per_sex = 0;
                if (d.expedition_peak_per_sex > 0) {
                    d.success_rate_per_sex = parseFloat(((d.successful_expedition_peak_per_sex / d.expedition_peak_per_sex) * 100).toFixed(2));
                }
                // Add in success proportion by selectedCategoryForDotGraph 
                d.success_proportion = 0;

                let totalExpeditionsSuccessful = 0;
                for (let i = 0; i < tempDataCategoryTotalSuccess.length; i++) {
                    totalExpeditionsSuccessful += tempDataCategoryTotalSuccess[i].successful_expedition_peak_per_category;
                }
                if (totalExpeditionsSuccessful > 0) {
                    d.success_proportion = +((d.successful_expedition_peak_per_sex / totalExpeditionsSuccessful) * 100).toFixed(2);
                }
            }

        });
        // Filter out data more so it only contain unique selectedCategoryForDotGraph 
        vis.displayData = Array.from(new Map(vis.displayData.map(item => [item[selectedCategoryForDotGraph], item])).values());
        
        // Set domain for color legend
        vis.color.domain(vis.displayData.map(d => d[selectedCategoryForDotGraph]));

        // Choose relevant attributes to visual and add color
        let expandedData = [];
        vis.displayData.forEach(d => {
            for (let i = 0; i < Math.round(d.success_proportion); i++) {
                expandedData.push({
                    category: d[selectedCategoryForDotGraph], 
                    success_proportion: d.success_proportion,
                    [`success_rate_per_${selectedCategoryForDotGraph}`]: d[`success_rate_per_${selectedCategoryForDotGraph}`],
                    fillcolor: vis.color(d[selectedCategoryForDotGraph]) 
                });
            }
        });

        // Adding in missing category for age_group
        if (selectedCategoryForDotGraph == "age_group" && vis.filterDataOption == "oxygen_used") {
            expandedData.push({
                category: "Other", 
                success_proportion: 0.25,
                [`success_rate_per_${selectedCategoryForDotGraph}`]: "0",
                fillcolor: "white"
            });
        };

        vis.displayData = expandedData;

        vis.displayData = vis.displayData.sort((a, b) => String(a["category"]).localeCompare(String(b["category"])));

        // console.log(vis.displayData)

        // Update visualization
        vis.updateVis();
    }

    helperFunctionConversion(d) {
        if (selectedCategoryForDotGraph == "sex") {
            if (d.category == 1) {
                return "Male";
            }
            else {
                return "Female";
            }
        }
        return d.category + " years old";
    }
    updateVis() {
        let vis = this;

        // Select all circles in the dot graph
        vis.circles = vis.svg.selectAll(".dot-graph circle")
            .data(vis.displayData);
        
        // Create new circles if needed 
        vis.circles.enter().append("circle")
            .merge(vis.circles)
            .attr("cx", (d, i) => vis.x(i % 10) + vis.margin.left)
            .attr("cy", (d, i) => vis.y(Math.floor(i / 10)) + vis.margin.top)
            .attr("r", 8)
            .attr('stroke-width', '2px')
            .attr('stroke', 'white')
            .attr("fill", d => d.fillcolor) 
            .attr("class", "dot-graph");
        
        // Remove extra circles 
        vis.circles.exit().remove();

        let sorted_color_domain = vis.color.domain().slice().sort((a, b) => String(a).localeCompare(String(b)));


        // Creating a legend 
        vis.circleLegend = vis.legend.selectAll(".dot-graph-legend")
            .data(sorted_color_domain);

        // Create new rectangles if needed 
        vis.circleLegend.enter().append("circle")
            // Enter and update
            .merge(vis.circleLegend)
            // Position and Style
            .attr("class", "dot-graph-legend") 
            .attr("cx", vis.margin.left)
            .attr("cy", (d,i) => vis.margin.top + (i*25) - 150)
            .attr("r", 8)
            .style("fill", (d, i) => {
                if (vis.displayData.filter(data => (data.category == d)).length != 0) {
                    return vis.displayData.filter(data => (data.category == d))[0].fillcolor;
                }
                else {
                    return "rgba(255, 255, 255, 0)";
                }
            }
            );
        // Remove any extra circles in legend that don't have data attached to them
        vis.circleLegend.exit().remove();
        
        vis.circleLegendText = vis.legend.selectAll(".dot-graph-legend-text")
            .data(sorted_color_domain);

        vis.circleLegendText.enter().append("text")
            .merge(vis.circleLegendText)
            .attr("class", "dot-graph-legend-text") 
            .attr("x", 40) 
            .attr("y", (d,i) => vis.margin.top + (i*25) - 145)
            .style("font-size", "14px")
            .style("fill", "#666666")
            .text(d => {
                if (vis.displayData.filter(data => (data.category == d)).length != 0) {
                    if (selectedCategoryForDotGraph == "sex") {
                        if (d == 1) {
                            return "Male";
                        }
                        else {
                            return "Female";
                        }
                    }
                    return d;
                }
            });
        
        // Remove any extra text that don't have data attached to them
       vis.circleLegendText.exit().remove();

       vis.circles = vis.svg.selectAll(".dot-graph");

        // Add event listener to each circle
        vis.circles.on('mousemove', function(event, d){
            // Changes the stroke and fill of the bar that is hovered over
            d3.select(this) // This is now referring to the actual circle that is hovered over 
                .attr('stroke-width', '4px')
            // Display info when country is hovered over
            vis.tooltip
                .style("opacity", 1)
                .style("left", event.pageX + 20 + "px")
                .style("top", event.pageY + "px")
                .html(`
                    <div style="color: white; border: thin solid grey; border-radius: 5px; background: #1D1D1D; padding: 20px">
                        <h5>${vis.helperFunctionConversion(d)}</h5>
                        ${vis.filterDataOption === "oxygen_used" ? 
                            `<p>Oxygen use rate for ${vis.helperFunctionConversion(d)}: <strong style="color: #90D5FF;">${d[`success_rate_per_${selectedCategoryForDotGraph}`]}%</strong></p>` : 
                            vis.filterDataOption === "success" ? 
                            `<p>Success rate for ${vis.helperFunctionConversion(d)}: <strong style="color: #90D5FF;">${d[`success_rate_per_${selectedCategoryForDotGraph}`]}%</strong></p>`: 
                            ""}
                        ${vis.filterDataOption === "oxygen_used" ? 
                            `<p>Proportion of oxygen used: <strong style = "color: #90D5FF;">${d.success_proportion}%</strong></p>` : 
                            vis.filterDataOption === "success" ? 
                            ` <p>Proportion of total successes: <strong style = "color: #90D5FF;">${d.success_proportion}%</strong></p>`: 
                            ""}
                                
                    </div>`);

            })
            .on('mouseout', function(event, d){
                // Resets everything
                d3.select(this)
                    .attr('stroke-width', '2px')
                vis.tooltip
                    .style("opacity", 0)
                    .style("left", 0)
                    .style("top", 0)
                    .html(``);
            });
}
}
