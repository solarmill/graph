<?php
    /*
    All Emoncms code is released under the GNU Affero General Public License.
    See COPYRIGHT.txt and LICENSE.txt.

    ---------------------------------------------------------------------
    Emoncms - open source energy visualisation
    Part of the OpenEnergyMonitor project:
    http://openenergymonitor.org
    */

    global $path, $embed;
    global $fullwidth;
    $fullwidth = true;
?>

<!--[if IE]><script language="javascript" type="text/javascript" src="<?php echo $path;?>Lib/flot/excanvas.min.js"></script><![endif]-->
<script language="javascript" type="text/javascript" src="<?php echo $path;?>Lib/flot/jquery.flot.min.js"></script>
<script language="javascript" type="text/javascript" src="<?php echo $path;?>Lib/flot/jquery.flot.time.min.js"></script>
<script language="javascript" type="text/javascript" src="<?php echo $path;?>Lib/flot/jquery.flot.selection.min.js"></script>

<script language="javascript" type="text/javascript" src="<?php echo $path;?>Modules/graph/graph2.js"></script>

<style>
#wrapper {
  padding-left: 250px;
  transition: all 0.4s ease 0s;
}

#sidebar-wrapper {
  margin-left: -250px;
  left: 250px;
  width: 250px;
  background: #eee;
  position: fixed;
  height: 100%;
  overflow-y: auto;
  z-index: 1000;
  transition: all 0.4s ease 0s;
}

#page-content-wrapper {
  width: 100%;
  padding-left:20px;
}

@media (max-width:1024px) {

    #wrapper {
      padding-left: 0;
    }

    #sidebar-wrapper {
      left: 0;
    }

    #wrapper.active {
      position: relative;
      left: 250px;
    }

    #wrapper.active #sidebar-wrapper {
      left: 250px;
      width: 250px;
      transition: all 0.4s ease 0s;
    }

}
</style>

<div id="wrapper">
    <div id="sidebar-wrapper">
            <h3>Feeds</h3>
            <div style="overflow-y: scroll; overflow-x: hidden; background-color:#f3f3f3; width:250px">
                <table class="table">
                    <colgroup>
                       <col span="1" style="width: 70%;">
                       <col span="1" style="width: 15%;">
                       <col span="1" style="width: 15%;">
                    </colgroup>
                    <tbody id="feeds"></tbody>
                </table>
            </div>
            
    </div>

    <div id="page-content-wrapper">

<div class="row">    
    <div class="span10" style="min-width:820px">

        <h3>Data viewer</h3>

        <div id="error" style="display:none"></div>

        <div id="navigation" style="padding-bottom:5px;">
            <button class='btn graph_time' type='button' time='1'>D</button>
            <button class='btn graph_time' type='button' time='7'>W</button>
            <button class='btn graph_time' type='button' time='30'>M</button>
            <button class='btn graph_time' type='button' time='365'>Y</button>
            <button id='graph_zoomin' class='btn'>+</button>
            <button id='graph_zoomout' class='btn'>-</button>
            <button id='graph_left' class='btn'><</button>
            <button id='graph_right' class='btn'>></button>
            
            <div class="input-prepend input-append" style="float:right; margin-right:22px">
            <span class="add-on">Show missing data: <input type="checkbox" id="showmissing" /></span>
            
            </div>
        </div>

        <div id="histogram-controls" style="padding-bottom:5px; display:none;">
            <div class="input-prepend input-append">
                <span class="add-on" style="width:75px"><b>Histogram</b></span>
                <span class="add-on" style="width:75px">Type</span>
                <select id="histogram-type" style="width:150px">
                    <option value="timeatvalue" >Time at value</option>
                    <option value="kwhatpower" >kWh at Power</option>
                </select>
                <span class="add-on" style="width:75px">Resolution</span>
                <input id="histogram-resolution" type="text" style="width:60px"/>
            </div>
            
            <button id="histogram-back" class="btn" style="float:right">Back to main view</button>
        </div>

        <div id="placeholder_bound" style="width:100%; height:400px;">
            <div id="placeholder"></div>
        </div>

        <div id="info" style="padding:20px; display:none">
            
            <div class="input-prepend input-append">
                <span class="add-on" style="width:50px">Start</span>
                <input id="request-start" type="text" style="width:80px" />

                <span class="add-on" style="width:50px">End</span>
                <input id="request-end" type="text" style="width:80px" />

                <span class="add-on" style="width:50px">Type</span>
                <select id="request-type" style="width:120px">
                    <option value="interval">Fixed Interval</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Annual</option>
                </select>
                
                <span class="fixed-interval-options">
                    <input id="request-interval" type="text" style="width:60px" />
                    <span class="add-on">Fix <input id="request-fixinterval" type="checkbox" /></span>
                    <span class="add-on">Limit to data interval <input id="request-limitinterval" type="checkbox" /></span>
                </span>
                
                <button id="reload" class="btn">Reload</button>
            </div>
            
            <div id="window-info" style=""></div><br>
                
            <table class="table">
                <tr><th>Feed</th><th></th><th>Quality</th><th>Min</th><th>Max</th><th>Diff</th><th>Mean</th><th>Stdev</th><th style='text-align:center'>Scale</th><th style='text-align:center'>Delta</th><th style='text-align:center'>Average</th><th>Decimal Points</th><th style="width:120px"></th><th style="width:80px"></th></tr>
                <tbody id="stats"></tbody>
            </table>
            
            
            <div class="input-prepend input-append">
                <button class="btn" id="showcsv" >Show CSV Output</button>
                <span class="add-on csvoptions">Time format:</span>
                <select id="csvtimeformat" class="csvoptions">
                    <option value="unix">Unix timestamp</option>
                    <option value="seconds">Seconds since start</option>
                    <option value="datestr">Date-time string</option>
                </select>
                <span class="add-on csvoptions">Null values:</span>
                <select id="csvnullvalues" class="csvoptions">
                    <option value="show">Show</option>
                    <option value="lastvalue">Replace with last value</option>
                    <option value="remove">Remove whole line</option>
                </select>
            </div> 
            
            
            <textarea id="csv" style="width:98%; height:500px; display:none; margin-top:10px"></textarea>
        </div>
    </div>
</div>
    </div>
</div>

<script>
    var path = "<?php echo $path; ?>";
    
    var urlparts = window.location.pathname.split("graph/");
    if (urlparts.length==2) {
        feedid = parseInt(urlparts[1]);
        graph.feedlist.push({id:feedid, yaxis:1, fill:0, scale: 1.0, delta:false, dp:1, plottype:'lines'});
    }
    
    graph.init();
    graph.show();
</script>

