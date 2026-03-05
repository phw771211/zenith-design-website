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

// Shrink header on scroll
const header = document.querySelector(".header");
window.addEventListener("scroll", () => {
    header.style.borderBottomColor = window.scrollY > 40
        ? "rgba(255,255,255,0.10)"
        : "rgba(255,255,255,0.06)";
});

// Contact form (placeholder — wire up to your backend or Formspree)
document.getElementById("contact-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const btn = this.querySelector("button[type=submit]");
    btn.textContent = "Sent!";
    btn.disabled = true;
    setTimeout(() => { btn.textContent = "Send Message"; btn.disabled = false; this.reset(); }, 3000);
});
