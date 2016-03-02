<?php

// no direct access
defined('EMONCMS_EXEC') or die('Restricted access');

function graph_controller()
{
    global $session,$route,$mysqli;

    if (!$session['write']) return array('content'=>"", 'fullwidth'=>false);
    
    $result = view("Modules/graph/view.php",array());
    
    return array('content'=>$result, 'fullwidth'=>true);
}
