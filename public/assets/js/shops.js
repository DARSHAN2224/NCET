document.querySelectorAll('.add-to-cart-form').forEach(form => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const actionUrl = form.action;
        const formData = new FormData(form);

        try {
            const response = await fetch(actionUrl, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();

                // Update the cart count
                const cartCountElement = document.getElementById('cart-count');
                cartCountElement.textContent = result.cart.totalQty;

                alert('Product added to cart!');
            } else {
                console.error('Failed to add product to cart');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
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

// Hide suggestions if clicking outside the search bar or suggestions
document.addEventListener('click', function (event) {
    if (!searchBar.contains(event.target) && !suggestionsList.contains(event.target)) {
        suggestionsList.style.display = 'none';
    }
});

function showQuantityForm(productId) {
    // Get the specific quantity form and button for the product
    const quantityInputDiv = document.getElementById(`quantityForm_${productId}`);
    const buyNowBtn = document.getElementById(`buyNowBtn_${productId}`);

    // Check if the form is currently visible or hidden
    if (quantityInputDiv.style.display === "none" || quantityInputDiv.style.display === "") {
        // If hidden, show the form and change the button text to "Cancel"
        quantityInputDiv.style.display = "block";
        buyNowBtn.innerText = "Cancel";
    } else {
        // If visible, hide the form and reset the button text to "Buy Now"
        quantityInputDiv.style.display = "none";
        buyNowBtn.innerText = "Buy Now";
    }

    // Optionally, hide other quantity forms if you want to close all other forms when one is opened
    document.querySelectorAll(`[id^="quantityForm_"]:not(#quantityForm_${productId})`).forEach(form => {
        form.style.display = 'none';
    });

    // Reset all other 'Buy Now' buttons to their original text except the current one
    document.querySelectorAll(`[id^="buyNowBtn_"]:not(#buyNowBtn_${productId})`).forEach(button => {
        button.innerText = "Buy Now";
    });
}



async function submitBuyNow(productId) {
    const quantity = document.getElementById(`quantityInput_${productId}`).value;
    const productIdInput = document.getElementById(`productId_${productId}`).value;

    if (quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
    }

    try {
        const response = await fetch('/buy-now', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productId: productIdInput,
                quantity: quantity
            })
        });

        const resultMessage = document.getElementById(`resultMessage_${productId}`);

        if (response.ok) {
            resultMessage.innerText = 'Purchase Successful!';
            window.location.href = "/order-success";
        } else {
            const error = await response.json();
            resultMessage.innerText = 'Error: ' + error.message;
        }
    } catch (error) {
        console.error('Error processing the purchase:', error);
        const resultMessage = document.getElementById(`resultMessage_${productId}`);
        resultMessage.innerText = 'An error occurred. Please try again.';
    }
}
