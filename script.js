document.addEventListener('DOMContentLoaded', function() {
    var map = L.map('map').setView([53.5457, -113.5329], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Load data
    fetch('dataset.csv')
        .then(response => response.text())
        .then(csvData => { 
            const rows = csvData.split('\n').slice(1); // Changed variable name from 'data' to 'csvData'
            
            let accountNumbers = [];    // property number
            let yearsAssessed = [];     // year assessed
            let lats = [];  // latitude
            let lngs = [];  // longitude
            let zoneNames = [];     // zone name
            let yearsBuilt = [];    // year built
            let values = [];    // assessed value
            let lotSize = []; // lot size
            var zoningData = {}; // Store total and count for each zoning
            var zoningColors = {}; // Store colors for each zoning
            var accountData = {} // Store each property number info (assess yr & value)

            // Extract Zoning(zone names), years, and assessed values from data
            rows.forEach(row => {
                const columns = row.split(',');

                accountNumbers.push(columns[0]);
                yearsAssessed.push(columns[1]); 
                lats.push(parseFloat(columns[6])); 
                lngs.push(parseFloat(columns[7])); 
                zoneNames.push(columns[12]); 
                yearsBuilt.push(columns[10]); 
                values.push(parseFloat(columns[14])); 
                lotSize.push(columns[13]);
                const accountNum = columns[0];
                const year = columns[1];
                const value = columns[14];

                if (!accountData[accountNum]){
                    accountData[accountNum] = [];
                }
                accountData[accountNum].push({ assessedYear: year, assessedValue: value});
            });

            /* Get location of each property on the map */
            zoneNames.forEach((zoneName, ind)=>{
                if (yearsAssessed[ind] == 2023) {
                    if (!zoningData[zoneName]) {
                        zoningData[zoneName] = { totalValue: 0, count: 0 };
                    }
                    zoningData[zoneName].totalValue += values[ind];
                    zoningData[zoneName].count++;
        
                    if (!zoningColors[zoneName]) {
                        zoningColors[zoneName] = getRandomColor(); // Assign color for new zoning
                    }
    
                    const popupContent = `
                        <strong>Account Number:</strong> ${accountNumbers[ind]}<br>
                        <strong>Zoning:</strong> ${zoneName}<br>
                        <strong>Lastest Assessed Value:</strong> $ ${values[ind]}<br>
                        <strong>Lot Size:</strong> ${lotSize[ind]} SQ.F<br>
                        <strong>Build Year:</strong> ${parseInt(yearsBuilt[ind])}<br>
                    `;
                    
                    // Add circles
                    var marker = L.circleMarker([lats[ind], lngs[ind]], {
                        color: zoningColors[zoneName],
                        fillColor: zoningColors[zoneName],
                        fillOpacity: 0.5,
                        radius: 10
                    }).addTo(map);
                    // Single click shows info.
                    marker.bindPopup(popupContent); 
                    // Double click shows line chart
                    marker.on('dblclick', function(){
                        displayChart(accountData[accountNumbers[ind]], accountNumbers[ind]);
                    });
                }
            })


            /* Draw Pie chart */
            // Zone Selector:
            let uniqueZones = [...new Set(zoneNames)];
            uniqueZones.forEach(zone => {
                let option = new Option(zone, zone);
                zoneSelector.add(option);
            });

            zoneSelector.addEventListener('change', function(){
                let selectedZone = this.value;
                drawPieChart(selectedZone, zoneNames, yearsBuilt, values);
            });
        });

    function getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    let currentChart = null;
    function displayChart(data, accountNumber) {
        const ctx = document.getElementById('chartContainer').getContext('2d');
        if(currentChart){
            currentChart.destroy();
        }
        currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.assessedYear), // row for year
                datasets: [{
                    label: `Assessed Value for Current Property ${accountNumber}`,
                    data: data.map(item => item.assessedValue), // column for value
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.5)', // Blue color
                    ],
                    borderColor: [
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Assessed Year: ${context.label} / Assessed Value: CA$${context.raw}`;
                            }
                        }
                    }
                }
            }
        });
    }

    let pieChart;
    function drawPieChart(selectedZone,zoneNames,yearsBuilt, values){
        // Calculate the count and average assessed value by zone name
        let assessedValuesByYearRange = {
            '1960_to_1980': {'count': 0, 'totalValue': 0},
            '1981_to_2000': {'count': 0, 'totalValue': 0},
            '2001_to_2020': {'count': 0, 'totalValue': 0}
        }
        zoneNames.forEach((zoneName, ind) => {
            let condition = selectedZone === 'ANY'? true: zoneName === selectedZone;
            if(condition)
            {
                if (yearsBuilt[ind] > 1960 && yearsBuilt[ind] <= 1980) {
                    assessedValuesByYearRange["1960_to_1980"].count++;
                    assessedValuesByYearRange["1960_to_1980"].totalValue += values[ind];
                } else if (yearsBuilt[ind] > 1980 && yearsBuilt[ind] <= 2000) {
                    assessedValuesByYearRange["1981_to_2000"].count++;
                    assessedValuesByYearRange["1981_to_2000"].totalValue += values[ind];
                } else if (yearsBuilt[ind] > 2000 && yearsBuilt[ind] <= 2020) {
                    assessedValuesByYearRange["2001_to_2020"].count++;
                    assessedValuesByYearRange["2001_to_2020"].totalValue += values[ind];
                }
            }
        });

        // Calculate proportion of each component
        const totalNum = assessedValuesByYearRange["1960_to_1980"].count + assessedValuesByYearRange["1981_to_2000"].count
                    + assessedValuesByYearRange["2001_to_2020"].count;
        const percentage1960to1980 = (assessedValuesByYearRange["1960_to_1980"].count / totalNum) * 100;
        const percentage1981to2000 = (assessedValuesByYearRange["1981_to_2000"].count / totalNum) * 100;
        const percentage2001to2020 = (assessedValuesByYearRange["2001_to_2020"].count / totalNum) * 100;

        let averageInRange = {
            '1960-1980': assessedValuesByYearRange["1960_to_1980"].totalValue / assessedValuesByYearRange["1960_to_1980"].count,
            '1981-2000': assessedValuesByYearRange["1981_to_2000"].totalValue / assessedValuesByYearRange["1981_to_2000"].count,
            '2001-2020': assessedValuesByYearRange["2001_to_2020"].totalValue / assessedValuesByYearRange["2001_to_2020"].count
        }
        // Create a pie chart to display house counts for each year range
        const ctx2 = document.getElementById('pieChart').getContext('2d');
        if(pieChart){
            pieChart.destroy();
        }
        pieChart = new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: ['1960-1980', '1981-2000', '2001-2020'],
                datasets: [{
                    label: 'House Count',
                    data: [percentage1960to1980, percentage1981to2000, percentage2001to2020],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)', // Red color
                        'rgba(54, 162, 235, 0.5)', // Blue color
                        'rgba(255, 206, 86, 0.5)' // Yellow color
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = '';
                                if (context.parsed.x === 0) {
                                    label = 'Actual Year Build: 1960-1980';
                                } else if (context.parsed.x === 1) {
                                    label = 'Actual Year Build: 1981-2000';
                                } else if (context.parsed.x === 2) {
                                    label = 'Actual Year Build: 2001-2020';
                                }
                                const range = context.label;
                                const avg = averageInRange[range];
                                const percentage = context.parsed.toFixed(2) + '%';
                                // Now `avg` will correctly reflect the value for the hovered year range
                                return [`${label}`, `Num of Properties Count in Percentage: ${percentage}`, `Average Assessed Value: CA$${avg.toLocaleString()}`];
                            }
                        }
                    }
                }
            }
        });
    }
});