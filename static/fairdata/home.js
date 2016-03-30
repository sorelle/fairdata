home = {};

home.upload_file = function() {
    var file = $("#file").get(0).files[0];
    var fd = new FormData();
    fd.append("file", file);
    
    var csrftoken = $.cookie('csrftoken');

//	console.log(csrftoken);

    $.ajax({
        type: "POST",
        url: "/accept_file/",
        dataType: "json",
        data: fd,
        headers: {"X-CSRFToken": csrftoken},
        cache: false,
        contentType: false,
        processData: false,
        success: function(data) {
            if (!data["valid"]) {
                alert(data["reason"]);
                return;
            }
            result = data["result"];
            home.file_id = result["id"];
            home.cols = result["cols"];

            $("#col-typing").empty();

	    //DEREK'S FORM STUFF
	    $("#col-typing").css({"font-family":"Sintony, sans-serif", "font-size":"1.3em", "font-weight":"400", "text-align":"inline"});
	    $("#col-typing").append("<br>Which column is your outcome column (<i>i.e. yes/no</i>)?<br>");
	    $("#col-typing").append(home.new_dropdown(false, "outcome"));

	    $("#col-typing").append("What is the outcome value you are looking for (<i>i.e. true</i>)?<br>");
	    $("#col-typing").append("<input type=\"text\" id=\"outcome_positive\"><br><br>");

	    $("#col-typing").append("Which columns are identifiers (<i>i.e. irrelevant to the classifier</i>)?<br>");
	    $("#col-typing").append(home.new_dropdown(true, "ids"));
	    $("#col-typing").append("Which columns contain information that could be used to discriminate?<br>");
	    $("#col-typing").append(home.new_dropdown(false, "protected"));

	    $("#col-typing").append("What aspect of the protected class are you examining (<i>i.e. Hispanic</i>)?<br>");
	    $("#col-typing").append("<input type=\"text\" id=\"protected_positive\"><br><br>")
	    
	    button_div = document.createElement("div");
	    button_div.setAttribute("class","submit");
	    button_div.setAttribute("align","center");

	    button = document.createElement("input");
            button.setAttribute("type","button");
	    button.setAttribute("class","form-control");
	    button.setAttribute("value","Submit");
	    button.setAttribute("onClick","home.col_class()");

	    button_div.appendChild(button);
	    $("#col-typing").append(button_div);

            $("#col-typing").fadeIn();     
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log(jqXHR);
         alert("Failed to upload file.");
        }
    });
}

home.new_dropdown = function(mult, id) {
    dropdown_form = document.createElement("form");
    select = document.createElement("select");
    select.setAttribute("class","dropdown");
    select.setAttribute("id",id);

    if(mult) {
	select.setAttribute("multiple","multiple");
    }

    $.each(home.cols, function(index, col_name) {
	new_option = document.createElement("OPTION");
	text = document.createTextNode(col_name);
	new_option.appendChild(text);
	new_option.setAttribute("value", col_name);
	select.appendChild(new_option);
    });		
    
    dropdown_form.appendChild(select);
    return dropdown_form;
}

home.color = function(i) {
    //              red       orange    yellow  lt green    green
    var colors = ["#ff0000","#ff8000","#ffff00","#80ff00","#00ff00"];

    if(i <= 0.7)            { return colors[0]; };
    if(i > 0.7 && i <= 0.8) { return colors[1]; };
    if(i > 0.8 && i <= 0.9) { return colors[2]; };
    if(i > 0.9 && i < 1)    { return colors[3]; };
    if(i == 1)              { return colors[4]; }; 
}

home.col_class = function() {
    var outcome = [$("#outcome :selected").val()];

    var ids = [];
    $("#ids :selected").each(function(index) {
	ids.push($(this).val());
    });

    var protect = [$("#protected :selected").val()];
    //$("#protected :selected").each(function(index) {
//	protect.push($(this).val());
 //   });

    // positive value (ex: true, 1, hired) as string
    var outcome_positive = $("#outcome_positive").val();
    
    // value being looked at for protected column (ex: asian)
    var protected_positive = $("#protected_positive").val();

   // outcome.push(outcome_positive);
   // protect.push(protected_positive);

    var input_csv = "/../media/user_uploads/" + home.file_id + ".csv";
    var out_csv = "/graph_csvs/" + home.file_id + ".csv"; 

    // run main.py
    $.ajax({
        type: "GET",
        url: "/fairdata/run_script/",
	data: {'in_path': input_csv,
		'protected': protect,
		'protected_pos': protected_positive,
		'selected': outcome,
		'selected_pos': outcome_positive,
		'out_path': out_csv}, 
        success: function(response) {
		alert(response);
		}
	});

    // TOTAL GRAPH 
    var margin = {top: 20, right: 40, bottom: 60, left: 70},
	width = 1100 - margin.left - margin.right,
	height = 100 - margin.top - margin.bottom;
    var barHeight = 10;

    var x = d3.scale.linear()
	.range([0, width]);

    var xAxis = d3.svg.axis()
	.scale(x)
	.orient("bottom").ticks(4).tickSize(0);

    var graph = d3.select("#total-graph").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.append("g")
	  .attr("transform","translate(" + margin.left + "," + margin.top + ")");

    

    //d3.csv("/fairdata" + out_csv, function(data) {
    d3.csv("/static/fairdata/sampledata.csv", function(data) {

	d3.select("#overall-fairness").text("Overall Fairness");
	d3.select("#percentage").text("Your data is " + JSON.stringify(data[0]["Ratio"]*100) + "% fair.");

	var y = d3.scale.ordinal()
	  .rangeRoundBands([0, barHeight * data.length], .1);
	var yAxis = d3.svg.axis()
	  .scale(y)
	  .orient("left").tickSize(0);

	var bar = graph.selectAll("g")
	  .data(data)
	  .enter().append("g")
	  .attr("transform", "translate(0," + barHeight - 30 + ")");

        bar.append("rect")
	  .attr("fill", home.color(data[0]["Ratio"]))
	  .attr("width", x(data[0]["Ratio"]))
          .attr("height", barHeight);

	graph.append("g")
	  .attr("class","x-axis")
	  .attr("transform", "translate(0," + barHeight + ")")
	  .call(xAxis);

	graph.append("g")
	  .attr("class","y-axis")
	  .style("text-anchor","end");
	//  .call(yAxis);

	graph.selectAll("line")
            .attr("stroke","black")
            .attr("fill","none");
        graph.selectAll("path")
            .attr("fill","none")
            .attr("stroke","black")
            .attr("shape-rendering","crispEdges");	
	
    });

    // CATEGORY GRAPH
    d3.select("#scores-by-category").text("Scores by Category");

    margin.left = 70;
    width = 1100 - margin.left - margin.right,
    height = 360 - margin.top - margin.bottom;
    barHeight = 40;
    
    var graph2 = d3.select("#category-graph").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
	.append("g")
	  .attr("transform","translate("+margin.left +"," + margin.top + ")");

    d3.csv("/static/fairdata/sampledata.csv", function(data) {
	d3.select("#scores-by-categery").text("Scores by Category");
	data.shift();
	
	var y = d3.scale.ordinal()
	  .rangeRoundBands([0, barHeight * data.length], .1);

	var yAxis = d3.svg.axis()
	  .scale(y)
	  .orient("left").tickSize(0);

	y.domain(home.cols);

	graph2.attr("height", barHeight*data.length);

	var bar = graph2.selectAll("g")
	  .data(data)
	  .enter().append("g")
	  .attr("transform",function(d,i) { return "translate(0," + i*barHeight+ ")" });	

	bar.append("rect")
	  .attr("fill", function(d) { return home.color(d.Ratio); })
	  .attr("width",function(d) { return x(d.Ratio); })
	  .attr("height", barHeight - 1);

	bar.append("text")
	  .attr("x", function(d) { return x(d.Ratio); })
	  .attr("y", barHeight/2)
	  .attr("dy",".35em")
	  .text(function(d) { return (d.Ratio*100)+"%"});

	graph2.append("g")
	  .attr("class","x-axis")
	  .attr("transform","translate(0," + barHeight * data.length + ")")
	  .call(xAxis);

	graph2.append("g")
	  .attr("class","y-axis")
	  .style("text-anchor","end")
	  .call(yAxis);

	graph2.selectAll("line")
            .attr("stroke","black")
            .attr("fill","none");
        graph2.selectAll("path")
            .attr("fill","none")
            .attr("stroke","black")
            .attr("shape-rendering","crispEdges");
    });
}

function type(d) {
    d.value = +d.value;
    return d;
}

home.sanity_check = function(col_types, stratify_cols) {
    if (stratify_cols.length < 1) {
        alert("Please choose at least one Stratify column.");
        return false;
    }
    var num_class_cols = 0;
    $.each(col_types, function(i, val) {
        if (val == "C") { num_class_cols += 1; }
    });
    if (num_class_cols != 1) {
        alert("Please choose exactly one Class column.");
        return false;
    }
    return true;
}

$(function() {
    $("#bgtoggle").click(function() {
        $("#background-content").toggle();
    });
});
