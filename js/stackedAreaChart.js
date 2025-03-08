
class StackedAreaChart {
    /**
     * @param {string} parentElement - The ID of the parent DOM element (no "#" prefix).
     * @param {Array} data - Array of objects for (year, count for each casue of death in year)
     */
    // constructor method to initialize StackedAreaChart object
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.displayData = [];
        this.filter = "";
    
        let colors = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a', '#6b4c9a', '#ffcc33'];
    
        // grab all the keys from the key value pairs in data (filter out 'year' ) to get a list of categories
        this.dataCategories = Object.keys(this.data[0]).filter(d=>d !== "Year")
    
        // prepare colors for range
        let colorArray = this.dataCategories.map((d,i) => {
            return colors[i % colors.length]
        })
    
        // Set ordinal color scale
        this.colorScale = d3.scaleOrdinal()
            .domain(this.dataCategories)
            .range(colorArray);

        this.initVis();
    }
    
    
    /*
    * Method that initializes the visualization (static content, e.g. SVG area or axes)
    */
    initVis(){
        let vis = this;

        this.margin = { top: 20, right: 20, bottom: 20, left: 30 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;

        // SVG drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // Overlay with path clipping
        vis.svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", vis.width)
        .attr("height", vis.height);

        vis.chartArea = vis.svg.append("g")
        .attr("class", "chart-area")
        .attr("clip-path", "url(#clip)");

        // Scales and axes
        vis.x = d3.scaleTime()
            .range([0, vis.width])
            .domain(d3.extent(vis.data, d=> d.Year));

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);


        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);

        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", "translate(0," + vis.height + ")");

        vis.svg.append("g")
            .attr("class", "y-axis axis");

        let stack = d3.stack()
                    .keys(vis.dataCategories);

        vis.stackedData = stack(vis.data);

        vis.area = d3.area()
                    .curve(d3.curveCatmullRom)
                    .x(d => vis.x(d.data.Year))
                    .y0(d => vis.y(d[0]))
                    .y1(d => vis.y(d[1]));

        vis.indivArea = d3.area()
                    .curve(d3.curveCatmullRom)
                    .x(d => vis.x(d.data.Year))
                    .y0(d => vis.height)
                    .y1(d => vis.y(d[1] - d[0]));


        vis.tooltip = vis.svg.append("text")
                            .attr("class", "tooltip")
                            .style("opacity", 0)
                            .attr("x", 15)
                            .attr("y", 20)
                            .style("fill", "black")
                            .style("font-weight", "600")
                            .style("font-size", "16px");
                            
        // (Filter, aggregate, modify data)
        vis.wrangleData();

    }

    /*
    * Data wrangling
    */
    wrangleData(){
        let vis = this;
        
        vis.displayData = vis.stackedData;

        if (vis.filter != ""){
            let i = vis.dataCategories.indexOf(vis.filter);
            vis.displayData = [vis.stackedData[i]];
        } 


        // Update the visualization
        vis.updateVis();
    }

    updateVis() {
        let vis = this;
    
        if (!vis.displayData || vis.displayData.length === 0) return;
    
        vis.y.domain([
            0, 
            d3.max(vis.displayData, d => d3.max(d, e => vis.filter ? (e[1] - e[0]) : e[1]))
        ]);
    
        let categories = vis.chartArea.selectAll(".area")
            .data(vis.displayData, d => d.key || Math.random()); 
    
        categories.enter().append("path")
            .attr("class", "area")
            .merge(categories)
            .style("fill", d => vis.colorScale(d.key))
            .attr("d", d => vis.filter ? vis.indivArea(d) : vis.area(d))
            .on("mouseout", () => vis.tooltip.style("opacity", 0))
            .on("mouseover", (e, d) => vis.tooltip.style("opacity", 1).text(d.key || "Unknown"))
            .on("click", (e, d) => {
                let i = vis.dataCategories.indexOf(d.key);
                vis.filter = vis.filter ? "" : vis.dataCategories[i];
                vis.wrangleData();
            });
    
        categories.exit().remove();
    
        vis.svg.select(".x-axis").call(vis.xAxis);
        vis.svg.select(".y-axis").call(vis.yAxis);
    }
        
}



class Timeline {
    /**
     * @param {string} parentElement - The ID of the parent DOM element (no "#" prefix).
     * @param {Array} data - Array of objects for (year, sum fatality)
    */

	// constructor method to initialize Timeline object
	constructor(parentElement, data){
		this._parentElement = parentElement;
		this._data = data;

		// No data wrangling, no update sequence
		this._displayData = data;
        this.initVis();
	}


	initVis() {
		let vis = this;

        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 200 - this.margin.top - this.margin.bottom;

		// SVG drawing area
		vis.svg = d3.select("#" + vis._parentElement).append("svg")
			.attr("width", vis.width + vis.margin.left + vis.margin.right)
			.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");
        

		// Scales and axes
		vis.x = d3.scaleTime()
			.range([0, vis.width])
			.domain(d3.extent(vis._displayData, d => d.Year));

		vis.y = d3.scaleLinear()
			.range([vis.height, 0])
			.domain([0, d3.max(vis._displayData, function(d) { return d.TotalDeaths; })]);

		vis.xAxis = d3.axisBottom()
			.scale(vis.x);

		vis.area = d3.area()
			.x(function(d) { return vis.x(d.Year); })
			.y0(vis.height)
			.y1(function(d) { return vis.y(d.TotalDeaths); });

		vis.svg.append("path")
			.datum(vis._displayData)
			.attr("fill", "#ccc")
			.attr("d", vis.area);

		vis.brush = d3.brushX()
					.extent([[0, 0], [vis.width, vis.height]])
					.on("brush end", stackedAreaChartBrushed);

		vis.svg.append("g")
				.attr("class", "brush")
				.call(vis.brush);

		vis.svg.append("g")
			.attr("class", "x-axis axis")
			.attr("transform", "translate(0," + vis.height + ")")
			.call(vis.xAxis);

	}
}

