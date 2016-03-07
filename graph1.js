var graph = {
    feeds:[],
    
    config: {
        name: "",
        timeWindow: 3600000*24.0*7,
        floating: 1,
        start:0,
        end:0,
        feedlist: []
    },

    start:0,
    end:0,
    interval:0,
    npoints:600,
    skipmissing:0,
    limitinterval:1,
    showcsv:0,
    data:[],

    mean: 0,
    stdev: 0,
    minval: 0,
    maxval: 0,
    
    fixinterval: 0,
    showmissing: 0,
    
    init: function()
    {

        $.ajax({                                      
            url: path+"/feed/list.json",
            async: false,
            dataType: "json",
            success: function(data_in) {
                graph.feeds = data_in;
                
                var out = "";
                for (z in graph.feeds) {
                   out += "<tr>";
                   var name = graph.feeds[z].name;
                   if (name.length>20) {
                       name = name.substr(0,20)+"..";
                   }
                   out += "<td>"+name+"</td>";
                   out += "<td><input class='feed-select-left' feedid="+graph.feeds[z].id+" type='checkbox'></td>";
                   out += "<td><input class='feed-select-right' feedid="+graph.feeds[z].id+" type='checkbox'></td>";
                   out += "</tr>";
                }
                $("#feeds").html(out);
            }
        });
        
        for (var z in graph.config.feedlist) {
            var feedid = graph.config.feedlist[z].id;
            if (graph.config.feedlist[z].yaxis==1) $(".feed-select-left[feedid="+feedid+"]")[0].checked = true;
            if (graph.config.feedlist[z].yaxis==2) $(".feed-select-right[feedid="+feedid+"]")[0].checked = true;
        }
    
        var timeWindow = graph.config.timeWindow;
        if (graph.config.floating) {
            var now = Math.round(+new Date * 0.001)*1000;
            graph.start = now - timeWindow;
            graph.end = now;
        } else {
            graph.start = graph.config.start;
            graph.end = graph.config.end;
        }
        graph.calc_interval();

        $("#graph_zoomout").click(function () {graph.zoomout(); graph.reloaddraw();});
        $("#graph_zoomin").click(function () {graph.zoomin(); graph.reloaddraw();});
        $('#graph_right').click(function () {graph.panright(); graph.reloaddraw();});
        $('#graph_left').click(function () {graph.panleft(); graph.reloaddraw();});
        $('.graph_time').click(function () {
            graph.timewindow($(this).attr("time")); graph.reloaddraw();
        });
        
        $('#placeholder').bind("plotselected", function (event, ranges)
        {
            graph.start = ranges.xaxis.from;
            graph.end = ranges.xaxis.to;
            graph.calc_interval();
            
            graph.reloaddraw();
        });
        
        $("#reload").click(function(){
            graph.start = $("#request-start").val()*1000;
            graph.end = $("#request-end").val()*1000;
            graph.interval = $("#request-interval").val();
            graph.limitinterval = $("#request-limitinterval")[0].checked*1;
            
            graph.reloaddraw();
        });
        
        $("#showcsv").click(function(){
            if ($("#showcsv").html()=="Show CSV Output") {
                graph.printcsv()
                graph.showcsv = 1;
                $("#csv").show();
                $(".csvoptions").show();
                $("#showcsv").html("Hide CSV Output");
            } else {
                graph.showcsv = 0;
                $("#csv").hide();
                $(".csvoptions").hide();
                $("#showcsv").html("Show CSV Output");
            }
        });
        $(".csvoptions").hide();
        
        $("body").on("change",".smoothing",function(){
            var feedid = $(this).attr("feedid");
            
            for (z in graph.config.feedlist) {
                if (graph.config.feedlist[z].id==feedid) {
                    graph.config.feedlist[z].smoothing = $(this).val();
                    break;
                }
            }
            graph.draw();
        });
        
        $("body").on("click",".histogram",function(){
            $("#navigation").hide();
            $("#histogram-controls").show();
            var feedid = $(this).attr("feedid");
            graph.active_histogram_feed = feedid;
            var type = $("#histogram-type").val();
            var resolution = 1;
            
            var index = 0;
            for (z in graph.config.feedlist) {
              if (graph.config.feedlist[z].id==feedid) {
                index = z;
                break;
              }
            }
            
            if (graph.config.feedlist[index].stats.diff<5000) resolution = 10;
            if (graph.config.feedlist[index].stats.diff<100) resolution = 0.1;
            $("#histogram-resolution").val(resolution);
            
            graph.histogram(feedid,type,resolution);
        });
        
        $("#histogram-resolution").change(function(){
            var type = $("#histogram-type").val();
            var resolution = $("#histogram-resolution").val();
            graph.histogram(graph.active_histogram_feed,type,resolution);
        });
        
        $("#histogram-type").change(function(){
            var type = $("#histogram-type").val();
            var resolution = $("#histogram-resolution").val();
            graph.histogram(graph.active_histogram_feed,type,resolution);
        });
        
        $("#histogram-back").click(function(){
            $("#navigation").show();
            $("#histogram-controls").hide();
            graph.draw();
        });
        
        $("body").on("click",".feed-select-left",function(){
            var feedid = $(this).attr("feedid");
            var checked = $(this)[0].checked;
            
            var loaded = false;
            for (var z in graph.config.feedlist) {
               if (graph.config.feedlist[z].id==feedid) {
                   if (!checked) {
                       graph.config.feedlist.splice(z,1);
                   } else {
                       graph.config.feedlist[z].yaxis = 1;
                       loaded = true;
                       $(".feed-select-right[feedid="+feedid+"]")[0].checked = false;
                   }
               }
            }
            
            if (loaded==false && checked) graph.config.feedlist.push({id:feedid, yaxis:1, fill:0, smoothing:0, dp:1, plottype:'lines'});
            graph.reloaddraw();
        });
        
        $("body").on("click",".feed-select-right",function(){
            var feedid = $(this).attr("feedid");
            var checked = $(this)[0].checked;
            
            var loaded = false;
            for (var z in graph.config.feedlist) {
               if (graph.config.feedlist[z].id==feedid) {
                   if (!checked) {
                       graph.config.feedlist.splice(z,1);
                   } else {
                       graph.config.feedlist[z].yaxis = 2;
                       loaded = true;
                       $(".feed-select-left[feedid="+feedid+"]")[0].checked = false;
                   }
               }
            }
            
            if (loaded==false && checked) graph.config.feedlist.push({id:feedid, yaxis:2, fill:0, smoothing:0, dp:1, plottype:'lines'});
            graph.reloaddraw();
        });
        
        $("#showmissing").click(function(){
            graph.showmissing = $("#showmissing")[0].checked*1.0;
            graph.draw();
        });
        
        $("#request-fixinterval").click(function(){
            graph.fixinterval = $("#request-fixinterval")[0].checked*1.0;
            if (graph.fixinterval) {
                $("#request-interval").prop('disabled', true);
            } else {
                $("#request-interval").prop('disabled', false);
            }
        });
        
        $("body").on("change",".decimalpoints",function(){
            var feedid = $(this).attr("feedid");
            var dp = $(this).val();
            
            for (var z in graph.config.feedlist) {
                if (graph.config.feedlist[z].id == feedid) {
                    graph.config.feedlist[z].dp = dp;
                    
                    graph.draw();
                    break;
                }
            }
        });
        
        $("body").on("change",".plottype",function(){
            var feedid = $(this).attr("feedid");
            var plottype = $(this).val();
            
            for (var z in graph.config.feedlist) {
                if (graph.config.feedlist[z].id == feedid) {
                    graph.config.feedlist[z].plottype = plottype;
                    
                    graph.draw();
                    break;
                }
            }
        })
        
        
        $("#csvtimeformat").change(function(){
            graph.printcsv();
        });
        
        $("#csvnullvalues").change(function(){
            graph.printcsv();
        });
        

        $(window).resize(function(){
            var top_offset = 0;
            var placeholder_bound = $('#placeholder_bound');
            var placeholder = $('#placeholder');

            var width = placeholder_bound.width();
            var height = width * 0.5;

            placeholder.width(width);
            placeholder_bound.height(height);
            placeholder.height(height-top_offset);
            
            graph.draw();
        });
    },
    
    show: function() 
    {
        var top_offset = 0;
        var placeholder_bound = $('#placeholder_bound');
        var placeholder = $('#placeholder');

        var width = placeholder_bound.width();
        var height = width * 0.5;

        placeholder.width(width);
        placeholder_bound.height(height);
        placeholder.height(height-top_offset);
        
        graph.reloaddraw();
        
        $("#info").show();
    },
    
    hide: function() 
    {
    
    },
    
    reloaddraw: function() {
        graph.reload();
        graph.draw();
    },
      
    reload: function()
    {
        var feedlist = graph.config.feedlist;
        
        var errorstr = "";    
        
        for (var z in feedlist)
        {
            var request = path+"feed/data.json?id="+feedlist[z].id+"&start="+graph.start+"&end="+graph.end+"&interval="+graph.interval+"&skipmissing="+graph.skipmissing+"&limitinterval="+graph.limitinterval;
            
            $("#request-start").val(graph.start/1000);
            $("#request-end").val(graph.end/1000);
            $("#request-interval").val(graph.interval);
            // $("#request-skipmissing").attr("checked",app_graph.skipmissing);
            $("#request-limitinterval").attr("checked",graph.limitinterval);
            
            $.ajax({                                      
                url: request,
                async: false,
                dataType: "text",
                success: function(data_in) {
                
                    // 1) Check validity of json data, or show error
                    var valid = true;
                    try {
                        feedlist[z].data = JSON.parse(data_in);
                        if (feedlist[z].data.success!=undefined) valid = false;
                    } catch (e) {
                        valid = false;
                    }
                    
                    if (!valid) errorstr += "<div class='alert alert-danger'><b>Request error</b> "+data_in+"</div>";
                }
            });
        }
        
        if (errorstr!="") {
            $("#error").html(errorstr).show();
        } else {
            $("#error").hide();
        }
        
        graph.config.feedlist = feedlist;
    },
    
    draw: function()
    {
        var feedlist = graph.config.feedlist;

        var options = {
            lines: { fill: false },
            xaxis: { 
                mode: "time", timezone: "browser", 
                min: graph.start, max: graph.end
            },
			      yaxes: [ { }, {
					      // align if we are to the right
					      alignTicksWithAxis: 1,
					      position: "right",
					      //tickFormatter: euroFormatter
				    } ],
            grid: {hoverable: true, clickable: true},
            selection: { mode: "x" }
        }
        
        var time_in_window = (graph.end - graph.start) / 1000;
        var hours = Math.floor(time_in_window / 3600);
        var mins = Math.round(((time_in_window / 3600) - hours)*60);
        if (mins!=0) {
            if (mins<10) mins = "0"+mins;
        } else {
            mins = "";
        }
        
        $("#window-info").html("<b>Window:</b> "+graph.printdate(graph.start)+" > "+graph.printdate(graph.end)+"<br><b>Length:</b> "+hours+"h"+mins+" ("+time_in_window+" seconds)");
        
        var plotdata = [];
        for (var z in feedlist) {
            
            var data = feedlist[z].data;
            
            // Hide missing data (only affects the plot view)
            if (!graph.showmissing) {
                var tmp = [];
                for (var n in data) {
                    if (data[n][1]!=null) tmp.push(data[n]);
                }
                data = tmp;
            }
            // Series smoothing (only affects the plot view)
            if (feedlist[z].smoothing>0) data = graph.smooth(data,feedlist[z].smoothing);
            // Add series to plot
            
            var plot = {label:feedlist[z].id+":"+graph.getfeedname(feedlist[z].id), data:data, yaxis:feedlist[z].yaxis};
            
            if (feedlist[z].plottype=='lines') plot.lines = { show: true, fill: false };
            if (feedlist[z].plottype=='bars') plot.bars = { show: true, barWidth: graph.interval * 1000 * 0.75 };
            plotdata.push(plot);
        }
        $.plot($('#placeholder'), plotdata, options);
        
        for (var z in feedlist) {
            feedlist[z].stats = graph.stats(feedlist[z].data);
        }
        
        var out = "";
        for (var z in feedlist) {
            var dp = feedlist[z].dp;
        
            var apiurl = path+"feed/data.json?id="+feedlist[z].id+"&start="+graph.start+"&end="+graph.end+"&interval="+graph.interval+"&skipmissing="+graph.skipmissing+"&limitinterval="+graph.limitinterval;
         
            out += "<tr>";
            out += "<td>"+feedlist[z].id+":"+graph.getfeedname(feedlist[z].id)+"</td>";
            out += "<td><select class='plottype' feedid="+feedlist[z].id+" style='width:80px'><option value='lines'>Lines</option><option value='bars'>Bars</option></select></td>";
            var quality = Math.round(100 * (1-(feedlist[z].stats.npointsnull/feedlist[z].stats.npoints)));
            out += "<td>"+quality+"% ("+(feedlist[z].stats.npoints-feedlist[z].stats.npointsnull)+"/"+feedlist[z].stats.npoints+")</td>";
            out += "<td>"+feedlist[z].stats.minval.toFixed(dp)+"</td>";
            out += "<td>"+feedlist[z].stats.maxval.toFixed(dp)+"</td>";
            out += "<td>"+feedlist[z].stats.diff.toFixed(dp)+"</td>";
            out += "<td>"+feedlist[z].stats.mean.toFixed(dp)+"</td>";
            out += "<td>"+feedlist[z].stats.stdev.toFixed(dp)+"</td>";
            out += "<td><select feedid="+feedlist[z].id+" class='smoothing' style='width:50px'>";
            for (var i=0; i<11; i++) out += "<option>"+i+"</option>";
            out += "</select></td>";
            out += "<td><select feedid="+feedlist[z].id+" class='decimalpoints' style='width:50px'><option>0</option><option>1</option><option>2</option><option>3</option></select></td>";
            out += "<td><button feedid="+feedlist[z].id+" class='histogram'>Histogram <i class='icon-signal'></i></button></td>";
            out += "<td><a href='"+apiurl+"'><button class='btn btn-link'>API REF</button></a></td>";
            out += "</tr>";
        }
        $("#stats").html(out);
        
        for (var z in feedlist) {
            $(".smoothing[feedid="+feedlist[z].id+"]").val(feedlist[z].smoothing);
            $(".decimalpoints[feedid="+feedlist[z].id+"]").val(feedlist[z].dp);
        }
        
        graph.config.feedlist = feedlist;
        if (graph.showcsv) graph.printcsv();
    },
    
    printcsv: function()
    {
        var timeformat = $("#csvtimeformat").val();
        var nullvalues = $("#csvnullvalues").val();
        
        
        var feedlist = graph.config.feedlist;
        var csvout = "";

        var value = [];
        var lastvalue = [];
        var start_time = feedlist[0].data[0][0];
        for (var z in feedlist[0].data) {
            var line = [];
            // Different time format options for csv output
            if (timeformat=="unix") {
                line.push(Math.round(feedlist[0].data[z][0] / 1000));
            } else if (timeformat=="seconds") {
                line.push(Math.round((feedlist[0].data[z][0]-start_time)/1000));
            } else if (timeformat=="datestr") {
                // Create date time string
                var t = new Date(feedlist[0].data[z][0]);
                var year = t.getFullYear();
                var month = t.getMonth()+1;
                if (month<10) month = "0"+month;
                var day = t.getDate();
                if (day<10) day = "0"+day;
                var hours = t.getHours();
                if (hours<10) hours = "0"+hours;
                var minutes = t.getMinutes();
                if (minutes<10) minutes = "0"+minutes;
                var seconds = t.getSeconds();
                if (seconds<10) seconds = "0"+seconds;
                
                var formatted = year+"-"+month+"-"+day+" "+hours+":"+minutes+":"+seconds;
                line.push(formatted);
            }
            

            var nullfound = false;
            for (var f in feedlist) {
                if (value[f]==undefined) value[f] = null;
                lastvalue[f] = value[f];
                if (feedlist[f].data[z][1]==null) nullfound = true;
                if (feedlist[f].data[z][1]!=null || nullvalues=="show") value[f] = feedlist[f].data[z][1];
                if (value[f]!=null) value[f] = (value[f]*1.0).toFixed(feedlist[f].dp);
                line.push(value[f]+"");
            }
            
            if (nullvalues=="remove" && nullfound) {
                // pass
            } else { 
                csvout += line.join(", ")+"\n";
            }
        }
        $("#csv").val(csvout);
    },
    
    // View functions
    
    'zoomout':function ()
    {
        var time_window = graph.end - graph.start;
        var middle = graph.start + time_window / 2;
        time_window = time_window * 2;
        graph.start = middle - (time_window/2);
        graph.end = middle + (time_window/2);
        graph.calc_interval();
    },

    'zoomin':function ()
    {
        var time_window = graph.end - graph.start;
        var middle = graph.start + time_window / 2;
        time_window = time_window * 0.5;
        graph.start = middle - (time_window/2);
        graph.end = middle + (time_window/2);
        graph.calc_interval();
    },

    'panright':function ()
    {
        var time_window = graph.end - graph.start;
        var shiftsize = time_window * 0.2;
        graph.start += shiftsize;
        graph.end += shiftsize;
        graph.calc_interval();
    },

    'panleft':function ()
    {
        var time_window = graph.end - graph.start;
        var shiftsize = time_window * 0.2;
        graph.start -= shiftsize;
        graph.end -= shiftsize;
        graph.calc_interval();
    },

    'timewindow':function(time)
    {
        graph.start = ((new Date()).getTime())-(3600000*24*time);	//Get start time
        graph.end = (new Date()).getTime();	//Get end time
        graph.calc_interval();
    },
    
    'calc_interval':function()
    {
        var interval = Math.round(((graph.end - graph.start)/graph.npoints)/1000);
        
        var outinterval = 5;
        if (interval>10) outinterval = 10;
        if (interval>15) outinterval = 15;
        if (interval>20) outinterval = 20;
        if (interval>30) outinterval = 30;
        if (interval>60) outinterval = 60;
        if (interval>120) outinterval = 120;
        if (interval>180) outinterval = 180;
        if (interval>300) outinterval = 300;
        if (interval>600) outinterval = 600;
        if (interval>900) outinterval = 900;
        if (interval>1200) outinterval = 1200;
        if (interval>1800) outinterval = 1800;
        if (interval>3600*1) outinterval = 3600*1;
        if (interval>3600*2) outinterval = 3600*2;
        if (interval>3600*3) outinterval = 3600*3;
        if (interval>3600*4) outinterval = 3600*4;
        if (interval>3600*5) outinterval = 3600*5;
        if (interval>3600*6) outinterval = 3600*6;
        if (interval>3600*12) outinterval = 3600*12;
        if (interval>3600*24) outinterval = 3600*24;
        
        if (!graph.fixinterval) graph.interval = outinterval;
        
        graph.start = Math.floor((graph.start/1000) / graph.interval) * graph.interval * 1000;
        graph.end = Math.ceil((graph.end/1000) / graph.interval) * graph.interval * 1000;
    },
    
    'stats':function(data)
    {
        var sum = 0;
        var i=0;
        var minval = 0;
        var maxval = 0;
        var npoints = 0;
        var npointsnull = 0;
        for (z in data)
        {
            var val = data[z][1];
            if (val!=null) 
            {
                if (i==0) {
                    maxval = val;
                    minval = val;
                }
                if (val>maxval) maxval = val;
                if (val<minval) minval = val;
                sum += val;
                i++;
            } else {
                npointsnull++;
            }
            npoints ++;
        }
        var mean = sum / i;
        sum = 0, i=0;
        for (z in data)
        {
            sum += (data[z][1] - mean) * (data[z][1] - mean);
            i++;
        }
        var stdev = Math.sqrt(sum / i);
        
        return {
            "minval":minval,
            "maxval":maxval,
            "diff":maxval-minval,
            "mean":mean,
            "stdev":stdev,
            "npointsnull":npointsnull,
            "npoints":npoints
        };
    },
    
    'smooth':function(raw,npoints) 
    {
        npoints = parseInt(npoints);
        
        var smooth = [];
        for (var i=0; i<raw.length; i++) {
            var sum = 0; var nsum = 0;
            for (var x=-1*npoints; x<=npoints; x++) {
                if (raw[i+x]!=undefined) {
                    if (raw[i+x][1]!=null) {
                        sum += raw[i+x][1]*1.0;
                        nsum++;
                    }
                }
            }
            smooth[i] = [raw[i][0],sum/nsum];
        }
        return smooth;
    },
    
    'getfeedname':function(id) {
        for (z in graph.feeds) {
            if (graph.feeds[z].id == id) {
                return graph.feeds[z].name;
            }
        }
    },
    
    'histogram':function(feedid,type,resolution) {
        
        var histogram = {};
        var total_histogram = 0;
        var val = 0;
        for (z in graph.config.feedlist) {
          if (graph.config.feedlist[z].id==feedid) {
            var data = graph.config.feedlist[z].data;
            
            for (var i=1; i<data.length; i++) {
              if (data[i][1]!=null) {
                val = data[i][1];
              }
              var key = Math.round(val/resolution)*resolution;
              if (histogram[key]==undefined) histogram[key] = 0;
              
              var t = (data[i][0] - data[i-1][0])*0.001;
              
              var inc = 0;
              if (type=="kwhatpower") inc = (val * t)/(3600.0*1000.0);
              if (type=="timeatvalue") inc = t;
              histogram[key] += inc;
              total_histogram += inc;
            }
            break;
          }
        }

        // Sort and convert to 2d array
        var tmp = [];
        for (z in histogram) tmp.push([z*1,histogram[z]]);
        tmp.sort(function(a,b){if (a[0]>b[0]) return 1; else return -1;});
        histogram = tmp;

        var options = {
        series: { bars: { show: true, barWidth:resolution*0.8 } }
        };
        $.plot("#placeholder",[{data:histogram}], options);
    },
    
    'printdate': function(timestamp)
    {
        var date = new Date();
        var thisyear = date.getFullYear()-2000;
        
        var date = new Date(timestamp);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var year = date.getFullYear()-2000;
        var month = months[date.getMonth()];
        var day = date.getDate();
        
        var minutes = date.getMinutes();
        if (minutes<10) minutes = "0"+minutes;
        
        var datestr = date.getHours()+":"+minutes+" "+day+" "+month;
        if (thisyear!=year) datestr +=" "+year;
        return datestr;
    }
};

