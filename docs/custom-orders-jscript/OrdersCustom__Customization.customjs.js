const array_fields_trigger = [
  "#cr56f_plastic_fitting_shoes_1",
  "#cr56f_plastic_fitting_shoes_0",
  "#cr56f_supplementlf",
  "#cr56f_supplementrf",
  "#cr56f_supplement_high_paddinglf_1",
  "#cr56f_supplement_high_paddinglf_0",
  "#cr56f_closure_velcro_1",
  "#cr56f_closure_velcro_0",
  "#cr56f_collar_extra_padding_1",
  "#cr56f_collar_extra_padding_0",
  "#cr56f_tongue_extra_padding_1",
  "#cr56f_tongue_extra_padding_0",
  "#cr56f_tongue_reinforcement_1",
  "#cr56f_tongue_reinforcement_0",
  "#cr56f_tongue_velcro_1",
  "#cr56f_tongue_velcro_0",
  "#cr56f_heel_1",
  "#cr56f_heel_0",
  "#cr56f_hollow_wedge_1",
  "#cr56f_hollow_wedge_0",
  "#cr56f_fully_hollow_wedge_1",
  "#cr56f_fully_hollow_wedge_0",
  "#cr56f_wedge_1",
  "#cr56f_wedge_0",
  "#cr56f_height_1",
  "#cr56f_height_0",
  "#cr56f_sole_runner_1",
  "#cr56f_sole_runner_0",
  "#cr56f_sole_pueva_bumper_1",
  "#cr56f_sole_pueva_bumper_0",
  "#cr56f_rounded_1",
  "#cr56f_rounded_0",
  "#cr56f_flare_1",
  "#cr56f_flare_0",
  "#cr56f_inwards_1",
  "#cr56f_inwards_0",
  "#cr56f_sach_heel_1",
  "#cr56f_sach_heel_0",
  "#cr56f_thomas_heel_1",
  "#cr56f_thomas_heel_0",
  "#cr56f_toe_normallf_1",
  "#cr56f_toe_normallf_0",
  "#cr56f_toe_shortlf_1",
  "#cr56f_toe_shortlf_0",
  "#cr56f_toe_frontlf_1",
  "#cr56f_toe_frontlf_0",
  "#cr56f_toe_winglf_1",
  "#cr56f_toe_winglf_0",
  "#cr56f_rocker_solelf",
  "#cr56f_rocker_solerf"
]

const array_fields_to_toggle = [
    ["show", "", "#cr56f_pfs_heightlf", "#cr56f_pfs_heightrf", "#cr56f_pfs_heel_heightlf", "#cr56f_pfs_heel_heightrf"],
    ["hide", "", "#cr56f_pfs_heightlf", "#cr56f_pfs_heightrf", "#cr56f_pfs_heel_heightlf", "#cr56f_pfs_heel_heightrf"],
    ["show", "", "#cr56f_supplement_lateral_mmlf", "#cr56f_supplement_lateral_mmrf", "#cr56f_supplement_medial_mmlf", "#cr56f_supplement_medial_mmrf"],
    ["hide", "", "#r56f_supplement_lateral_mmlf", "#cr56f_supplement_lateral_mmrf", "#cr56f_supplement_medial_mmlf", "#cr56f_supplement_medial_mmrf"],  
    ["show", "", "#cr56f_supplement_high_padding_lateral_mmlf", "#cr56f_supplement_high_padding_lateral_mmrf", "#cr56f_supplement_high_padding_medial_mmlf", "#cr56f_supplement_high_padding_medial_mmrf"],  
    ["hide", "", "#cr56f_supplement_high_padding_lateral_mmlf", "#cr56f_supplement_high_padding_lateral_mmrf", "#cr56f_supplement_high_padding_medial_mmlf", "#cr56f_supplement_high_padding_medial_mmrf"],  
    ["show", "", "#cr56f_closure_velcro_list", "#cr56f_closure_velcro_longer", "#cr56f_closure_velcro_wider"], 
    ["hide", "", "#cr56f_closure_velcro_list", "#cr56f_closure_velcro_longer", "#cr56f_closure_velcro_wider"],
    ["show", "", "#cr56f_collar_extra_padding_options"],
    ["hide", "", "#cr56f_collar_extra_padding_options"],
    ["show", "", "#cr56f_tongue_extra_padding_options"],
    ["hide", "", "#cr56f_tongue_extra_padding_options"],
    ["show", "", "#cr56f_tongue_reinforcement_options"],
    ["hide", "", "#cr56f_tongue_reinforcement_options"],
    ["show", "", "#cr56f_tongue_velcro_options"],
    ["hide", "", "#cr56f_tongue_velcro_options"],
    ["show", "", "#cr56f_heel_medial_laterallf", "#cr56f_heel_medial_laterallrf", "#cr56f_heel_medial", "#cr56f_heel_lateral"],  
    ["hide", "", "#cr56f_heel_medial_laterallf", "#cr56f_heel_medial_laterallrf", "#cr56f_heel_medial", "#cr56f_heel_lateral"],  
    ["show", "", "#cr56f_hollow_wedge_medial_laterallf", "#cr56f_hollow_wedge_medial_laterallrf", "#cr56f_hollow_wedge_medial", "#cr56f_hollow_wedge_lateral"],  
    ["hide", "", "#cr56f_hollow_wedge_medial_laterallf", "#cr56f_hollow_wedge_medial_laterallrf", "#cr56f_hollow_wedge_medial", "#cr56f_hollow_wedge_lateral"],  
    ["show", "", "#cr56f_fully_hollow_wedge_medial_laterallf", "#cr56f_fully_hollow_wedge_medial_laterallrf", "#cr56f_fully_hollow_wedge_medial", "#cr56f_fully_hollow_wedge_lateral"],  
    ["hide", "", "#cr56f_fully_hollow_wedge_medial_laterallf", "#cr56f_fully_hollow_wedge_medial_laterallrf", "#cr56f_fully_hollow_wedge_medial", "#cr56f_fully_hollow_wedge_lateral"],  
    ["show", "", "#cr56f_wedge_medial_laterallf", "#cr56f_wedge_medial_laterallrf", "#cr56f_wedge_medial", "#cr56f_wedge_lateral"],  
    ["hide", "", "#cr56f_wedge_medial_laterallf", "#cr56f_wedge_medial_laterallrf", "#cr56f_wedge_medial", "#cr56f_wedge_lateral"],  
    ["show", "", "#cr56f_heightlf", "#cr56f_heightrf"],
    ["hide", "", "#cr56f_heightlf", "#cr56f_heightrf"],
    ["show", "", "#cr56f_sole_runner_options", "#cr56f_sole_eva_wedge_colour"],
    ["hide", "", "#cr56f_sole_runner_options", "#cr56f_sole_eva_wedge_colour"],
    ["show", "", "#cr56f_sole_pueva_bumper_options"],
    ["hide", "", "#cr56f_sole_pueva_bumper_options"],
    ["show", "", "#cr56f_roundedlf", "#cr56f_roundedrf"],
    ["hide", "", "#cr56f_roundedlf", "#cr56f_roundedrf"],
    ["show", "", "#cr56f_flarelf", "#cr56f_flarerf"],
    ["hide", "", "#cr56f_flarelf", "#cr56f_flarerf"],
    ["show", "", "#cr56f_inwardslf", "#cr56f_inwardsrf"],
    ["hide", "", "#cr56f_inwardslf", "#cr56f_inwardsrf"],
    ["show", "", "#cr56f_sach_heellf", "#cr56f_sach_heelrf"],
    ["hide", "", "#cr56f_sach_heellf", "#cr56f_sach_heelrf"],
    ["show", "", "#cr56f_thomas_heel_medial", "#cr56f_thomas_heel_lateral"],
    ["hide", "", "#cr56f_thomas_heel_medial", "#cr56f_thomas_heel_lateral"],
    ["show", "", "#cr56f_toe_normal_material"],
    ["hide", "", "#cr56f_toe_normal_material"],  
    ["show", "", "#cr56f_toe_short_material"],
    ["hide", "", "#cr56f_toe_short_material"],  
    ["show", "", "#cr56f_toe_front_material"],
    ["hide", "", "#cr56f_toe_front_material"],  
    ["show", "", "#cr56f_toe_wing_material"],
    ["hide", "", "#cr56f_toe_wing_material"],
    ["", "", "#cr56f_rocker_heellf", "#cr56f_rocker_jointlf", "#cr56f_rocker_toeslf"],
    ["", "", "#cr56f_rocker_heelrf", "#cr56f_rocker_jointrf", "#cr56f_rocker_toesrf"]
  ]

const sigla_lf_rf_country = [
    [" (R)", " (L)"],
    [" (R)", " (L)"],
    [" (D)", " (G)"],
    [" (R)", " (L)"]
]

const section_label_country = [
    [" - RIGHT foot (Rf)", " - LEFT foot (Lf)"],
    [" - RECHTER voet (R)", " - LINKER voet (L)"],
    [" - pied DROIT (pD)", " - pied GAUCHE (pG)"],
    [" - RECHTER Fuß (Rf)", " - LINKER Fuß (Lf)"]
]

const array_progressbar = [
    ["Customer and Product", "Additions", "Confirmation"],
    ["Klant en Product", "Aanpassingen", "Bevestiging"],
    ["Client et Produit", "Suppléments", "Confirmation"],
    ["Kunde und Schuh", "Ergänzungen", "Bestätigung"]
  ]

const array_prevnextbuttons = [
    ["back to Customer and Product", "Confirmation"],
    ["terug naar Klant en Product", "Bevestiging"],
    ["retour aux Client et Produit", "Confirmation"],
    ["zurück zu Kunde und Produkt", "Bestätigung"]
  ]

const array_hidden_radios = [
  "cr56f_pfs_heightlf", "cr56f_pfs_heightrf",
  "cr56f_pfs_heel_heightlf", "cr56f_pfs_heel_heightrf", 
  "cr56f_low_reinforcement_lateral_rhenoflex", 
  "cr56f_low_reinforcement_lateral_ercoflex",
  "cr56f_low_reinforcement_medial_rhenoflex", 
  "cr56f_low_reinforcement_medial_ercoflex",
  "cr56f_low_reinforcement_heel_rhenoflex", 
  "cr56f_low_reinforcement_heel_ercoflex",
  "cr56f_orthoses_surrounding_rhenoflex",
  "cr56f_orthoses_surrounding_ercoflex",
  "cr56f_orthoses_lateral_medial_rhenoflex",
  "cr56f_orthoses_lateral_medial_ercoflex",
  "cr56f_orthoses_lateral_rhenoflex",
  "cr56f_orthoses_lateral_ercoflex",
  "cr56f_orthoses_medial_rhenoflex",
  "cr56f_orthoses_medial_ercoflex"
 ]
 
const array_hidden = [
  "cr56f_standardlf", "cr56f_standardrf",
  "cr56f_low_reinforcement_mediallf", "cr56f_low_reinforcement_medialrf",
  "cr56f_low_reinforcement_laterallf", "cr56f_low_reinforcement_lateralrf",
  "cr56f_low_reinforcement_heellf", "cr56f_low_reinforcement_heelrf",
  "cr56f_low_reinforcement_heel_laterallf", "cr56f_low_reinforcement_heel_lateralrf",
  "cr56f_low_reinforcement_heel_mediallf", "cr56f_low_reinforcement_heel_medialrf",
  "cr56f_orthoses_surrounding_mediallf", "cr56f_orthoses_surrounding_medialrf",
  "cr56f_orthoses_surrounding_laterallf", "cr56f_orthoses_surrounding_lateralrf",
  "cr56f_orthoses_surroundinglf", "cr56f_orthoses_surroundingrf",
  "cr56f_orthoses_lateral_medial_mediallf", "cr56f_orthoses_lateral_medial_medialrf",
  "cr56f_orthoses_lateral_medial_laterallf", "cr56f_orthoses_lateral_medial_lateralrf",
  "cr56f_orthoses_lateral_mediallf", "cr56f_orthoses_lateral_medialrf",
  "cr56f_orthoses_laterallf", "cr56f_orthoses_lateralrf",
  "cr56f_orthoses_mediallf", "cr56f_orthoses_medialrf",
  "cr56f_forefoot_provisionlf", "cr56f_forefoot_provisionrf"
 ]
 

const array_sections_translations = [
  { id: "section_last_fitting", en: "Last & Fitting Shoes", nl: "Leest en Pasvorm", de: "Leisten und Passform", fr: "Forme et Ajustement" },
  { id: "section_last_measurements", en: "Last Measurements", nl: "Leestmetingen", de: "Leistenmaße", fr: "Mesures de la Forme" },
  { id: "section_fitting_shoes", en: "Fitting Shoes", nl: "Pasvormschoenen", de: "Probeschuhe", fr: "Chaussure d’Essai" },
  { id: "section_toe_shape", en: "Toe Shape", nl: "Teenvorm", de: "Zehenform", fr: "Forme de l’Avant-pied" },
  { id: "section_supplement", en: "Supplement", nl: "Aanvulling", de: "Zusatz", fr: "Supplément" },
  { id: "section_supplement_measurements", en: "Supplement Measurements", nl: "Aanvullende metingen", de: "Zusatzmaße", fr: "Mesures du Supplément" },
  { id: "section_toe_rocker", en: "Toe Rocker", nl: "Teenrocker", de: "Zehenwippe", fr: "Bascule de l’Avant-pied" },
  { id: "section_leg_length_diff", en: "Leg Length Difference", nl: "Beenlengteverschil", de: "Beinlängendifferenz", fr: "Différence de Longueur" },
  { id: "section_upper_model", en: "Upper Model", nl: "Bovenmodel", de: "Obermodell", fr: "Modèle Supérieur" },
  { id: "section_lining", en: "Lining", nl: "Voering", de: "Futter", fr: "Doublure" },
  { id: "section_closure", en: "Closure", nl: "Sluiting", de: "Verschluss", fr: "Fermeture" },
  { id: "section_stretch", en: "Stretch", nl: "Rekbaarheid", de: "Dehnbarkeit", fr: "Élasticité" },
  { id: "section_collar", en: "Collar", nl: "Kraag", de: "Kragen", fr: "Col" },
  { id: "section_tongue", en: "Tongue", nl: "Tong", de: "Zunge", fr: "Languette" },
  { id: "section_water_tongue", en: "Water Tongue", nl: "Waterdichte tong", de: "Wasserdichte Zunge", fr: "Languette Étanche" },
  { id: "section_others", en: "Others", nl: "Overige", de: "Sonstige", fr: "Autres" },
  { id: "section_shoe_soles", en: "Shoe Soles", nl: "Schoenzolen", de: "Schuhsohlen", fr: "Semelles" },
  { id: "section_soles", en: "Soles", nl: "Zolen", de: "Sohlen", fr: "Semelles" },
  { id: "section_stiffener_toe_options", en: "Stiffener & Toe Options", nl: "Verstevigingen en teenopties", de: "Verstärkungen und Zehenoptionen", fr: "Renforts et Options de Pointe" },
  { id: "section_stiffener_materials", en: "Stiffeners Materials", nl: "Verstevigingsmaterialen", de: "Verstärkungsmaterialien", fr: "Matériaux des Renforts" },
  { id: "section_toe_options", en: "Toe Options", nl: "Teenopties", de: "Zehenoptionen", fr: "Options de Pointe" }
];


const translationsByLabel = {
  "Last & Fitting Shoes": {
    en: "Last & Fitting Shoes",
    nl: "Leest en Pasvorm",
    de: "Leisten und Passform",
    fr: "Forme et Ajustement"
  },
  "Last Measurements": {
    en: "Last Measurements",
    nl: "Leestmetingen",
    de: "Leistenmaße",
    fr: "Mesures de la Forme"
  },
  "Fitting Shoes": {
    en: "Fitting Shoes",
    nl: "Pasvormschoenen",
    de: "Probeschuhe",
    fr: "Chaussure d’Essai"
  },
  "Toe Shape": {
    en: "Toe Shape",
    nl: "Teenvorm",
    de: "Zehenform",
    fr: "Forme de l’Avant-pied"
  },
  "Supplement": {
    en: "Supplement",
    nl: "Aanvulling",
    de: "Zusatz",
    fr: "Supplément"
  },
  "Supplement Measurements": {
    en: "Supplement Measurements",
    nl: "Aanvullende metingen",
    de: "Zusatzmaße",
    fr: "Mesures du Supplément"
  },
  "Toe Rocker": {
    en: "Toe Rocker",
    nl: "Teenrocker",
    de: "Zehenwippe",
    fr: "Bascule de l’Avant-pied"
  },
  "Leg Length Difference": {
    en: "Leg Length Difference",
    nl: "Beenlengteverschil",
    de: "Beinlängendifferenz",
    fr: "Différence de Longueur"
  },
  "Upper Model": {
    en: "Upper Model",
    nl: "Bovenmodel",
    de: "Obermodell",
    fr: "Modèle Supérieur"
  },
  "Lining": {
    en: "Lining",
    nl: "Voering",
    de: "Futter",
    fr: "Doublure"
  },
  "Closure": {
    en: "Closure",
    nl: "Sluiting",
    de: "Verschluss",
    fr: "Fermeture"
  },
  "Stretch": {
    en: "Stretch",
    nl: "Rekbaarheid",
    de: "Dehnbarkeit",
    fr: "Élasticité"
  },
  "Collar": {
    en: "Collar",
    nl: "Kraag",
    de: "Kragen",
    fr: "Col"
  },
  "Tongue": {
    en: "Tongue",
    nl: "Tong",
    de: "Zunge",
    fr: "Languette"
  },
  "Water Tongue": {
    en: "Water Tongue",
    nl: "Waterdichte tong",
    de: "Wasserdichte Zunge",
    fr: "Languette Étanche"
  },
  "Others": {
    en: "Others",
    nl: "Overige",
    de: "Sonstige",
    fr: "Autres"
  },
  "Shoe Soles": {
    en: "Shoe Soles",
    nl: "Schoenzolen",
    de: "Schuhsohlen",
    fr: "Semelles"
  },
  "Soles": {
    en: "Soles",
    nl: "Zolen",
    de: "Sohlen",
    fr: "Semelles"
  },
  "Stiffener & Toe Options": {
    en: "Stiffener & Toe Options",
    nl: "Verstevigingen en teenopties",
    de: "Verstärkungen und Zehenoptionen",
    fr: "Renforts et Options de Pointe"
  },
  "Stiffeners Materials": {
    en: "Stiffeners Materials",
    nl: "Verstevigingsmaterialen",
    de: "Verstärkungsmaterialien",
    fr: "Matériaux des Renforts"
  },
  "Toe Options": {
    en: "Toe Options",
    nl: "Teenopties",
    de: "Zehenoptionen",
    fr: "Options de Pointe"
  }
};


function getRefId(querystr) {
    let params = new URLSearchParams(window.location.search), returnVals = params.get(querystr);
    // console.log(returnVals);
    return returnVals;
  };
  
const querylabel = "style_colour_id"
const fetchurl = "/FetchXMLColours/?" + querylabel + "="
var lang_index = 0
var style_name = ""
let adds_exclude = sessionStorage.adds_exclude 
let exclusive = sessionStorage.exclusive
var is_zsm = false 

const max_upper_options = 5
var upper_options = sessionStorage.style_upper_options

 $(document).ready(function () {

  var unit_shoes = sessionStorage.unit;

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
        // console.log("encontrei esta label",label)
      } else {
        // console.warn("⚠️ Elemento não encontrado para:", fieldName);
      }
    }
  } catch (error) {
    console.error("Erro ao aplicar traduções:", error);
  }

const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input:not([type]), textarea, select');
// console.log("IDs encontrados:", inputs);
const array_fields = Array.from(inputs)
  .filter(el => el.id) // garante que só pega os que têm ID
  .map(el => el.id);
// console.log("IDs encontrados:", inputs);

document.querySelectorAll('.section_title').forEach(section => {
  const label = section.getAttribute('aria-label')?.trim();
  const h3 = section.querySelector('h3');
  const translation = translationsByLabel[label]?.[userLang];
  if (label && h3 && translation) {
    h3.textContent = translation;
  }
});

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


  hideFields();
  get_style_colour_values();
  
  for (let i = 0; i < array_fields_trigger.length; i++) {
      $(array_fields_trigger[i]).change(function () {
            console.log("alterei o indice: ", i)
          conditional_fields(i);
      });
  };  
});


const booleans_yes = ["yes", "ja", "oui", "ja"]
const booleans_no = ["no", "nee", "non", "nein"]
const array_image_rockersole = ["WebResource_rockersole", "WebResource_rockersole_NL", "WebResource_rockersole_FR", "WebResource_rockersole"]
const array_required = [" is required for ", " is vereist ", " est requis ", " ist erforderlich für "]

function conditional_fields(i, first_round) {
    for (let j = 2; j < array_fields_to_toggle[i].length; j++) {
        if (array_fields_to_toggle[i][0] == 'hide' || $(array_fields_trigger[i]).val() == array_fields_to_toggle[i][0]){
            if (array_fields_to_toggle[i][j].substring(0, 1) != "#") {
                var element = document.getElementById(array_fields_to_toggle[i][j]);
                
                $(element).hide();
            }
            else {
                $(array_fields_to_toggle[i][j]).parent().parent().parent().hide();
                $(array_fields_to_toggle[i][j]).prop('required', false);
                $(array_fields_to_toggle[i][j]).closest(".control").prev().removeClass("required");

                for (p = 0; p < Page_Validators.length; p++) {
                    if (Page_Validators[p].id == array_fields_to_toggle[i][j] + "Validator") {
                        Page_Validators.splice(p);
                    }
                }

                let element = document.querySelector("[aria-label='"+array_fields_to_toggle[i][1]+"']")
                // console.log("hide", i, element, array_fields_to_toggle[i][1])
                if (element) {
                $(element).hide();
                }
            }
          }
        else {
            if (array_fields_to_toggle[i][j].substring(0, 1) != "#") {
                var element = document.getElementById(array_fields_to_toggle[i][j]);
                console.log("element", element)
                $(element).show();
            }
            else {
                    $(array_fields_to_toggle[i][j]).parent().parent().parent().show();
                    $(array_fields_to_toggle[i][j]).prop('required', true);
                    $(array_fields_to_toggle[i][j]).closest(".control").prev().addClass("required");
                    // console.log("é aqui ??????????????????", array_fields_to_toggle[i][j], i, j)
                    // if (first_round != 1) {
                    //     let element = document.querySelector("[aria-label='"+array_fields_to_toggle[i][1]+"']")
                    //     // console.log("show", i, element)
                    //     $(element).show();
                    // }

                    // Create new validator
                    var Requiredvalidator = document.createElement('span');
                    Requiredvalidator.style.display = "none";
                    Requiredvalidator.id = array_fields_to_toggle[i][j] + "Validator";
                    Requiredvalidator.controltovalidate = array_fields_to_toggle[i][j];

                    // var trigger_field = array_fields_trigger[i];
                    // var tf_len = trigger_field.length 
                    // console.log("tf_len", tf_len, trigger_field.substring(tf_len))
                    // if (trigger_field.substring(tf_len-1) == "_0" || trigger_field.substring(tf_len-1) == "_1") {
                    //     trigger_field = array_fields_trigger[i].substring(1, tf_len) + "label"
                    // }
                    // else
                    // {
                    //   trigger_field = trigger_field + "_label"
                    // }
                    // console.log("trigger_field LABEL", trigger_field)
                    // trigger_field = document.getElementById(trigger_field)
                    // if (trigger_field) {
                    //   trigger_field = trigger_field.textContent;
                    // }
                    //   else {
                    //     trigger_field = ""
                    // }
                    // var label = document.getElementById(array_fields_to_toggle[i][j].substring(1) + "_label").textContent;
                    // console.log("trigger_field", trigger_field, "label", label)

                    Requiredvalidator.errormessage = "<a href=" + array_fields_to_toggle[i][j] + "_label" +
                        " onclick=javascript:scrollToAndFocus(" + array_fields_to_toggle[i][j].substring(1) + "_label, " +
                        array_fields_to_toggle[i][j].substring(1) + ");return false;" +
                        " referencecontrolid=" + array_fields_to_toggle[i][j].substring(1) + ">" + ".</a>";

                        // label + array_required[lang_index] + trigger_field + ".</a>";

                    Requiredvalidator.initialvalue = "";
                    Requiredvalidator.evaluationfunction = function () {
                        var value = $(array_fields_to_toggle[i][j]).val();
                        console.log("value", value)
                        if (value == null || value == "") {
                            return false;
                        } else {
                            return true;
                        }
                    };
                    // Add the new validator to the page validators array:
                    Page_Validators.push(Requiredvalidator);
                 };
            };

      }  
};


function hideFields(){
    for (let i = 0; i < array_fields_trigger.length; i++) {
        if (array_fields_to_toggle[i][0] == "hide" || array_fields_to_toggle[i][0] == "") {
            conditional_fields(i);
        };
    }; 
};


function getLanguageFromUrl() {
  const match = window.location.pathname.match(/^\/([a-z]{2})-[A-Z]{2}\//);
  return match ? match[1] : null;
}


function get_style_colour_values() {
    // $("#cr56f_style").change(lookupStyle);
    let queryvalue = getRefId(querylabel);
    let pathquery = fetchurl + queryvalue
    // console.log(pathquery)
  
    const request = $.ajax({
      url: pathquery,
      type: "GET",
      dataType: "json"
    });
  
    request.done(colour => {
        $(colour).each(i => {
          //   adds_exclude = colour[i].StyleADDSEXCLUDE
          //   console.log("adds_exclude on request step 2", adds_exclude)

          // // $("#cr56f_customizedwidth").val(colour[i].WidthCustomized);
    
          // $("#cr56f_style").attr("value", colour[i].StyleGUID);
          // $("#cr56f_style_name").attr("value", colour[i].StyleID);
          // style_name = colour[i].StyleID

          // $("#cr56f_style_entityname").attr("value", "cr56f_wpp_styles");
          
          $("#cr56f_style_color").attr("value", colour[i].ColourGUID);
          $("#cr56f_style_color_name").attr("value", colour[i].ColourID + " : " + colour[i].ColourNAME);
          $("#cr56f_style_color_entityname").attr("value", "cr56f_wpp_style_colors");
    
          // $("#cr56f_size_scale").attr("value", colour[i].ScaleGUID);
          // $("#cr56f_size_scale_name").attr("value", colour[i].ScaleNAME);
          // $("#cr56f_size_scale_entityname").attr("value", "cr56f_wpp_size_scales");
    
          // $("#cr56f_closure").attr("value", colour[i].ClosureGUID);
          // $("#cr56f_closure_name").attr("value", colour[i].ClosureNAME);
          // $("#cr56f_closure_entityname").attr("value", "cr56f_wpp_closures");
    
          lookupStyle(colour[i].StyleGUID)
        });
      });
        
  }

function lookupStyle(styleID) {
    let image = document.getElementById("WebResource_style_picture");
    image.src = "/Image/download.aspx?entity=cr56f_wpp_styles&attribute=cr56f_style_picture&ID=" + styleID +"&Full=true";
console.log("styleID",styleID,"upper_options",upper_options)
    hideUpperLeather();
  }
  

function hideUpperLeather(){
  var nr_options = parseInt(upper_options) + 1

  console.log("upper_options + max_upper_options + nr_options",upper_options, max_upper_options, nr_options)

  for (j = nr_options; j <= max_upper_options; j++) {
      var element = "#cr56f_upperleather"
      var optionseq = j.toString().padStart(2, "0")
      $(element + optionseq).parent().parent().parent().parent().hide();
      console.log("element + optionseq",element, optionseq, j)
  }
}


function setLabels(add_label_lf, add_label_rf) {

    const array_placeholders = [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",                
        "",
        "",
        "",
        "",
        "mm",
        "",
        "mm",
        "mm",
        "mm",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
    ]

    var count_array = 0;
    var section_label = ""
    $('[class="tab-title"]').hide(); 

    // webresource_imagerocker()

    count_array = 0
    array_fields.forEach(element => {
        $("#" + element + "lf").attr("placeholder", array_placeholders[count_array]);
        $("#" + element + "rf").attr("placeholder", array_placeholders[count_array]);
        $("#" + element + "lf_label").text(array_labels[lang_index][count_array] + add_label_lf);
        $("#" + element + "rf_label").text(array_labels[lang_index][count_array] + add_label_rf);
        count_array += 1;
    });
// console.log("array_fields END")

    if (add_label_lf == '' && add_label_rf != "") {
        section_label = section_label_country[lang_index][0]
    }
    else if (add_label_lf != '' && add_label_rf == "") {
        section_label = section_label_country[lang_index][1]
    }

    // count_array = 0;
    // array_sections_trigger.forEach(element => {
    //     $(element + "_label").text(section_labels[lang_index][count_array] + section_label);
    //     count_array += 1;
    // });
// console.log("array_sections_trigger END")

        
    // count_array = 0;
    // array_booleans_lfrf.forEach(element => {
    //     $(element + "lf_label").text(booleans_labels_lfrf[lang_index][count_array] + add_label_lf);
    //     document.querySelector("label[for="+element.substring(1)+"lf_1]").innerHTML = booleans_yes[lang_index];
    //     document.querySelector("label[for="+element.substring(1)+"lf_0]").innerHTML = booleans_no[lang_index];

    //     $(element + "rf_label").text(booleans_labels_lfrf[lang_index][count_array] + add_label_rf);
    //     document.querySelector("label[for="+element.substring(1)+"rf_1]").innerHTML = booleans_yes[lang_index];
    //     document.querySelector("label[for="+element.substring(1)+"rf_0]").innerHTML = booleans_no[lang_index];

    //     count_array += 1;
    // });
// console.log("array_booleans_lfrf END")

// console.log("array_booleans START")

    // count_array = 0;
    // array_booleans.forEach(element => {
    //     console.log(element + "_label", booleans_labels[lang_index][count_array], count_array)
    //     $(element + "_label").text(booleans_labels[lang_index][count_array]);
    //     console.log("label[for="+element.substring(1)+"_1]")
    //     document.querySelector("label[for="+element.substring(1)+"_1]").innerHTML = booleans_yes[lang_index];
    //     console.log("label[for="+element.substring(1)+"_0]")
    //     document.querySelector("label[for="+element.substring(1)+"_0]").innerHTML = booleans_no[lang_index];

    //     count_array += 1;
    // });
// console.log("array_booleans END")

    // count_array = 0;
    // array_fields_trigger.forEach(element => {
    //     var name_field = element
    //     if (element.slice(-2) == "_1") {
    //         document.querySelector("label[for="+element.substring(1)+"]").innerHTML = booleans_yes[lang_index];
    //         name_field = element.slice(0, -1) + "label"
    //     }
    //     else if (element.slice(-2) == "_0") {
    //         document.querySelector("label[for="+element.substring(1)+"]").innerHTML = booleans_no[lang_index];
    //         name_field = ''
    //     }
    //     else {
    //          name_field += "_label"
    //     }

    //     if (name_field != '') {
    //         if (name_field.includes("lf_label")) {
    //         $(name_field).text(triggers_labels[lang_index][count_array] + add_label_lf);
    //         }
    //         else {
    //         $(name_field).text(triggers_labels[lang_index][count_array] + add_label_rf);
    //         }

    //         count_array += 1;
    //     }
    // });
// console.log("array_fields_trigger END")

    // $("#cr56f_comments_label").text(isolated_fields[lang_index][0]);
    // $("#cr56f_additionsconfirmation_label").text(isolated_fields[lang_index][1]);
    // $("#cr56f_style_label").text(isolated_fields[lang_index][2]);
    // $("#cr56f_style_color_label").text(isolated_fields[lang_index][3]);
    // $("#cr56f_closure_label").text(isolated_fields[lang_index][4]);
}
