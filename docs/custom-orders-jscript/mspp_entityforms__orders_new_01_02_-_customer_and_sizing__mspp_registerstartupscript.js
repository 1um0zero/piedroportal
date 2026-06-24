/**function getUrlID(urlID) {
    let param = new URLSearchParams(window.location.href), returnValues = param.get(urlID); 
    console.log(returnValues); 
    return returnValues
}; 

const STYLE_ID = getUrlID("style_colour_id"); 
**/

//$(window).on("load", () => {
  
//var jsonURL = '/FetchXMLColours/';
 // var jsonURL = window.location.origin + '/FetchXMLColours/';

 // console.log("window.location.origin: "+window.location.origin)
//let colour = fetch(jsonURL)
//console.log(window.sessionStorage.getItem('colour')); 

 //     $.getJSON(jsonURL, function success (colour) {
  //console.log("loading "+jsonURL);
    //      console.log(colour);

$(document).ready(function() {
    console.log("entrei");
    
    const request = $.ajax({
        url: "/FetchXMLColours/",        
        type: "GET",
        dataType: "json"
    });
    
  request.done(colour => { 
    $(colour).each(i => { 

            $("#cr56f_style").attr("value", colour[i].StyleGUID);
            $("#cr56f_style_name").attr("value", colour[i].StyleID);
            $("#cr56f_style_entityname").attr("value", "cr56f_wpp_styles");

            $("#cr56f_style_color").attr("value", colour[i].ColourGUID);
            $("#cr56f_style_color_name").attr("value", colour[i].ColourID + ": " + colour[i].ColourNAME);
            $("#cr56f_style_color_entityname").attr("value", "cr56f_wpp_style_colors");        

            let image = document.getElementById("cr56f_picture");
            image.src = "/Image/download.aspx?entity=cr56f_wpp_style_colors&attribute=cr56f_picture&ID=" + colour[i].ColourPICTUREID;
            console.log("picid", colour[i].ColourPICTUREID);
        });
         });
});
