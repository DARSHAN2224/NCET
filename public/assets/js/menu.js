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

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.querySelector('input[name="search"]');

    // Extract shopId from the URL
    const urlParts = window.location.pathname.split('/');
    const shopId = urlParts[urlParts.length - 1]; // Assuming shopId is the last part of the URL

    const suggestionBox = document.createElement('ul');
    suggestionBox.setAttribute('id', 'suggestion-box'); // Apply the predefined CSS by adding the ID

    searchInput.parentNode.appendChild(suggestionBox);

    searchInput.addEventListener('input', async function () {
        const searchTerm = searchInput.value;

        if (searchTerm.length === 0) {
            suggestionBox.style.display = 'none';
            return;
        }

        try {
            // Fetch suggestions based on the search term and shopId
            const response = await fetch(`/search-suggestions?term=${searchTerm}&shopId=${shopId}`);
            const suggestions = await response.json();

            // Clear previous suggestions
            suggestionBox.innerHTML = '';

            if (suggestions.length > 0) {
                suggestions.forEach(suggestion => {
                    const li = document.createElement('li');
                    li.textContent = suggestion;
                    li.style.padding = '5px';
                    li.style.cursor = 'pointer';
                    li.addEventListener('click', function () {
                        searchInput.value = suggestion;
                        suggestionBox.style.display = 'none';
                    });
                    suggestionBox.appendChild(li);
                });
                suggestionBox.style.display = 'block';
            } else {
                suggestionBox.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    });

    // Hide the suggestions when clicking outside the search input or suggestion box
    document.addEventListener('click', function (event) {
        if (!searchInput.contains(event.target) && !suggestionBox.contains(event.target)) {
            suggestionBox.style.display = 'none';
        }
    });
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
