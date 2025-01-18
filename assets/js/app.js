"use strict";

(() => {
    const apiBaseUrl = "https://api.coingecko.com/api/v3";
    const maxReports = 5;
    let reports = JSON.parse(localStorage.getItem("reports")) || [];
    let allCoins = [];
    let isFetching = false;

    const fetchCoins = async () => {
        if (isFetching) return;
        isFetching = true;
        try {
            const response = await fetch(`${apiBaseUrl}/coins/markets?vs_currency=usd`);
            if (!response.ok) throw new Error(`Error fetching data: ${response.status}`);
            const coins = await response.json();
            isFetching = false;
            return coins;
        } catch (error) {
            console.error("API request failed:", error);
            isFetching = false;
            return [];
        }
    };

    const renderHome = async () => {
        const mainContent = document.getElementById("mainContent");
        mainContent.innerHTML = `
            <h2>Top Cryptocurrencies</h2>
            <div id="selectedCoins" class="selected-container"></div>
            <div id="coinContainer" class="grid-container"></div>
        `;
        try {
            allCoins = await fetchCoins();
            renderCoins(allCoins.slice(0, 50));
            renderSelectedCoins();
            setupSearch();
        } catch (error) {
            mainContent.innerHTML = `<h2>Error loading data</h2>`;
            console.error("Error:", error);
        }
    };

    const renderSelectedCoins = () => {
        const selectedContainer = document.getElementById("selectedCoins");
        if (reports.length === 0) {
            selectedContainer.innerHTML = `<p>No coins selected</p>`;
            return;
        }
        selectedContainer.innerHTML = reports.map((coinId) => {
            const coin = allCoins.find((c) => c.id === coinId);
            return `
                <div class="selected-coin">
                    <img src="${coin.image}" alt="${coin.name}" />
                    <h4>${coin.name}</h4>
                    <button class="remove-selected-btn" data-id="${coin.id}">Remove</button>
                </div>
            `;
        }).join("");

        document.querySelectorAll(".remove-selected-btn").forEach((button) => {
            button.addEventListener("click", (e) => {
                const coinId = e.target.dataset.id;
                removeFromReports(coinId);
            });
        });
    };

    const renderCoins = (coins) => {
        const container = document.getElementById("coinContainer");
        container.innerHTML = coins.map((coin) => `
            <div class="coin-card">
                <img src="${coin.image}" alt="${coin.name}" class="coin-icon" />
                <h3>${coin.name}</h3>
                <p>Symbol: ${coin.symbol.toUpperCase()}</p>
                <button class="info-btn" data-id="${coin.id}">More Info</button>
                <label class="toggle-container">
                    <input type="checkbox" class="toggle-btn" data-id="${coin.id}" ${reports.includes(coin.id) ? "checked" : ""}>
                    <span class="slider"></span>
                </label>
            </div>
        `).join("");

        document.querySelectorAll(".info-btn").forEach((button) => {
            button.addEventListener("click", async (e) => {
                const coinId = e.target.dataset.id;
                renderModal(coinId);
            });
        });

        document.querySelectorAll(".toggle-btn").forEach((toggle) => {
            toggle.addEventListener("change", (e) => {
                const coinId = e.target.dataset.id;
                if (e.target.checked) addToReports(coinId);
                else removeFromReports(coinId);
            });
        });
    };

    const setupSearch = () => {
        const searchInput = document.getElementById("searchInput");
        searchInput.addEventListener("input", (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const filteredCoins = allCoins.filter(coin => 
                coin.name.toLowerCase().includes(searchTerm) || 
                coin.symbol.toLowerCase().includes(searchTerm)
            );
            renderCoins(filteredCoins.slice(0, 50));
        });
    };

    const addToReports = (coinId) => {
        if (reports.length >= maxReports) {
            showMaxReportsModal();
            const toggleButton = document.querySelector(`.toggle-btn[data-id="${coinId}"]`);
            if (toggleButton) toggleButton.checked = false;
            return;
        }
        reports.push(coinId);
        localStorage.setItem("reports", JSON.stringify(reports));
        renderSelectedCoins();
        if (document.getElementById("liveChart")) renderReports();
    };

    const removeFromReports = (coinId) => {
        reports = reports.filter((id) => id !== coinId);
        localStorage.setItem("reports", JSON.stringify(reports));
        renderSelectedCoins();
        if (document.getElementById("liveChart")) renderReports();
    };

    const showMaxReportsModal = () => {
        const modal = document.getElementById("maxReportsModal");
        modal.style.display = "flex";
        
        const closeBtn = modal.querySelector(".close-btn");
        const closeModal = () => {
            modal.style.display = "none";
        };
        
        closeBtn.onclick = closeModal;
        modal.onclick = (event) => {
            if (event.target === modal) {
                closeModal();
            }
        };
    };

    const renderModal = async (coinId) => {
        try {
            const response = await fetch(`${apiBaseUrl}/coins/${coinId}`);
            if (!response.ok) throw new Error(`Error fetching coin data: ${response.status}`);
            const coin = await response.json();
    
            const modalContainer = document.getElementById("modalContainer");
            const modalTitle = document.getElementById("modalTitle");
            const modalImage = document.getElementById("modalImage");
            const modalDetails = document.getElementById("modalDetails");
    
            modalTitle.textContent = coin.name;
            modalImage.src = coin.image.large;
            modalDetails.innerHTML = `
                <li>Symbol: ${coin.symbol.toUpperCase()}</li>
                <li>USD: $${coin.market_data?.current_price?.usd?.toFixed(2) || 'N/A'}</li>
                <li>EUR: €${coin.market_data?.current_price?.eur?.toFixed(2) || 'N/A'}</li>
                <li>ILS: ₪${coin.market_data?.current_price?.ils?.toFixed(2) || 'N/A'}</li>
            `;
    
            modalContainer.style.display = 'flex';
    
            const closeBtn = modalContainer.querySelector(".close-btn");
            const closeModal = () => {
                modalContainer.style.display = 'none';
            };
    
            closeBtn.onclick = closeModal;
            modalContainer.onclick = (event) => {
                if (event.target === modalContainer) {
                    closeModal();
                }
            };
    
        } catch (error) {
            console.error("Error rendering modal:", error);
        }
    };

    const renderReports = () => {
        const mainContent = document.getElementById("mainContent");
        mainContent.innerHTML = `
            <h2>Live Cryptocurrency Reports</h2>
            <canvas id="liveChart" width="400" height="200"></canvas>
        `;

        const ctx = document.getElementById("liveChart").getContext("2d");
        const chart = new Chart(ctx, {
            type: "line",
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, position: "top" },
                },
                scales: {
                    x: { title: { display: true, text: "Time" } },
                    y: { beginAtZero: true, title: { display: true, text: "Price (USD)" } },
                },
            },
        });

        const updateChart = async () => {
            if (reports.length === 0) {
                chart.data.labels = [];
                chart.data.datasets = [];
                chart.update();
                return;
            }
            const coinIds = reports.join(",");
            const response = await fetch(`${apiBaseUrl}/coins/markets?vs_currency=usd&ids=${coinIds}`);
            const data = await response.json();

            const now = new Date().toLocaleTimeString();
            chart.data.labels.push(now);
            if (chart.data.labels.length > 10) chart.data.labels.shift();

            data.forEach((coin, index) => {
                if (!chart.data.datasets[index]) {
                    chart.data.datasets.push({
                        label: coin.name,
                        data: [],
                        borderColor: getRandomColor(),
                        backgroundColor: getRandomColor(0.2),
                        tension: 0.4,
                    });
                }
                chart.data.datasets[index].data.push(coin.current_price);
                if (chart.data.datasets[index].data.length > 10) {
                    chart.data.datasets[index].data.shift();
                }
            });
            chart.update();
        };

        updateChart();
        setInterval(updateChart, 5000);
    };

    const getRandomColor = (opacity = 1) => {
        const letters = "0123456789ABCDEF";
        let color = "#";
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return `${color}${opacity === 1 ? "" : Math.floor(opacity * 255).toString(16)}`;
    };

    const setupNavigation = () => {
        document.getElementById("homeBtn").addEventListener("click", renderHome);
        document.getElementById("aboutBtn").addEventListener("click", renderAbout);
        document.getElementById("reportBtn").addEventListener("click", renderReports);
    };

    const renderAbout = () => {
        const aboutContent = document.getElementById("aboutContent").innerHTML;
        const mainContent = document.getElementById("mainContent");
        mainContent.innerHTML = aboutContent;
    };

    renderHome();
    setupNavigation();
})();