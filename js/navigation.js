document.addEventListener("DOMContentLoaded", function () {
    const sections = document.querySelectorAll("section");
    const navDots = document.querySelectorAll(".nav-dot");
  
    function updateActiveSection() {
      let scrollPosition = window.scrollY + window.innerHeight / 3;
  
      sections.forEach((section) => {
        let sectionTop = section.offsetTop;
        let sectionHeight = section.offsetHeight;
  
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          navDots.forEach(dot => dot.classList.remove("active"));
          document.querySelector(`[data-section="${section.id}"]`).classList.add("active");
        }
      });
    }
  
    window.addEventListener("scroll", updateActiveSection);
  
    navDots.forEach((dot) => {
      dot.addEventListener("click", function (event) {
        event.preventDefault();
        let sectionId = this.getAttribute("href").substring(1);
        document.getElementById(sectionId).scrollIntoView({ behavior: "smooth" });
      });
    });
  
    updateActiveSection();
  });
  