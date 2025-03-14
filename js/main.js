/* * * * * * * * * * * * * *
ChatGPT was used to assist in the development of this project.
* * * * * * * * * * * * * */

// init global variables, switches, helper functions
let seasonChart;
let stackedAreaChart, stackedAreaChartTimeline;
let deathChart;
let guessLineChart;



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

    let expeditionsData = allDataArray[0];
    let membersData = allDataArray[1];
    let peaksData = allDataArray[2];
    let stackedAreaChartData = setupStackedAreaChartData(membersData);
    let guessLineChartData =  setupGuessLineChartData(membersData)

    // console.log(guessLineChartData);


    seasonChart = new SeasonChart("main-viz-3", membersData);
    stackedAreaChart = new StackedAreaChart("insight-viz-2-viz", stackedAreaChartData.layers);
    stackedAreaChartTimeline = new Timeline("insight-viz-2-timeline", stackedAreaChartData.years);
    deathRateChart = new DeathRateChart("main-viz-2", membersData);
    guessLineChart = new GuessLineChart("main-viz-4", guessLineChartData);
}

function setupStackedAreaChartData(data) {
    let parseDate = d3.timeParse("%Y");

    let preparedData = {
        layers: [],
        years: []
    };

    let yearMap = {}; 
    let causeMap = {};
    const minYear = 1905, maxYear = 2019;

    data.forEach(d => {
        let year = parseInt(d.year);
        let cause = d.death_cause?.trim().toLowerCase();

        if (cause === "na") return;

        if (!yearMap[year]) {
            yearMap[year] = { Year: parseDate(year.toString()), TotalDeaths: 0 };
        }
        
        if (!causeMap[year]) {
            causeMap[year] = { Year: parseDate(year.toString()) };
        }

        causeMap[year][cause] = (causeMap[year][cause] || 0) + 1;
        yearMap[year].TotalDeaths += 1;
    });

    let allCauses = new Set(data.map(d => d.death_cause?.trim().toLowerCase()).filter(c => c && c !== "na"));

    for (let year = minYear; year <= maxYear; year++) {
        if (!causeMap[year]) {
            causeMap[year] = { Year: parseDate(year.toString()) };
        }
        allCauses.forEach(cause => {
            if (!causeMap[year][cause]) {
                causeMap[year][cause] = 0;
            }
        });
    }

    preparedData.layers = Object.values(causeMap).sort((a, b) => a.Year - b.Year);
    preparedData.years = Object.values(yearMap).sort((a, b) => a.Year - b.Year);
    return preparedData;
}


function setupGuessLineChartData(membersData) {
    let yearMap = {};
    const minYear = 1905, maxYear = 2019;

    membersData.forEach(d => {
        let year = parseInt(d.year);
        if (isNaN(year) || year < minYear || year > maxYear) return; 
        let died = d.died && d.died.toLowerCase() === "true";

        if (!yearMap[year]) {
            yearMap[year] = { Year: d3.timeParse("%Y")(year.toString()), totalMembers: 0, totalDeaths: 0 };
        }

        yearMap[year].totalMembers += 1;
        if (died) {
            yearMap[year].totalDeaths += 1;
        }
    });

    for (let year = minYear; year <= maxYear; year++) {
        if (!yearMap[year]) {
            yearMap[year] = { Year: d3.timeParse("%Y")(year.toString()), totalMembers: 0, totalDeaths: 0 };
        }
    }

    let deathRateData = Object.values(yearMap)
        .map(d => ({
            Year: d.Year,
            DeathRate: d.totalMembers > 0 ? d.totalDeaths / d.totalMembers : 0
        }))
        .sort((a, b) => a.Year - b.Year);

    return deathRateData;
}



function stackedAreaChartBrushed() {
	let selectionRange = d3.brushSelection(d3.select(".brush").node());
	
	if (!selectionRange) {
		return; 
	}
	let selectionDomain = selectionRange.map(stackedAreaChartTimeline.x.invert);
	stackedAreaChart.x.domain(selectionDomain);
	stackedAreaChart.wrangleData();

}
