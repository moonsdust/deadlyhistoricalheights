class SeasonChart {
    constructor(parentId, membersData) {
      this.parentElement = document.getElementById(parentId);
      this.membersData = membersData;
      this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
      this.width = 800 - this.margin.left - this.margin.right;
      this.height = 400 - this.margin.top - this.margin.bottom;
      this.initVis();
    }
  
    initVis() {
      this.svg = d3.select(this.parentElement)
        .append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);
  
      this.prepareData();
  
      const observerOptions = { threshold: 0.5 };
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.updateVis();
            obs.unobserve(entry.target);
          }
        });
      }, observerOptions);
  
      observer.observe(this.parentElement);
    }
  
    prepareData() {
      this.membersData.forEach(d => {
        d.success = (d.success && d.success.toString().toLowerCase() === "true") ? 1 : 0;
      });
      const validSeasons = new Set(["winter", "spring", "summer", "autumn"]);
      this.membersData = this.membersData.filter(d => d.season && validSeasons.has(d.season.toLowerCase()));
      const attemptsBySeason = d3.rollup(this.membersData, arr => arr.length, d => d.season);
      const successBySeason = d3.rollup(this.membersData, arr => d3.sum(arr, d => d.success), d => d.season);
      const allSeasons = Array.from(attemptsBySeason.keys());
      this.seasonData = allSeasons.map(season => {
        const attempts = attemptsBySeason.get(season);
        const successCount = successBySeason.get(season) || 0;
        const successRate = attempts === 0 ? 0 : (successCount / attempts) * 100;
        return { season, successCount, attempts, successRate };
      });
      const seasonOrder = ["Winter", "Spring", "Summer", "Autumn"];
      this.seasonData.sort((a, b) => seasonOrder.indexOf(a.season) - seasonOrder.indexOf(b.season));
    }
  
    updateVis() {
      if (!this.seasonData || this.seasonData.length === 0) {
        console.warn("No valid season data.");
        return;
      }
  
      const colorScale = d3.scaleOrdinal()
        .domain(["Winter", "Spring", "Summer", "Autumn"])
        .range(["#1f77b4", "#2ca02c", "#ff7f0e", "#d62728"]);
  
      const xScale = d3.scaleBand()
        .domain(this.seasonData.map(d => d.season))
        .range([0, this.width])
        .padding(0.4);
  
      const centerY = this.height / 2;
  
      const seasonGroups = this.svg.selectAll(".season-group")
        .data(this.seasonData)
        .join("g")
        .attr("class", "season-group")
        .attr("transform", d => {
          const cx = xScale(d.season) + xScale.bandwidth() / 2;
          return `translate(${cx}, ${centerY})`;
        });
  
      seasonGroups.each((d, i, nodes) => {
        const group = d3.select(nodes[i]);
        const { season, successCount, attempts, successRate } = d;
        const numDots = Math.floor(successCount / 10);
        let maxScatterRadius = 80;
        const fillColor = colorScale(season);
        let dotDelay = 50;
        let dotDuration = 700;
        if (season.toLowerCase() === "winter" || season.toLowerCase() === "summer") {
          dotDelay = 200;
          dotDuration = 1000;
        }
        const totalAnimationTime = (numDots - 1) * dotDelay + dotDuration;
        const finalPositions = d3.range(numDots).map(() => {
          const angle = 2 * Math.PI * Math.random();
          const radius = maxScatterRadius * Math.sqrt(Math.random());
          return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
        });
        group.selectAll(".dot")
          .data(finalPositions)
          .join("circle")
          .attr("class", "dot")
          .attr("r", 3)
          .attr("fill", fillColor)
          .attr("cx", 0)
          .attr("cy", 0)
          .transition()
          .delay((pos, idx) => idx * dotDelay)
          .duration(dotDuration)
          .attr("cx", pos => pos.x)
          .attr("cy", pos => pos.y)
          .ease(d3.easeCubicOut);
  
        const label = group.append("text")
          .attr("class", "season-label")
          .attr("text-anchor", "middle")
          .style("fill", fillColor)
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .attr("y", -maxScatterRadius - 50);
  
        const line1 = label.append("tspan")
          .attr("x", 0)
          .attr("dy", 0)
          .text(season);
  
        const line2 = label.append("tspan")
          .attr("x", 0)
          .attr("dy", "1.2em")
          .text(`0 successes / ${attempts} attempts`);
  
        const line3 = label.append("tspan")
          .attr("x", 0)
          .attr("dy", "1.2em")
          .text(`0.0%`);
  
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