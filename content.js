if (window.location.href.startsWith("https://racenet.com/ea_sports_wrc/")) {
    function exportTableToCSV() {
        const table = document.querySelector("table")
        const rows = table.querySelectorAll("tr")
        const data = []

        rows.forEach((row, index) => {
            if (index % 2 === 0) return
            
            const cells = row.querySelectorAll("td")

            if (cells.length ===8) {
                const pos = cells[0].querySelector("p").innerText.trim().split('.')[0]
                const name = cells[1].querySelector("p").innerText.trim()
                const carModel = cells[2].querySelector("p").innerText.trim()
                const penalty = cells[4].querySelector("p").innerText.trim()
                const time = cells[5].querySelector("p").innerText.trim()
                const timeDiff = cells[6].querySelector("p").innerText.trim()
    
                data.push([pos, name, carModel, time, penalty, timeDiff])
            }

           
        })

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

    exportTableToCSV()
    
} else {
    console.error("Расширение работает только на сайте https://racenet.com/ea_sports_wrc/")
}