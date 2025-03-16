document.addEventListener("scroll", function () {
    /* Adds parallax effect to title page */
    let distance = window.scrollY
    document.querySelector(".foreground_valley").style.transform = `translateY(${distance * -1}px)`;
    document.querySelector(".valley_2").style.transform = `translateY(${distance * -1}px)`;
    document.querySelector(".valley_3").style.transform = `translateY(${distance * -1}px)`;
    document.querySelector(".mountains").style.transform = `translateY(${distance * -1.2}px)`;
    // document.querySelector(".landscape").style.background = `#1f1f1f`;
  });
  