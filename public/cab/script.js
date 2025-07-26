document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("cab-form");

    form.addEventListener("submit", (e) => {
        e.preventDefault(); // Stop the form from submitting immediately

        navigator.geolocation.getCurrentPosition(pos => {
            document.getElementById("lat").value = pos.coords.latitude;
            document.getElementById("lng").value = pos.coords.longitude;

            form.submit(); // submit after setting location
        }, err => {
            alert("Please allow location access to book a cab.");
        });
    });
});
