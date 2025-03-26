// ==UserScript==
// @name         EA WRC Racenet Data Export
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Downloads results data from Racenet EA WRC Championship.
// @author       Ivan Tishchenko, Yandulov Andrey, Zatenatskiy Denis
// @match        https://racenet.com/ea_sports_wrc/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    function parseTimeToSeconds(timeString) {
        // Regular expression to match [HH:]MM:SS.ddd format
        const timeRegex = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})\.(\d{3})$/;

        const match = timeString.match(timeRegex);

        if (match) {
            const hours = match[1] ? parseInt(match[1], 10) : 0; // Hours are optional
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);
            const milliseconds = parseInt(match[4], 10);

            // Calculate total seconds as a float
            const totalSeconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;

            return totalSeconds;
        } else {
            // return NaN;
            throw new Error("Invalid time format");
        }
    }

    function current_stage() {
        let stages = document.getElementsByClassName('swiper-horizontal')[1].getElementsByClassName('swiper-slide')
        let name = '';
        for (let s of stages) {
            let style = s.children[0].style['background-color'];
            if (style == 'rgb(52, 113, 233)') {
                name = s.innerText;
                break;
            }
        }

        if (!name) {
            return 'S'
        }

        let n = parseInt(name.slice(1));
        if (isNaN(n)) {
            return ''
        }

        let prefix = 'S';
        if (n < 10) {
            prefix += '0';
        }

        return prefix + n.toString()
    }

    function save_as_json(data) {
        const blob = new Blob([JSON.stringify(data, null, 4)], {type: "application/json"})
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'wrc_data.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    function save_stage_as_csv(stage_data) {
        let csvContent = "Rank,DisplayName,Vehicle,Time,TimePenalty,DifferenceToFirst\n";

        stage_data.forEach((row) => {
            csvContent += [row.position, row.name, row.car, row.time,
                           row.penalty, row.timeDiff].join(",") + "\n"
        });

        const blob = new Blob([csvContent], {type: "text/csv;charset=utf-16;"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stage.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function save_round_as_csv(data) {
        let csvContent = "Stage,Rank,DisplayName,Vehicle,Time,TimePenalty,DifferenceToFirst,Distance,Velocity\n";

        data.stages.forEach((stage) => {
            stage.results.forEach((row) => {
                csvContent += [stage.name,row.position, row.name, row.car,
                               row.time, row.penalty, row.timeDiff,
                               stage.length, row.speed
                               ].join(",") + "\n"
            })
        });

        const blob = new Blob([csvContent], {type: "text/csv;charset=utf-16;"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'round.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function parseRow(row) {
        const cells = row.querySelectorAll("td");

        return {
            'position': parseInt(cells[0].querySelector("p").innerText.trim().split('.')[0]),
            'name': cells[1].querySelector("p").innerText.trim().replace(/\*$/, ''),
            'car': cells[2].querySelector("p").innerText.trim(),
            'penalty': cells[4].querySelector("p").innerText.trim(),
            'time': cells[5].querySelector("p").innerText.trim(),
            'timeDiff': cells[6].querySelector("p").innerText.trim(),
        }
    }

    function downloadData(format, is_extended) {

        if (format != 'round_json' && format != 'stage_csv' && format != 'round_csv') {
            throw new Error("Invalid parameters");
        }

        if (format == 'stage_csv' && is_extended) {
            throw new Error("Invalid parameters");
        }

        const data = {
            type: 'wrc_exporter',
            stages: [{
                name: '',
                results: [],
            }],
        }
        let stages = document.getElementsByClassName('swiper-horizontal')[1].getElementsByClassName('swiper-slide');
        let limit = stages.length;

        function parseTable(stage_id, is_totals) {
            if (!data.stages[stage_id].name) {
                data.stages[stage_id].name = current_stage();
            }

            const table = document.querySelector("table");
            const rows = table.querySelectorAll("tr");

            let len = 0;
            if (is_extended) {
                if (!is_totals) {
                    // find stage length on the page
                    const lengthP = document.evaluate('//p[text()="Length:"]',
                            document, null, XPathResult.FIRST_ORDERED_NODE_TYPE,
                            null).singleNodeValue.nextElementSibling.nextElementSibling;
                    len = lengthP.innerHTML.trim().split('\n')[0].trim();
                    if (!len.endsWith('km')) {
                        alert("Racenet поменял структуру страницы, скрипт требуется обновить. Длина допов и скорость не будет включена в экспорт.")
                        len = 0;
                    } else {
                        len = len.slice(0, -2).trim();
                        len = parseFloat(len);
                        data.stages[stage_id].length = len;
                    }
                } else {
                    // calculate total length sum over all stages
                    for (let i = 0; i < data.stages.length - 1; i++) {
                        len += data.stages[i].length;
                    }
                    data.stages[stage_id].length = len;
                }
            }

            rows.forEach((row, index) => {
                if (index % 2 === 0) {
                    return
                }

                let go_to_position_btn = document.evaluate(".//button[text()='Go To Position']",
                    row, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (go_to_position_btn == null) {
                    const cells = row.querySelectorAll("td");
                    if (cells.length === 8) {
                        let d = parseRow(row);
                        if (is_extended) {
                            d.speed = Math.round(10 * len / (parseTimeToSeconds(d.time)/3600.0)) / 10.0;
                        }
                        data.stages[stage_id].results.push(d);
                    } else {
                        if (index == 1) {
                            alert("Размер окна недостаточен для отображения всех данных в таблице");
                        }
                    }
                }
            })

            const container = table.parentNode.parentNode;
            const footer = ( container.children.length == 5 ? container.children[4] : container.children[2] );
            if (footer.children.length == 3) { // means we have buttons
                const btn = footer.children[1].children[0].children[1];
                if (btn.style.opacity == 1) {
                    btn.click(); // Go to next page
                    setTimeout(function(){
                        parseTable(stage_id, is_totals)
                    }, 1000);
                    return;
                } 
            }

            if (stage_id+1 < limit) {
                if (format == 'round_json' || format == 'round_csv') {
                    // Go to next stage
                    stages[stage_id+1].click()
                    data.stages.push({
                        name: '',
                        results: [],
                    })
                    setTimeout(function(){
                        parseTable(stage_id+1, false);
                    }, 1000)
                    return
                } else if (format == 'stage_csv') {
                    // just dump the current data as csv
                    save_stage_as_csv(data.stages[0].results);
                    return;
                } else {
                    throw new Error("Invalid parameters");
                }
            } else {
                // download totals
                let stage_btn = document.evaluate("//*[text()='Stage' and contains(@class,'MuiTypography-root')]",
                    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                let overall_btn = document.evaluate("//*[text()='Overall' and contains(@class,'MuiTypography-root')]",
                    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (overall_btn.parentNode.style.backgroundColor == "transparent") {
                    if (stage_btn.parentNode.style.backgroundColor != "transparent") {
                        overall_btn.click();
                        data.stages.push({
                            name: 'overall',
                            results: [],
                        })
                        setTimeout(function(){
                            parseTable(stage_id+1, true);
                        }, 1000);
                        return;
                    }
                    alert("Racenet поменял структуру страницы, скрипт требуется обновить. Overall не будет включён в экспорт.")
                }
            }

            if (format == 'round_json') {
                save_as_json(data);
            } else if (format == 'round_csv') {
                save_round_as_csv(data);
            } else {
                throw new Error("Invalid parameters");
            }
        }

        console.log(current_stage());
        parseTable(0, false);
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    // UI

    // Create the overlay panel
    const panel = document.createElement('div');
    panel.id = 'myOverlayPanel';
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    panel.style.padding = '10px';
    panel.style.border = '1px solid #ccc';
    panel.style.zIndex = '9999';

    // Create the buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'none'; // Initially hidden

    const button1 = document.createElement('button');
    button1.textContent = 'Basic JSON of all Stages';
    button1.style.marginRight = '10px';
    button1.addEventListener('click', () => {
        downloadData('round_json', false);
    });

    const button2 = document.createElement('button');
    button2.textContent = 'Extended JSON of all Stages';
    button2.style.marginRight = '10px';
    button2.addEventListener('click', () => {
        downloadData('round_json', true);
    });

    const button3 = document.createElement('button');
    button3.textContent = 'Selected Stage CSV';
    button3.style.marginRight = '10px';
    button3.addEventListener('click', () => {
        downloadData('stage_csv', false);
    });

    const button4 = document.createElement('button');
    button4.textContent = 'All Stages CSV';
    button4.style.marginRight = '10px';
    button4.addEventListener('click', () => {
        downloadData('round_csv', true);
    });

    const button_hide = document.createElement('button');
    button_hide.textContent = 'Hide';

    // Create the unminimize button
    const unminimizeButton = document.createElement('button');
    unminimizeButton.textContent = 'DL';
    unminimizeButton.addEventListener('click', () => {
        panel.style.width = 'auto';
        panel.style.height = 'auto';
        buttonsContainer.style.display = 'flex';
        unminimizeButton.style.display = 'none';
    });

    // Append buttons to the container
    buttonsContainer.appendChild(button1);
    buttonsContainer.appendChild(button2);
    buttonsContainer.appendChild(button3);
    buttonsContainer.appendChild(button4);
    buttonsContainer.appendChild(button_hide);

    // Append the container and unminimize button to the panel
    panel.appendChild(buttonsContainer);
    panel.appendChild(unminimizeButton);

    // Append the panel to the body
    document.body.appendChild(panel);

    // Minimize the panel by default
    panel.style.width = '50px';
    panel.style.height = '20px';

    // Add minimize functionality
    function hide_panel(event) {
        if (event.target !== unminimizeButton && buttonsContainer.style.display !== 'none') {
            panel.style.width = '50px'; // Minimize width
            panel.style.height = '20px'; // Minimize height
            buttonsContainer.style.display = 'none';
            unminimizeButton.style.display = 'block';
        }
    }

    panel.addEventListener('click', hide_panel);
    button_hide.addEventListener('click', hide_panel);

    // Add some styling using GM_addStyle
    GM_addStyle(`
        #myOverlayPanel button {
            padding: 8px 12px;
            background-color: #4CAF50;
            color: white;
            border: none;
            cursor: pointer;
        }

        #myOverlayPanel button:hover {
            background-color: #3e8e41;
        }
    `);
})();
