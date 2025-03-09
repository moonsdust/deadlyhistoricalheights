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
        this.displayData = [];

        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;

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
            .attr("transform", `translate(${this.margin.left}, ${vis.margin.top})`);

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

        // Initalize new array for all mountain peak (peak_name) and the information we need for the visualization
        vis.allMountainPeakDeathRateInfo = {};

        // Filter out rows where there is N/A from highpoint_metres, peak_name, and died 

        // Set died == TRUE to 1 and 0 others 

        // Compute the death rate (died == TRUE / length of members.csv) * 100

        // Obtain the sum of all climbers who have died or not (Number of people who have climbed that peak)

        // Sort in descending order by death rate and obtain the first 10 peaks to get the highest death rates and 
        // then store in display array 

        // Sort in increasing order by death rate and obtain the first 10 peaks to get the lowest death rates and 
        // then store in display array 

    }

    updateVis() {
       // Visualization is a circular barplot
       // Uses vis.displayMountainPeakDeathRateInfo for data 
       // Length of the bars = highpoint_metres (Highest height reached by climbers)
       // Bars are grouped by highest and lowest rates of death 

       // Referenced: https://stackoverflow.com/questions/61000740/create-a-radial-circular-grouped-bar-chart-with-d3-js

       // Update tooltip

    }
}