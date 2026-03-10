// Mobile nav toggle
const navToggle = document.getElementById("nav-toggle");
const navLinks  = document.querySelector(".nav-links");

navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
});

// Close nav when a link is clicked
navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
});

// Language selector toggle
const langToggle = document.getElementById("lang-toggle");
const langDropdown = document.getElementById("lang-dropdown");

if (langToggle && langDropdown) {
    langToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        langDropdown.classList.toggle("active");
    });

    // Language option click
    document.querySelectorAll(".lang-option").forEach(option => {
        option.addEventListener("click", (e) => {
            e.preventDefault();
            const lang = option.dataset.lang;
            changeLanguage(lang);
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!langToggle.contains(e.target) && !langDropdown.contains(e.target)) {
            langDropdown.classList.remove("active");
        }
    });
}

// Darken header border on scroll
const header = document.querySelector(".header");
window.addEventListener("scroll", () => {
    header.style.borderBottomColor = window.scrollY > 40
        ? "rgba(0,0,0,0.12)"
        : "rgba(0,0,0,0.06)";
});

// Works carousel arrows
const worksGrid = document.querySelector(".works-grid");
const arrowPrev = document.querySelector(".works-arrow-prev");
const arrowNext = document.querySelector(".works-arrow-next");

if (worksGrid && arrowPrev && arrowNext) {
    const scrollAmount = () => worksGrid.offsetWidth * 0.52;
    arrowNext.addEventListener("click", () => {
        worksGrid.scrollBy({ left: scrollAmount(), behavior: "smooth" });
    });
    arrowPrev.addEventListener("click", () => {
        worksGrid.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
    });
}
