define('colors', function () {
    const blueBorderColor = "rgba(100, 100, 255, 0.8)";
    const orangeBorderColor = "rgba(255, 150, 0, 0.8)";

    const chartColors = {
        "blue": [
            {
                backgroundColor: "rgba(29, 53, 224, 0.4)",
                borderColor: blueBorderColor,
                borderWidth: 1
            },
            {
                backgroundColor: "rgba(1, 115, 214, 0.4)",
                borderColor: blueBorderColor,
                borderWidth: 1
            },
            {
                backgroundColor: "rgba(0, 222, 121, 0.4)",
                borderColor: blueBorderColor,
                borderWidth: 1
            },
            {
                backgroundColor: "rgba(0, 211, 204, 0.4)",
                borderColor: blueBorderColor,
                borderWidth: 1
            }
        ],
        "orange": [
            {
                backgroundColor: "rgba(221, 240, 41, 0.4)",
                borderColor: orangeBorderColor,
                borderWidth: 1
            },
            {
                backgroundColor: "rgba(255, 108, 0, 0.4)",
                borderColor: orangeBorderColor,
                borderWidth: 1
            },
            {
                backgroundColor: "rgba(255, 0, 128, 0.4)",
                borderColor: orangeBorderColor,
                borderWidth: 1
            },
            {
                backgroundColor: "rgba(251, 50, 60, 0.4)",
                borderColor: orangeBorderColor,
                borderWidth: 1
            }
        ]
    };

    function getHorizontaChartColor(index, is_orange) {
        var list = is_orange ? chartColors.orange : chartColors.blue;
        return list[index % list.length];
    }

    function getLineColor() {
        return "rgba(32, 45, 21, 0.3)";
    }

    return {
        getHorizontaChartColor: getHorizontaChartColor,
        getLineColor: getLineColor
    }
});
