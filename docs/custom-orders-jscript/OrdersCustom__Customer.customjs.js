function getRefId(querystr) {
  let params = new URLSearchParams(window.location.search), returnVals = params.get(querystr);
  // console.log(returnVals);
  return returnVals;
};

const querylabel = "style_colour_id"
const fetchurl = "/FetchXMLColours/?" + querylabel + "="
var lang_index = 0;
var livingston = false;


$(document).ready(function () {
async function applyLabelTranslations() {

  const userLang = getLanguageFromUrl(); // "nl"  
  console.log("userLang",userLang,"navigator.window.location.pathname.",window.location.pathname)
  const fallbackLang = "en";

  try {
    const res = await fetch("/jscustomtranslations.json");
    const translations = await res.json();

    for (const [fieldName, labels] of Object.entries(translations)) {
      const label = labels[userLang] || labels[fallbackLang];

      let el = document.querySelector(`[for="${fieldName}"]`)
        || document.querySelector(`[data-name="${fieldName}"]`)
        || document.querySelector(`[aria-label="${fieldName}"]`);

      // Busca alternativa por texto direto
      if (!el) {
        const candidates = Array.from(document.querySelectorAll("label, span, div"));
        el = candidates.find(e => e.textContent.trim() === fieldName);
      }

      if (!el) {
         el = document.querySelector(`[id="${fieldName}_label"]`);
      }

      if (el) {
        el.textContent = label;
        console.log("encontrei esta label",label)
      } else {
        console.warn("⚠️ Elemento não encontrado para:", fieldName);
      }
    }
  } catch (error) {
    console.error("Erro ao aplicar traduções:", error);
  }

  }

  const observer = new MutationObserver((mutations, obs) => {
    const formReady = document.querySelector('[for^="cr56f_"]') || document.querySelector('[data-name^="cr56f_"]');
    if (formReady) {
      applyLabelTranslations();
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });


  
  let queryvalue = getRefId(querylabel);
  let pathquery = fetchurl + queryvalue
  // console.log(pathquery)

console.log("pathquery",pathquery)
  const request = $.ajax({
    url: pathquery,
    type: "GET",
    dataType: "json"
  });

  request.done(colour => {
    $(colour).each(i => {
      $("#cr56f_style_color").attr("value", colour[i].ColourGUID);
      $("#cr56f_style_color_name").attr("value", colour[i].ColourID + " : " + colour[i].ColourNAME);
      $("#cr56f_style_color_entityname").attr("value", "cr56f_wpp_style_colors");

      lookupStyle(colour[i].StyleGUID)
    });
  });

  $("#cr56f_shoe_unit").change(hideFields);    
});


function hideFields() {
  var shoe_unit_val = $("#cr56f_shoe_unit").val();
  sessionStorage.unit = shoe_unit_val;

  var action_lf = true;
  var action_rf = true;
}


function lookupStyle(styleID) {
  const queryStyle = "style_id"
  const fetchurl = "/FetchXMLStyles/?" + queryStyle + "="
  var styleQuery = fetchurl + styleID
console.log("styleQuery", styleQuery)
  var request = $.ajax({
    url: styleQuery,
    type: "GET",
    dataType: "json"
  });
  
  request.done(style => {
    $(style).each(i => {
      sessionStorage.style_upper_options = style[i].UpperOptions;  
    });
  });
}

function getLanguageFromUrl() {
  const match = window.location.pathname.match(/^\/([a-z]{2})-[A-Z]{2}\//);
  return match ? match[1] : null;
}

