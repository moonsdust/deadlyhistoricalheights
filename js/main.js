/* * * * * * * * * * * * * *
*           MAIN           *
* * * * * * * * * * * * * */

// init global variables, switches, helper functions
let seasonChart;



// load data using promises
let promises = [
    d3.csv("data/expeditions.csv"),
    d3.csv("data/members.csv"),
    d3.csv("data/peaks.csv")
];

Promise.all(promises)
    .then( function(data){ initMainPage(data) })
    .catch( function (err){console.log(err)} );

// initMainPage
function initMainPage(allDataArray) {

    // log data
    // console.log(allDataArray);

    expeditionsData = allDataArray[0];
    membersData = allDataArray[1];
    peaksData = allDataArray[2];
    seasonChart = new SeasonChart("main-viz-3", membersData);
    deathRateChart = new DeathRateChart("main-viz-1", membersData);
}
