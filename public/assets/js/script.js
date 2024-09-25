var swiper = new Swiper('.swiper-container', {
  slidesPerView: 1,
  spaceBetween: 10,
  pagination: {
      el: '.swiper-pagination',
      clickable: true,
  },
});


var swiper = new Swiper('.swiper-container', {
  slidesPerView: 1,
  spaceBetween: 10,
  pagination: {
      el: '.swiper-pagination',
      clickable: true,
  },
  autoplay: {
      delay: 3000, // Change the delay time as needed (3000ms = 3 seconds)
      disableOnInteraction: false,
  },
});



const searchBar = document.getElementById('search-bar');
const suggestionsList = document.getElementById('suggestions');

searchBar.addEventListener('input', async function () {
    const searchTerm = this.value.trim();
    if (searchTerm.length === 0) {
        suggestionsList.style.display = 'none';
        return;
    }
    try {
        const response = await fetch(`/search-suggestions?term=${searchTerm}`);
        const suggestions = await response.json();

        // Clear the suggestions list
        suggestionsList.innerHTML = '';

        // If suggestions exist, display them
        if (suggestions.length > 0) {
            suggestionsList.style.display = 'block';
            suggestions.forEach(suggestion => {
                const li = document.createElement('li');
                li.textContent = suggestion;
                li.style.padding = '5px';
                li.style.cursor = 'pointer';

                // When a suggestion is clicked, set it as the search term
                li.addEventListener('click', function () {
                    searchBar.value = suggestion;
                    suggestionsList.style.display = 'none';
                });

                suggestionsList.appendChild(li);
            });
            suggestionsList.style.display = 'block';
        } else {
            suggestionsList.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
});




async function updateCartCount() {
  try {
    const response = await fetch('/cart-count');
    const data = await response.json();
    document.getElementById('cart-count').textContent = data.totalQty;
  } catch (error) {
    console.error('Failed to fetch cart count', error);
  }
}

// Fetch cart count when the page loads
window.onload = updateCartCount;