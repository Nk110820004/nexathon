
let foods = {};
let dailyCalories = 0;
let streak = 0;
let calorieHistory = [];

// Load dataset & populate dropdown
async function loadFoodDataset() {
    try {
        const response = await fetch("foods_dataset.json"); // Ensure the file exists
        const data = await response.json();

        foods = data.reduce((acc, food) => {
            acc[food.id] = food; // Store food by ID
            return acc;
        }, {});

        populateDropdown();
        loadData();
    } catch (error) {
        console.error("Error loading food dataset:", error);
    }
}

// Populate the dropdown menu dynamically
function populateDropdown() {
    const foodSelect = document.getElementById("foodSelect");
    foodSelect.innerHTML = '<option value="">Select a food</option>'; // Clear existing options

    Object.entries(foods).forEach(([id, food]) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `${food.name} (${food.calories} cal)`;
        foodSelect.appendChild(option);
    });
}

// Load saved data from local storage
function loadData() {
    const savedStreak = localStorage.getItem("streak");
    const savedHistory = localStorage.getItem("calorieHistory");
    const lastLogin = localStorage.getItem("lastLogin");

    if (savedStreak) streak = Number.parseInt(savedStreak);
    if (savedHistory) calorieHistory = JSON.parse(savedHistory);

    const today = new Date().toDateString();

    if (lastLogin !== today) {
        if (lastLogin === new Date(Date.now() - 86400000).toDateString()) {
            streak++;
        } else {
            streak = 1;
        }
        localStorage.setItem("lastLogin", today);
        localStorage.setItem("streak", streak);
        dailyCalories = 0;
        calorieHistory.push(0); // Ensure new entry for today
    } else {
        dailyCalories = calorieHistory[calorieHistory.length - 1] || 0;
    }

    updateStreak();
    updateCalories();
    updateCharts();
}

// Add food to the daily calorie count
function addFood() {
    const foodSelect = document.getElementById("foodSelect");
    const quantityInput = document.getElementById("quantity");
    const foodList = document.getElementById("foodList");

    const selectedFoodId = foodSelect.value;
    const quantity = Number.parseInt(quantityInput.value);

    if (!selectedFoodId || isNaN(quantity) || quantity <= 0) {
        alert("Invalid food item or quantity. Please select a valid one.");
        return;
    }

    const food = foods[selectedFoodId];
    if (!food) {
        alert("Invalid food item. Please select a valid one.");
        return;
    }

    const totalCalories = food.calories * quantity;
    dailyCalories += totalCalories;

    const listItem = document.createElement("li");
    listItem.textContent = `${quantity} x ${food.name} (${totalCalories} cal)`;
    foodList.appendChild(listItem);

    updateCalories();
    saveData();
}

// Update displayed calorie count
function updateCalories() {
    document.getElementById("totalCalories").textContent = dailyCalories;
}

// Update streak display
function updateStreak() {
    document.getElementById("streak").textContent = `Streak: ${streak} days`;
}

// Save calorie history to local storage
function saveData() {
    if (calorieHistory.length > 0) {
        calorieHistory[calorieHistory.length - 1] = dailyCalories;
    } else {
        calorieHistory.push(dailyCalories);
    }
    localStorage.setItem("calorieHistory", JSON.stringify(calorieHistory));
}

// Chart management
let comparisonChart = null;
let historyChart = null;

function updateCharts() {
    updateComparisonChart();
    updateHistoryChart();
}

function updateComparisonChart() {
    const ctx = document.getElementById("comparisonChart").getContext("2d");
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    comparisonChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Your Intake", "Recommended"],
            datasets: [{
                label: "Calories",
                data: [dailyCalories, 2000],
                backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)"]
            }]
        },
        options: {
            scales: { y: { beginAtZero: true } },
            responsive: true,
            plugins: { title: { display: true, text: "Daily Calorie Intake Comparison" } }
        }
    });
}

function updateHistoryChart() {
    const ctx = document.getElementById("historyChart").getContext("2d");
    if (historyChart) {
        historyChart.destroy();
    }
    historyChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: calorieHistory.map((_, index) => `Day ${index + 1}`),
            datasets: [{
                label: "Calorie History",
                data: calorieHistory,
                fill: false,
                borderColor: "rgb(75, 192, 192)",
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: "Calorie Intake History" } }
        }
    });
}

// Load dataset and initialize app on page load
document.addEventListener("DOMContentLoaded", loadFoodDataset);
