if (window.location.href.startsWith("https://racenet.com/ea_sports_wrc/")) {
    function exportTableToCSV() {
        const data = [];
        let wait_counter = 0;

        function processData() {
            // console.log('processData()');

            let csvContent = "Rank,DisplayName,Vehicle,Time,TimePenalty,DifferenceToFirst\n"

            data.forEach((row) => {
                csvContent += row.join(",") + "\n"
            })

            const blob = new Blob([csvContent], {type: "text/csv;charset=utf-16;"})
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = "table_data.csv"
            a.click()
            URL.revokeObjectURL(url)
        }

        function waitForTable() {
            // console.log('waitForTable()');

            wait_counter = wait_counter + 1;
            if (wait_counter > 20) {
                alert('Таблица долго не грузится, mission failed. Ну или вы стартуете скрипт а таблица не на первой странице.');
                return;
            }
            const table = document.querySelector("table");
            const rows = table.querySelectorAll("tr");

            let ready = false;

            if (data.length == 0) {
                ready = true;
            } else if (rows.length > 0) {
                const row = rows[1];
                lastpos = parseInt(data.at(-1)[0]);
                const cells = row.querySelectorAll("td")
                // console.log('lastpos=' + lastpos
                //    + ', rows.length=' + (rows.length)
                //    + ', cells.length=' + (cells.length));
                if (cells.length > 1) {
                    const pos = cells[0].querySelector("p").innerText.trim().split('.')[0]
                    // console.log('pos=' + pos);
                    if (parseInt(pos) == lastpos + 1) {
                        ready = true;
                    }
                }
            }
            // console.log('ready=' + ready);
            if (ready) {
                processOnePage();
            } else {
                setTimeout(waitForTable, 300);
            }
        }

        function processOnePage() {
            // console.log('processOnePage()');

            const table = document.querySelector("table");
            const rows = table.querySelectorAll("tr");

            let i = 0;
            let lastpos = 0;
            if (data.length > 0) {
                lastpos = parseInt(data.at(-1)[0]);
            }
            // console.log('last pos ' + lastpos);

            rows.forEach((row, index) => {
                // console.log('index ' + index);

                if (index % 2 === 0) return;
                
                const cells = row.querySelectorAll("td");

                if (cells.length ===8) {
                    const pos      = cells[0].querySelector("p").innerText.trim().split('.')[0];
                    const name     = cells[1].querySelector("p").innerText.trim().replace(/\*$/, '');
                    const carModel = cells[2].querySelector("p").innerText.trim();
                    const penalty  = cells[4].querySelector("p").innerText.trim();
                    const time     = cells[5].querySelector("p").innerText.trim();
                    const timeDiff = cells[6].querySelector("p").innerText.trim();

                    i = i+1;
                    const posInt = parseInt(pos);
                    // console.log('i=' + i + ', lastpos=' + lastpos + ', posInt=' + posInt);
                    if (i <= 20 && lastpos + 1 == posInt) {
                        // console.log('data pushed');
                        data.push([pos, name, carModel, time, penalty, timeDiff]);
                        lastpos = posInt;
                    }
                } else {
                    alert("Размер окна недостаточен для отображения всех данных в таблице");
                    return;
                }

            })

            const container = table.parentNode.parentNode;
            const footer = ( container.children.length == 5 ? container.children[4] : container.children[2] );
            if (footer.children.length == 3) { // means we have buttons
                const btn = footer.children[1].children[0].children[1];
                if (btn.style.opacity == 1) {
                    btn.click();
                    wait_counter = 0;
                    setTimeout(waitForTable, 300);
                    return;
                }
            }

            processData();
        }

        processOnePage();
    }

    exportTableToCSV();
    
} else {
    console.error("Расширение работает только на сайте https://racenet.com/ea_sports_wrc/")
}
