/* * * * * * * * * * * * * *
ChatGPT was used to assist in the development of this project.
* * * * * * * * * * * * * */

// init global variables, switches, helper functions
let seasonChart;
let stackedAreaChart, stackedAreaChartTimeline;
let deathChart;
let guessLineChart;
let dotGraphCompletion;
let dotGraphOxygenUse;

let selectedCategoryForDotGraph = document.getElementById('categorySelectorDotGraph').value; // This would indicate what the current value for the select is (age or gender)

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
    let guessLineChartData =  setupGuessLineChartData(membersData);

    // console.log(guessLineChartData);

    cliffChart = new CliffChart(membersData);
    // 2) Use IntersectionObserver to watch the container
    const container = document.getElementById("insight-viz-1");

    const observerOptions = {
    threshold: 0.3 // means 30% of container must be visible to trigger
    };

    const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
        // Start the animation
        cliffChart.startFlow();
        
        // Unobserve so it doesn't trigger again
        obs.unobserve(entry.target);
        }
    });
    }, observerOptions);

    observer.observe(container);


    stackedAreaChart = new StackedAreaChart("insight-viz-2-viz", stackedAreaChartData.layers);
    stackedAreaChartTimeline = new Timeline("insight-viz-2-timeline", stackedAreaChartData.years);
    deathRateChart = new DeathRateChart("main-viz-2", membersData);
    seasonChart = new SeasonChart("main-viz-3", membersData);
    guessLineChart = new GuessLineChart("main-viz-4", guessLineChartData);
    dotGraphCompletion = new DotGraph("insight-viz-3", membersData, "success");
    dotGraphOxygenUse = new DotGraph("main-viz-1", membersData, "oxygen_used");
}

function setupStackedAreaChartData(data) {
    let parseDate = d3.timeParse("%Y");

    let preparedData = {
        layers: [],
        years: []
    };

    const minYear = 1905, maxYear = 2019;

    let yearMap = {}; 
    let causeMap = {};
    let totalCauseCounts = {};

    data.forEach(d => {
        let rawCause = d.death_cause?.trim().toLowerCase();
        if (!rawCause || rawCause === "na") return;

        let cause = rawCause.charAt(0).toUpperCase() + rawCause.slice(1);
        totalCauseCounts[cause] = (totalCauseCounts[cause] || 0) + 1;
    });

    let topCauses = Object.entries(totalCauseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cause]) => cause);

    data.forEach(d => {
        let year = parseInt(d.year);
        if (isNaN(year) || year < minYear || year > maxYear) return;

        let rawCause = d.death_cause?.trim().toLowerCase();
        if (!rawCause || rawCause === "na") return;

        let cause = rawCause.charAt(0).toUpperCase() + rawCause.slice(1);

        if (!topCauses.includes(cause)) return;

        if (!yearMap[year]) {
            yearMap[year] = { Year: parseDate(year.toString()), TotalDeaths: 0 };
        }

        if (!causeMap[year]) {
            causeMap[year] = { Year: parseDate(year.toString()) };
        }

        causeMap[year][cause] = (causeMap[year][cause] || 0) + 1;
        yearMap[year].TotalDeaths += 1;
    });

    for (let year = minYear; year <= maxYear; year++) {
        if (!causeMap[year]) {
            causeMap[year] = { Year: parseDate(year.toString()) };
        }

        topCauses.forEach(cause => {
            if (!causeMap[year][cause]) {
                causeMap[year][cause] = 0;
            }
        });

        if (!yearMap[year]) {
            yearMap[year] = { Year: parseDate(year.toString()), TotalDeaths: 0 };
        }
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

function categoryChangeDotGraph(){
    // Updates the dot graphs based on the selected value 
    selectedCategoryForDotGraph = document.getElementById('categorySelectorDotGraph').value;

    if (selectedCategoryForDotGraph === "sex") {
        document.querySelector(".text-for-sex").style.display = 'block';
        document.querySelector(".text-for-sex-2").style.display = 'block';
        document.querySelector(".text-for-age-group").style.display = 'none';
        document.querySelector(".text-for-age-group-2").style.display = 'none';
    } 
    else {
        document.querySelector(".text-for-sex").style.display = 'none';
        document.querySelector(".text-for-sex-2").style.display = 'none';
        document.querySelector(".text-for-age-group").style.display = 'block';
        document.querySelector(".text-for-age-group-2").style.display = 'block';
    }

    dotGraphCompletion.wrangleData(); 
    dotGraphOxygenUse.wrangleData();
 }