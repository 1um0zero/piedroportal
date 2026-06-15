const array_labels = [
    ["Lateral Joint Width (mm)",
    "Medial Joint Width (mm)",
    "Lateral Heel Width (mm)",
    "Medial Heel Width (mm)",
    "Hammer Toe (mm)",
    "Toe Box (mm)",
    "Bunionette (mm)",
    "Hallux Valgus (mm)",
    "Depth to Forepart (mm)",
    "Depth to Toe Heel (mm)",
    "Extra Width on Cone (mm)",
    "Straighten Heel Clip (mm)",
    "Heel Depth Only (mm)",
    "Haglund Heel Exostosis (mm)",
    "Haglund Height (mm)",
    "Haglund Position (mm)",
    "Extra Space Medial Ankle (mm)",
    "Medial Ankle Height (mm)",
    "Extra Space Lateral Ankle (mm)",
    "Ankle Height (mm)",
    "Lining",
    "Closure Laces",
    "Closure Velcro Straps",
    "Stiffener Hardness",
    "Toe Puffs",
    "Instep more to the front",
    "Colour modifications",
    "Extra padding on tongue",
    "Zipper",
    "Rocker Sole Types",
    "Toes",
    "Joint",
    "Heel",
    "PU/EVA Bumper",
    "Sole",
    "Spoiler",
    "Sole Sheet",
    "Prefab Sole",
    "Sole Sheet",
    "Colour",
    "Medial",
    "Lateral",
    "Medial",
    "Lateral",
    "Medial",
    "Lateral",
    "Medial",
    "Lateral"],
    ["Lateraal Bal Verbreding (mm)",
        "Mediaal Bal Verbreding (mm)",
        "Lateraal Hiel Verbreding (mm)",
        "Mediaal Hiel Verbreding (mm)",
        "Hamer Tenen (mm)",
        "Teenhoogte (mm)",
        "Bunionette (mm)",
        "Hallux Valgus (mm)",
        "Voorvoet Verdieping (mm)",
        "Totaal Verdieping (mm)",
        "Wreefkap (mm)",
        "90° Hiel Lijn (mm)",
        "Verdieping Hak (mm)",
        "Haglund Exostosis (mm)",
        "Haglund hoogte (mm)",
        "Haglund positie (mm)",
        "Extra ruimte mediale enkel (mm)",
        "Mediale enkelhoogte (mm)",
        "Extra ruimte laterale enkel (mm)",
        "Enkelhoogte (mm)",
        "Voering",
        "Vetersluiting",
        "Klittenbandsluiting",
        "Contrefort Hardheid",
        "Neuskap",
        "Inschot meer naar voren",
        "Kleurwijzigingen",
        "Extra  tongpolstering",
        "Rits",
        "Type Afwikkeling",
        "Tenen",
        "Bal",
        "Hiel",
        "PU/EVA kuipzool",
        "Zool",
        "Spoiler",
        "Zoolplaat",
    "Prefab Zool",
    "Zoolplaat",
    "Kleur",
        "Mediaal",
        "Lateraal",
        "Mediaal",
        "Lateraal",
        "Mediaal",
        "Lateraal",
        "Mediaal",
        "Lateraal"],
    ["Largeur de l'articulation latérale (mm)",
        "Largeur de l'articulation médiale (mm)",
        "Largeur du talon latéral (mm)",
        "Largeur du talon médial (mm)",
        "Griffe d'Orteils (mm)",
        "Boîte à Orteils (mm)",
        "Bunions latéraux (mm)",
        "Hallux Valgus (mm)",
        "Profondeur jusqu'à l'avant du pied (mm)",
        "Profondeur jusqu'au talon de l'orteil (mm)",
        "Largeur supplémentaire sur le cône (mm)",
        "Redresser le clip de talon (mm)",
        "Profondeur du talon uniquement (mm)",
        "Exostose du talon de Haglund (mm)",
        "Hauteur de Haglund (mm)",
        "Position de Haglund (mm)",
        "Espace supplémentaire à la cheville médiale (mm)",
        "Hauteur de la cheville médiale (mm)",
        "Espace supplémentaire à la cheville latérale (mm)",
        "Hauteur de la cheville (mm)",
        "Doublure",
        "Lacets de Fermeture",
        "Fermeture à velcro",
        "Dureté du renfort",
        "Bout renforcé",
        "Coup de pied plus vers l'avant",
        "Modifications de couleur",
        "Rembourrage supplémentaire sur la languette",
        "Fermeture éclair",
        "Types de semelles",
        "Orteils",
        "La plante du pied",
        "Talon",
        "PU/EVA pare-chocs",
        "Semelle",
        "Spoiler",
        "Semelle",
    "Prefab Semelle",
    "Semelle",
    "Coleur",
        "Médial",
        "Latéral",
        "Médial",
        "Latéral",
        "Médial",
        "Latéral",
        "Médial",
        "Latéral"],
    ["laterale Gelenkbreite (mm)",
        "mediale Gelenkbreite (mm)",
        "laterale Fersenbreite (mm)",
        "mediale Fersenbreite (mm)",
        "Hammerzeh (mm)",
        "Toe Box (mm)",
        "Bunionette (mm)",
        "Hallux Valgus (mm)",
        "Tiefe bis zum Vorfuß (mm)",
        "Tiefe bis Zehenferse (mm)",
        "Extra Width on Cone (mm)",
        "Ferse begradigen (mm)",
        "Heel Depth Only (mm)",
        "Haglund Heel Exostosis (mm)",
        "Haglund Height (mm)",
        "Haglund Position (mm)",
        "Extra Platz im medialen Knöchelbereich (mm)",
        "Medial Ankle Height (mm)",
        "Extra Platz im lateralen Knöchelbereich (mm)",
        "Ankle Height (mm)",
        "Material",
        "Verschluß Schnürsenkel",
        "Verschluß Velcro Straps",
        "Stiffener Hardness",
        "Zehenpuffer",
        "Spann weiter vorne",
        "Farbänderungen",
        "Zungenpolsterung",
        "Reißverschluß",
        "Rolle Sohle Types",
        "Zehen",
        "Gelenkbreite",
        "Heel",
        "PU/EVA Bumper",
        "Sohle",
        "Spoiler",
        "Sohle Sheet",
    "Prefab Sohle",
    "Sohle Sheet",
    "Farbe",
        "Mediale",
        "Laterale",
        "Mediale",
        "Laterale",
        "Mediale",
        "Laterale",
        "Mediale",
        "Laterale"]        
]

const section_labels = [

    // // ["en-EN","Feet & Lower Leg Measurements"],
    ["Additions","Upper Adaptions","Sole & Heel Adaptions","Others"],

    // ["nl-NL","Feet & Lower Leg Measurements"],
    ["Leest Aanpassingen","Schacht aanpassingen","Zool- en Hakaanpassingen","Overige Aanpassingen"],

    // // ["en-EN","Feet & Lower Leg Measurements"],
    ["Suppléments","Principaux ajustements","Adaptations de la semelle et du talon","Autres"],
    ["Ergänzungen","Anpassungen am Schaft","Anpassungen an Sohle u. Absatz","Sonstige"]
]

const booleans_labels_lfrf = [
    ["Toe Puffs Rim",
        "Stretch Leather",
        "Removable Carbon Insole",
        "Full Carbon Sole Plate",
        "Sach Heel",
        "Separate Soles",
        "Separate Sheets",
        "Thomas Heel Medial",
        "Thomas Heel Lateral",
        "Welt Protector",
        "Protective Toe Cap"],
    ["Vleugel Neus",
        "Stretch leer",
        "Losse Carbon Binnenzool",
        "Carbon Zool Verstijving",
        "Buffer hak",
        "Loopzool los",
        "Loopplaat los",
        "Vleugelhak Mediaal",
        "Vleugelhak Lateraal",
        "Bescherming Aflapnaad",
        "Kruipneus"],
    ["Bordure de bouffantes pour orteils",
        "Cuir Extensible",
        "Semelle intérieure amovible en carbone",
        "Plaque de semelle en carbone complète",
        "Talon Sach",
        "Semelles séparées",
        "Feuilles de semelle séparées",
        "Talonnette Thomas médiale",
        "Talonnette Thomas laterale",
        "Protecteur de trépointe",
        "Coque de protection pour les orteils"],
    ["Zehenpuffer Rim",
        "Stretch Leather",
        "wechselbare Carbon-Innensohle",
        "Vollcarbon-Sohlenplatte",
        "Sach Heel",
        "Sohlen separat",
        "Separate Sheets",
        "Thomas Heel Medial",
        "Thomas Heel Lateral",
        "Rahmenschutz",
        "Zehenschutzkappe"]
]

const booleans_labels = [
    ["Extra Pair of Laces", 
        "No Piedro logo", 
        "Plastic Fitting shoes",        
        "Urgent"],
    ["Extra paar veters", 
        "Geen Piedro Logo", 
        "Plastic Passchoenen",        
        "Spoed"],
    ["Paire de lacets supplémentaires", 
        "Pas de logo Piedro", 
        "Chaussure d'essayage en plastique",        
        "Urgent"],
    ["Zusätzliches Paar Schnürsenkel", 
        "No Piedro logo", 
        "Probeschuhe aus Plastik",        
        "dringend"]
]


const triggers_labels = [
    ["Haglund Heel Exostosis",
        "Haglund Heel Exostosis",
        "Extra Space Medial Ankle",
        "Extra Space Medial Ankle",
        "Extra Space Lateral Ankle",
        "Extra Space Lateral Ankle",
        "Rocker Sole Types",
        "Rocker Sole Types",
        "Amendment PU/EVA Bumper",
        "Amendment PU/EVA Bumper",
        "Amendment Sole",
        "Amendment Sole",
    "Amendment Prefab Sole",
    "Amendment Prefab Sole",
    "Amendment Sole Sheet",
    "Amendment Sole Sheet",
        "Sole Float",
        "Sole Float",
        "Heel Float",
        "Heel Float",
        "Sole Wedge",
        "Sole Wedge",
        "Heel Wedge",
        "Heel Wedge"],
    ["Haglund Exostosis",
        "Haglund Exostosis",
        "Extra ruimte mediale enkel",
        "Extra ruimte mediale enkel",
        "Extra ruimte laterale enkel",
        "Extra ruimte laterale enkel",
        "Type Afwikkeling",
        "Type Afwikkeling",
        "Aanpassing PU/EVA Kuipzool",
        "Aanpassing PU/EVA Kuipzool",
        "Aanpassing Sole",
        "Aanpassing Sole",
    "Aanpassing Prefab Zool",
    "Aanpassing Prefab Zool",
    "Aanpassing Zoolplaat",
    "Aanpassing Zoolplaat",
        "Zool Schoring",
        "Zool Schoring",
        "Hak Schoring",
        "Hak Schoring",
        "Zool Wig",
        "Zool Wig",
        "Hak Wig",
        "Hak Wig"],
    ["Exostose du talon de Haglund",
        "Exostose du talon de Haglund",
        "Espace supplémentaire à la cheville médiale",
        "Espace supplémentaire à la cheville médiale",
        "Espace supplémentaire à la cheville laterale",
        "Espace supplémentaire à la cheville laterale",
        "Types de semelles",
        "Types de semelles",
        "Modification de pare-chocs PU/EVA",
        "Modification de pare-chocs PU/EVA",
        "Modification de semelle",
        "Modification de semelle",
    "Modification Prefab Sole",
    "Modification Prefab Sole",
    "Modification Sole Sheet",
    "Modification Sole Sheet",
        "Semelle flottante",
        "Semelle flottante",
        "Flottement du talon",
        "Flottement du talon",
        "Cale de semelle",
        "Cale de semelle",
        "Cale de talon",
        "Cale de talon"],
    ["Haglund Heel Exostosis",
        "Haglund Heel Exostosis",
        "Extra Platz im medialen Knöchelbereich",
        "Extra Platz im medialen Knöchelbereich",
        "Extra Platz im lateralen Knöchelbereich",
        "Extra Platz im lateralen Knöchelbereich",
        "Rocker Sole Types",
        "Rocker Sole Types",
        "Änderungen PU/EVA Bumper",
        "Änderungen PU/EVA Bumper",
        "Änderungen Sohle",
        "Änderungen Sohle",
    "Aanpassing Prefab Zool",
    "Aanpassing Prefab Zool",
    "Aanpassing Zoolplaat",
    "Aanpassing Zoolplaat",
        "Sohle Ausbau",
        "Sohle Ausbau",
        "Heel Ausbau",
        "Heel Ausbau",
        "Sohle Keil",
        "Sohle Keil",
        "Heel Keil",
        "Heel Keil"]
]

const isolated_fields = [
    ["Comments", "Additions", "Style", "Model", "Closure"],
    ["Opmerkingen", "Leest Aanpassingen", "Stijl", "Model", "Sluiting"],
    ["Observations", "Suppléments", "Style", "Modèle", "Fermeture"],
    ["Comments", "Ergänzungen", "Style", "Modell", "Verschluß"]
]

const array_dropdown_options = [
    [['Leather', 'Synthetic Fur', 'Real Fur', 'Sympatex', 'Diabetic', 'Microfiber'],
    ['Eyelets', 'Hooks', 'D-Rings', 'Blind Eyelets', 'Buckle & Strap', 'Twist Lock System'],
    ['Return Velcro', 'Lap-Over Velcro', 'Single Hand Velcro', 'Velcro Seperate'],
    ['Soft - 1.0 mm', 'Standard - 1.5 mm', 'Hard - 1.9 mm', 'Double - 2 x 1.5 mm', 'Extra padding - 6 mm'],
    ['Soft - 0.5 mm', 'Standard - 0.8 mm', 'Hard - 0.9 mm'],
    ['Medial Zipper Next to closure', 'Medial Zipper Side', 'Lateral Zipper Next to closure'],
    ['Normal Rocker', 'Advancing Rocker', 'Polyphase Rocker', 'Delaying Rocker', '2-Phase Rocker'],
    ['PU Black', 'PU White', 'EVA Black', 'EVA White'],
    ['EVA Black', 'EVA Taupe', 'EVA Grey', 'EVA White', 'EVA Lightweight Black', 'EVA Lightweight Taupe', 'SPORTIVE Black', 'SPORTIVE Beige', 'SPORTIVE Grey', 'SPORTIVE White', 'EVA Lightweight Amber', 'EVA Lightweight White', 'Full Rubber Black', 'Full Rubber Amber', 'Full Rubber Blue', 'Full Rubber Pink', 'Full Rubber White', 'EVA Brown'],
    ['Black', 'Dark Brown', 'Light Grey', 'Dark Grey', 'Dark Blue', 'Red', 'Amber', 'Cobalt'],    
    ['Piedro Runner Black', 'Piedro Runner Amber', 'Rubber Black', 'Rubber Amber', 'Fish Black', 'Fish Amber', 'Tire Black', 'Tire Amber', 'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber', 'EVA Lightweight Port Flex Black', 'EVA Lightweight Port Flex Amber', 'Lightweight Vibram Sole Black', 'Lightweight Vibram Sole Brown', 'Lightweight Sole Forli Uomo', 'Full Rubber Sole Montana Black', 'Full Rubber Sole Montana Brown', 'Nora Sole Plate Blue with Light Body Colour', 'Nora Sole Plate Black with Light Body Colour', 'Nora Sole Plate Black with Black Body Colour'],
    ['Sneaker White 09', 'Sneaker Light Beige 19', 'Sneaker Black 81', 'Runner White 09', 'Runner Light Grey 56', 'Runner Black 81'],
    ['EVA Lavero Soft 6 mm', 'EVA Lavero Soft 8 mm', 'EVA Mandorlo 6 mm', 'Optimum  6 mm', 'Vibram 8870 5 mm', 'Vibram 8860 6 mm', 'EVA Rubber Astro Star 4 mm', 'EVA Rubber Astro Star 6 mm', 'EVA Rubber Astrolight Delta 4 mm', 'EVA Rubber Astrolight Delta 6 mm', 'EVA Rubber Anna 4 mm', 'EVA Rubber Anna 6 mm', 'Lavero Flex Rubber 4 mm', 'Lavero Flex Rubber 6 mm', 'Rubber Tire 6 mm', 'Vibram 2002  6 mm', 'Jony Sole 6 mm', 'Astrolight Delta 6 mm', 'Tire 8 mm', 'Sportflex 8 mm'],  
    ['White', 'Beige', 'Light Beige', 'Mid Brown', 'Taupe', 'Brown', 'Grey', 'Blue', 'Black', 'Honey', 'Red', 'Orange', 'Yellow', 'Green'],
    ['Leather', 'Synthetic Fur', 'Real Fur', 'Sympatex', 'Diabetic', 'Microfiber'],
    ['Eyelets', 'Hooks', 'D-Rings', 'Blind Eyelets', 'Buckle & Strap', 'Twist Lock System'],
    ['Return Velcro', 'Lap-Over Velcro', 'Single Hand Velcro', 'Velcro Seperate'],
    ['Soft - 1.0 mm', 'Standard - 1.5 mm', 'Hard - 1.9 mm', 'Double - 2 x 1.5 mm', 'Extra padding - 6 mm'],
    ['Soft - 0.5 mm', 'Standard - 0.8 mm', 'Hard - 0.9 mm'],
    ['Medial Zipper Next to closure', 'Medial Zipper Side', 'Lateral Zipper Next to closure'],
    ['Normal Rocker', 'Advancing Rocker', 'Polyphase Rocker', 'Delaying Rocker', '2-Phase Rocker'],
    ['PU Black', 'PU White', 'EVA Black', 'EVA White'],
    ['EVA Black', 'EVA Taupe', 'EVA Grey', 'EVA White', 'EVA Lightweight Black', 'EVA Lightweight Taupe', 'SPORTIVE Black', 'SPORTIVE Beige', 'SPORTIVE Grey', 'SPORTIVE White', 'EVA Lightweight Amber', 'EVA Lightweight White', 'Full Rubber Black', 'Full Rubber Amber', 'Full Rubber Blue', 'Full Rubber Pink', 'Full Rubber White', 'EVA Brown'],
    ['Black', 'Dark Brown', 'Light Grey', 'Dark Grey', 'Dark Blue', 'Red', 'Amber', 'Cobalt'],    
    ['Piedro Runner Black', 'Piedro Runner Amber', 'Rubber Black', 'Rubber Amber', 'Fish Black', 'Fish Amber', 'Tire Black', 'Tire Amber', 'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber', 'EVA Lightweight Port Flex Black', 'EVA Lightweight Port Flex Amber', 'Lightweight Vibram Sole Black', 'Lightweight Vibram Sole Brown', 'Lightweight Sole Forli Uomo', 'Full Rubber Sole Montana Black', 'Full Rubber Sole Montana Brown', 'Nora Sole Plate Blue with Light Body Colour', 'Nora Sole Plate Black with Light Body Colour', 'Nora Sole Plate Black with Black Body Colour'],
    ['Sneaker White 09', 'Sneaker Light Beige 19', 'Sneaker Black 81', 'Runner White 09', 'Runner Light Grey 56', 'Runner Black 81'],
    ['EVA Lavero Soft 6 mm', 'EVA Lavero Soft 8 mm', 'EVA Mandorlo 6 mm', 'Optimum  6 mm', 'Vibram 8870 5 mm', 'Vibram 8860 6 mm', 'EVA Rubber Astro Star 4 mm', 'EVA Rubber Astro Star 6 mm', 'EVA Rubber Astrolight Delta 4 mm', 'EVA Rubber Astrolight Delta 6 mm', 'EVA Rubber Anna 4 mm', 'EVA Rubber Anna 6 mm', 'Lavero Flex Rubber 4 mm', 'Lavero Flex Rubber 6 mm', 'Rubber Tire 6 mm', 'Vibram 2002  6 mm', 'Jony Sole 6 mm', 'Astrolight Delta 6 mm', 'Tire 8 mm', 'Sportflex 8 mm'],  
    ['White', 'Beige', 'Light Beige', 'Mid Brown', 'Taupe', 'Brown', 'Grey', 'Blue', 'Black', 'Honey', 'Red', 'Orange', 'Yellow', 'Green'],
    ['Additions confirmed', 'No additions']
],
    [['Leer', 'Synthetisch Bont', 'Lamsvacht', 'Sympatex', 'Diabetisch', 'Microfiber'],
    ['Veterring', 'Haken', 'D-Ringen', 'Blinde Ringen', 'Gesp & Band', 'Twist Lock System'],
    ['Klittenband', 'Kruis Klittenband', 'Eenhands Sluiting', 'Losse Klittenband'],
    ['Zacht - 1.0 mm', 'Standaard - 1.5 mm', 'Hard - 1.9 mm', 'Dubbel - 2 x 1.5 mm', 'Extra Polstering - 6 mm'],
    ['Zacht - 0.5 mm', 'Standaard - 0.8 mm', 'Hard - 0.9 mm'],
    ['Langs vetersluiting mediaal', 'Mediaal', 'Langs vetersluiting Lateraal'],
    ['Normal Afwikkeling', 'Versnelde Afwikkeling', 'Polyfasisch Afwikkeling', 'Vertraagde Rocker', '2 Fase Afwikkeling'],
    ['PU Black', 'PU White', 'EVA Black', 'EVA White'],
    ['EVA Black', 'EVA Taupe', 'EVA Grey', 'EVA White', 'EVA Lightweight Black', 'EVA Lightweight Taupe', 'SPORTIVE Black', 'SPORTIVE Beige', 'SPORTIVE Grey', 'SPORTIVE White', 'EVA Lightweight Amber', 'EVA Lightweight White', 'Full Rubber Black', 'Full Rubber Amber', 'Full Rubber Blue', 'Full Rubber Pink', 'Full Rubber White', 'EVA Brown'],
    ['Black', 'Dark Brown', 'Light Grey', 'Dark Grey', 'Dark Blue', 'Red', 'Amber', 'Cobalt'],    
    ['Piedro Runner Black', 'Piedro Runner Amber', 'Rubber Black', 'Rubber Amber', 'Fish Black', 'Fish Amber', 'Tire Black', 'Tire Amber', 'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber', 'EVA Lightweight Port Flex Black', 'EVA Lightweight Port Flex Amber', 'Lightweight Vibram Sole Black', 'Lightweight Vibram Sole Brown', 'Lightweight Sole Forli Uomo', 'Full Rubber Sole Montana Black', 'Full Rubber Sole Montana Brown', 'Nora Sole Plate Blue with Light Body Colour', 'Nora Sole Plate Black with Light Body Colour', 'Nora Sole Plate Black with Black Body Colour'],
    ['Sneaker White 09', 'Sneaker Light Beige 19', 'Sneaker Black 81', 'Runner White 09', 'Runner Light Grey 56', 'Runner Black 81'],
    ['EVA Lavero Soft 6 mm', 'EVA Lavero Soft 8 mm', 'EVA Mandorlo 6 mm', 'Optimum  6 mm', 'Vibram 8870 5 mm', 'Vibram 8860 6 mm', 'EVA Rubber Astro Star 4 mm', 'EVA Rubber Astro Star 6 mm', 'EVA Rubber Astrolight Delta 4 mm', 'EVA Rubber Astrolight Delta 6 mm', 'EVA Rubber Anna 4 mm', 'EVA Rubber Anna 6 mm', 'Lavero Flex Rubber 4 mm', 'Lavero Flex Rubber 6 mm', 'Rubber Tire 6 mm', 'Vibram 2002  6 mm', 'Jony Sole 6 mm', 'Astrolight Delta 6 mm', 'Tire 8 mm', 'Sportflex 8 mm'],  
    ['White', 'Beige', 'Light Beige', 'Mid Brown', 'Taupe', 'Brown', 'Grey', 'Blue', 'Black', 'Honey', 'Red', 'Orange', 'Yellow', 'Green'],
    ['Leer', 'Synthetisch Bont', 'Lamsvacht', 'Sympatex', 'Diabetisch', 'Microfiber'],
    ['Veterring', 'Haken', 'D-Ringen', 'Blinde Ringen', 'Gesp & Band', 'Twist Lock System'],
    ['Klittenband', 'Kruis Klittenband', 'Eenhands Sluiting', 'Losse Klittenband'],
    ['Zacht - 1.0 mm', 'Standaard - 1.5 mm', 'Hard - 1.9 mm', 'Dubbel - 2 x 1.5 mm', 'Extra Polstering - 6 mm'],
    ['Zacht - 0.5 mm', 'Standaard - 0.8 mm', 'Hard - 0.9 mm'],
    ['Langs vetersluiting mediaal', 'Mediaal', 'Langs vetersluiting Lateraal'],
    ['Normal Afwikkeling', 'Versnelde Afwikkeling', 'Polyfasisch Afwikkeling', 'Vertraagde Afwikkeling', '2 Fase Afwikkeling'],
    ['PU Black', 'PU White', 'EVA Black', 'EVA White'],
    ['EVA Black', 'EVA Taupe', 'EVA Grey', 'EVA White', 'EVA Lightweight Black', 'EVA Lightweight Taupe', 'SPORTIVE Black', 'SPORTIVE Beige', 'SPORTIVE Grey', 'SPORTIVE White', 'EVA Lightweight Amber', 'EVA Lightweight White', 'Full Rubber Black', 'Full Rubber Amber', 'Full Rubber Blue', 'Full Rubber Pink', 'Full Rubber White', 'EVA Brown'],
    ['Black', 'Dark Brown', 'Light Grey', 'Dark Grey', 'Dark Blue', 'Red', 'Amber', 'Cobalt'],    
    ['Piedro Runner Black', 'Piedro Runner Amber', 'Rubber Black', 'Rubber Amber', 'Fish Black', 'Fish Amber', 'Tire Black', 'Tire Amber', 'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber', 'EVA Lightweight Port Flex Black', 'EVA Lightweight Port Flex Amber', 'Lightweight Vibram Sole Black', 'Lightweight Vibram Sole Brown', 'Lightweight Sole Forli Uomo', 'Full Rubber Sole Montana Black', 'Full Rubber Sole Montana Brown', 'Nora Sole Plate Blue with Light Body Colour', 'Nora Sole Plate Black with Light Body Colour', 'Nora Sole Plate Black with Black Body Colour'],
    ['Sneaker White 09', 'Sneaker Light Beige 19', 'Sneaker Black 81', 'Runner White 09', 'Runner Light Grey 56', 'Runner Black 81'],
    ['EVA Lavero Soft 6 mm', 'EVA Lavero Soft 8 mm', 'EVA Mandorlo 6 mm', 'Optimum  6 mm', 'Vibram 8870 5 mm', 'Vibram 8860 6 mm', 'EVA Rubber Astro Star 4 mm', 'EVA Rubber Astro Star 6 mm', 'EVA Rubber Astrolight Delta 4 mm', 'EVA Rubber Astrolight Delta 6 mm', 'EVA Rubber Anna 4 mm', 'EVA Rubber Anna 6 mm', 'Lavero Flex Rubber 4 mm', 'Lavero Flex Rubber 6 mm', 'Rubber Tire 6 mm', 'Vibram 2002  6 mm', 'Jony Sole 6 mm', 'Astrolight Delta 6 mm', 'Tire 8 mm', 'Sportflex 8 mm'],  
    ['White', 'Beige', 'Light Beige', 'Mid Brown', 'Taupe', 'Brown', 'Grey', 'Blue', 'Black', 'Honey', 'Red', 'Orange', 'Yellow', 'Green'],
    ['Aanpassingen bevestigd', 'Geen aanpassingen']
],
    [['Cuir', 'Synthétique Fourrure', 'Vrai Fourrure', 'Sympatex', 'Diabetique', 'Microfiber'],
    ['Œillets', 'Crochets', 'Anneaux en D', 'Anneaux aveugles', 'Boucle et Sangle', 'Twist Lock System'],
    ['Velcro de retour', 'Velcro à recouvrement', 'Velcro à une main', 'Velcro séparé'],
    ['Doux - 1.0 mm', 'Standard - 1.5 mm', 'Dur - 1.9 mm', 'Double - 2 x 1.5 mm', 'Rembourrage supplémentaire - 6 mm'],
    ['Doux - 0.5 mm', 'Standard - 0.8 mm', 'Dur - 0.9 mm'],
    ['Fermeture éclair médiale à côté de la fermeture', 'Côté fermeture éclair médiale', 'Fermeture éclair latérale à côté de la fermeture'],
    ['Normal Rocker', 'Advancing Rocker', 'Polyphase Rocker', 'Delaying Rocker', '2-Phase Rocker'],
    ['PU Black', 'PU White', 'EVA Black', 'EVA White'],
    ['EVA Black', 'EVA Taupe', 'EVA Grey', 'EVA White', 'EVA Lightweight Black', 'EVA Lightweight Taupe', 'SPORTIVE Black', 'SPORTIVE Beige', 'SPORTIVE Grey', 'SPORTIVE White', 'EVA Lightweight Amber', 'EVA Lightweight White', 'Full Rubber Black', 'Full Rubber Amber', 'Full Rubber Blue', 'Full Rubber Pink', 'Full Rubber White', 'EVA Brown'],
    ['Black', 'Dark Brown', 'Light Grey', 'Dark Grey', 'Dark Blue', 'Red', 'Amber', 'Cobalt'],    
    ['Piedro Runner Black', 'Piedro Runner Amber', 'Rubber Black', 'Rubber Amber', 'Fish Black', 'Fish Amber', 'Tire Black', 'Tire Amber', 'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber', 'EVA Lightweight Port Flex Black', 'EVA Lightweight Port Flex Amber', 'Lightweight Vibram Sole Black', 'Lightweight Vibram Sole Brown', 'Lightweight Sole Forli Uomo', 'Full Rubber Sole Montana Black', 'Full Rubber Sole Montana Brown', 'Nora Sole Plate Blue with Light Body Colour', 'Nora Sole Plate Black with Light Body Colour', 'Nora Sole Plate Black with Black Body Colour'],
    ['Sneaker White 09', 'Sneaker Light Beige 19', 'Sneaker Black 81', 'Runner White 09', 'Runner Light Grey 56', 'Runner Black 81'],
    ['EVA Lavero Soft 6 mm', 'EVA Lavero Soft 8 mm', 'EVA Mandorlo 6 mm', 'Optimum  6 mm', 'Vibram 8870 5 mm', 'Vibram 8860 6 mm', 'EVA Rubber Astro Star 4 mm', 'EVA Rubber Astro Star 6 mm', 'EVA Rubber Astrolight Delta 4 mm', 'EVA Rubber Astrolight Delta 6 mm', 'EVA Rubber Anna 4 mm', 'EVA Rubber Anna 6 mm', 'Lavero Flex Rubber 4 mm', 'Lavero Flex Rubber 6 mm', 'Rubber Tire 6 mm', 'Vibram 2002  6 mm', 'Jony Sole 6 mm', 'Astrolight Delta 6 mm', 'Tire 8 mm', 'Sportflex 8 mm'],  
    ['White', 'Beige', 'Light Beige', 'Mid Brown', 'Taupe', 'Brown', 'Grey', 'Blue', 'Black', 'Honey', 'Red', 'Orange', 'Yellow', 'Green'],
    ['Cuir', 'Synthétique Fourrure', 'Vrai Fourrure', 'Sympatex', 'Diabetique', 'Microfiber'],
    ['Œillets', 'Crochets', 'Anneaux en D', 'Anneaux aveugles', 'Boucle et Sangle', 'Twist Lock System'],
    ['Velcro de retour', 'Velcro à recouvrement', 'Velcro à une main', 'Velcro séparé'],
    ['Doux - 1.0 mm', 'Standard - 1.5 mm', 'Dur - 1.9 mm', 'Double - 2 x 1.5 mm', 'Rembourrage supplémentaire - 6 mm'],
    ['Doux - 0.5 mm', 'Standard - 0.8 mm', 'Dur - 0.9 mm'],
    ['Fermeture éclair médiale à côté de la fermeture', 'Côté fermeture éclair médiale', 'Fermeture éclair latérale à côté de la fermeture'],
    ['Normal Rocker', 'Advancing Rocker', 'Polyphase Rocker', 'Delaying Rocker', '2-Phase Rocker'],
    ['PU Black', 'PU White', 'EVA Black', 'EVA White'],
    ['EVA Black', 'EVA Taupe', 'EVA Grey', 'EVA White', 'EVA Lightweight Black', 'EVA Lightweight Taupe', 'SPORTIVE Black', 'SPORTIVE Beige', 'SPORTIVE Grey', 'SPORTIVE White', 'EVA Lightweight Amber', 'EVA Lightweight White', 'Full Rubber Black', 'Full Rubber Amber', 'Full Rubber Blue', 'Full Rubber Pink', 'Full Rubber White', 'EVA Brown'],
    ['Black', 'Dark Brown', 'Light Grey', 'Dark Grey', 'Dark Blue', 'Red', 'Amber', 'Cobalt'],    
    ['Piedro Runner Black', 'Piedro Runner Amber', 'Rubber Black', 'Rubber Amber', 'Fish Black', 'Fish Amber', 'Tire Black', 'Tire Amber', 'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber', 'EVA Lightweight Port Flex Black', 'EVA Lightweight Port Flex Amber', 'Lightweight Vibram Sole Black', 'Lightweight Vibram Sole Brown', 'Lightweight Sole Forli Uomo', 'Full Rubber Sole Montana Black', 'Full Rubber Sole Montana Brown', 'Nora Sole Plate Blue with Light Body Colour', 'Nora Sole Plate Black with Light Body Colour', 'Nora Sole Plate Black with Black Body Colour'],
    ['Sneaker White 09', 'Sneaker Light Beige 19', 'Sneaker Black 81', 'Runner White 09', 'Runner Light Grey 56', 'Runner Black 81'],
    ['EVA Lavero Soft 6 mm', 'EVA Lavero Soft 8 mm', 'EVA Mandorlo 6 mm', 'Optimum  6 mm', 'Vibram 8870 5 mm', 'Vibram 8860 6 mm', 'EVA Rubber Astro Star 4 mm', 'EVA Rubber Astro Star 6 mm', 'EVA Rubber Astrolight Delta 4 mm', 'EVA Rubber Astrolight Delta 6 mm', 'EVA Rubber Anna 4 mm', 'EVA Rubber Anna 6 mm', 'Lavero Flex Rubber 4 mm', 'Lavero Flex Rubber 6 mm', 'Rubber Tire 6 mm', 'Vibram 2002  6 mm', 'Jony Sole 6 mm', 'Astrolight Delta 6 mm', 'Tire 8 mm', 'Sportflex 8 mm'],  
    ['White', 'Beige', 'Light Beige', 'Mid Brown', 'Taupe', 'Brown', 'Grey', 'Blue', 'Black', 'Honey', 'Red', 'Orange', 'Yellow', 'Green'],
    ['Suppléments confirmés', 'Aucun suppléments']
],
    [['Leder', 'Synthetik Fell', 'Lammfell', 'Sympatex', 'Diabetiker', 'Microfiber'],
    ['Ösen', 'Haken', 'D-Ringen', 'Blindösen', 'Schnallen und Riemen', 'Twist Lock System'],
    ['Umlenkklettverschluß', 'Klettverschluß überlappend', 'Einhandklettverschluß', 'Velcro Seperate'],
    ['weich - 1.0 mm', 'Standard - 1.5 mm', 'hart - 1.9 mm', 'doppelt - 2 x 1.5 mm', 'zusätzliche Polsterung - 6 mm'],
    ['weich - 0.5 mm', 'Standard - 0.8 mm', 'hart - 0.9 mm'],
    ['Medial Zipper Next to closure', 'Medial Zipper Side', 'Lateral Zipper Next to closure'],
    ['Mittelfußrolle', 'Vorgerückte Rolle', 'mehrphasige Rolle', 'Verzögerte Rolle', '2 Phasen Rolle'],
    ['PU Schwarz', 'PU Weiß', 'EVA Schwarz', 'EVA Weiß'],
    ['EVA Schwarz', 'EVA Taupe', 'EVA Grau', 'EVA Weiß', 'EVA Lightweight Schwarz', 'EVA Lightweight Taupe', 'SPORTIVE Schwarz', 'SPORTIVE Beige', 'SPORTIVE Grau', 'SPORTIVE Weiß', 'EVA Lightweight Amber', 'EVA Lightweight Weiß', 'Full Rubber Schwarz', 'Full Rubber Amber', 'Full Rubber Blau', 'Full Rubber Rosa', 'Full Rubber Weiß', 'EVA Braun'],
    ['Schwarz', 'Dunkelbraun', 'Light Grau', 'Dunkelgrau', 'Dunkelblau', 'Red', 'Amber', 'Cobalt'],    
    ['Piedro Runner Schwarz', 'Piedro Runner Amber', 'Rubber Schwarz', 'Rubber Amber', 'Fish Schwarz', 'Fish Amber', 'Tire Schwarz', 'Tire Amber', 'EVA Nora Astro Star Lightweight Schwarz', 'EVA Nora Astro Star Lightweight Amber', 'EVA Lightweight Port Flex Schwarz', 'EVA Lightweight Port Flex Amber', 'Lightweight Vibram Sole Schwarz', 'Lightweight Vibram Sole Braun', 'Lightweight Sole Forli Uomo', 'Full Rubber Sole Montana Schwarz', 'Full Rubber Sole Montana Braun', 'Nora Sole Plate Blau with Light Body Colour', 'Nora Sole Plate Schwarz with Light Body Colour', 'Nora Sole Plate Schwarz with Schwarz Body Colour'],      
    ['Sneaker White 09', 'Sneaker Light Beige 19', 'Sneaker Black 81', 'Runner White 09', 'Runner Light Grey 56', 'Runner Black 81'],
    ['EVA Lavero Soft 6 mm', 'EVA Lavero Soft 8 mm', 'EVA Mandorlo 6 mm', 'Optimum  6 mm', 'Vibram 8870 5 mm', 'Vibram 8860 6 mm', 'EVA Rubber Astro Star 4 mm', 'EVA Rubber Astro Star 6 mm', 'EVA Rubber Astrolight Delta 4 mm', 'EVA Rubber Astrolight Delta 6 mm', 'EVA Rubber Anna 4 mm', 'EVA Rubber Anna 6 mm', 'Lavero Flex Rubber 4 mm', 'Lavero Flex Rubber 6 mm', 'Rubber Tire 6 mm', 'Vibram 2002  6 mm', 'Jony Sole 6 mm', 'Astrolight Delta 6 mm', 'Tire 8 mm', 'Sportflex 8 mm'],  
    ['White', 'Beige', 'Light Beige', 'Mid Brown', 'Taupe', 'Brown', 'Grey', 'Blue', 'Black', 'Honey', 'Red', 'Orange', 'Yellow', 'Green'],
    ['Leder', 'Synthetik Fell', 'Lammfell', 'Sympatex', 'Diabetiker', 'Microfiber'],
    ['Ösen', 'Haken', 'D-Ringen', 'Blindösen', 'Schnallen und Riemen', 'Twist Lock System'],
    ['Umlenkklettverschluß', 'Klettverschluß überlappend', 'Einhandklettverschluß', 'Velcro Seperate'],
    ['weich - 1.0 mm', 'Standard - 1.5 mm', 'hart - 1.9 mm', 'doppelt - 2 x 1.5 mm', 'zusätzliche Polsterung - 6 mm'],
    ['weich - 0.5 mm', 'Standard - 0.8 mm', 'hart - 0.9 mm'],
    ['Medial Zipper Next to closure', 'Medial Zipper Side', 'Lateral Zipper Next to closure'],
    ['Mittelfußrolle', 'Vorgerückte Rolle', 'mehrphasige Rolle', 'Verzögerte Rolle', '2 Phasen Rolle'],
    ['PU Schwarz', 'PU Weiß', 'EVA Schwarz', 'EVA Weiß'],
    ['EVA Schwarz', 'EVA Taupe', 'EVA Grau', 'EVA Weiß', 'EVA Lightweight Schwarz', 'EVA Lightweight Taupe', 'SPORTIVE Schwarz', 'SPORTIVE Beige', 'SPORTIVE Grau', 'SPORTIVE Weiß', 'EVA Lightweight Amber', 'EVA Lightweight Weiß', 'Full Rubber Schwarz', 'Full Rubber Amber', 'Full Rubber Blau', 'Full Rubber Rosa', 'Full Rubber Weiß', 'EVA Braun'],
    ['Schwarz', 'Dunkelbraun', 'Light Grau', 'Dunkelgrau', 'Dunkelblau', 'Red', 'Amber', 'Cobalt'],    
    ['Piedro Runner Schwarz', 'Piedro Runner Amber', 'Rubber Schwarz', 'Rubber Amber', 'Fish Schwarz', 'Fish Amber', 'Tire Schwarz', 'Tire Amber', 'EVA Nora Astro Star Lightweight Schwarz', 'EVA Nora Astro Star Lightweight Amber', 'EVA Lightweight Port Flex Schwarz', 'EVA Lightweight Port Flex Amber', 'Lightweight Vibram Sole Schwarz', 'Lightweight Vibram Sole Braun', 'Lightweight Sole Forli Uomo', 'Full Rubber Sole Montana Schwarz', 'Full Rubber Sole Montana Braun', 'Nora Sole Plate Blau with Light Body Colour', 'Nora Sole Plate Schwarz with Light Body Colour', 'Nora Sole Plate Schwarz with Schwarz Body Colour'],      
    ['Sneaker White 09', 'Sneaker Light Beige 19', 'Sneaker Black 81', 'Runner White 09', 'Runner Light Grey 56', 'Runner Black 81'],
    ['EVA Lavero Soft 6 mm', 'EVA Lavero Soft 8 mm', 'EVA Mandorlo 6 mm', 'Optimum  6 mm', 'Vibram 8870 5 mm', 'Vibram 8860 6 mm', 'EVA Rubber Astro Star 4 mm', 'EVA Rubber Astro Star 6 mm', 'EVA Rubber Astrolight Delta 4 mm', 'EVA Rubber Astrolight Delta 6 mm', 'EVA Rubber Anna 4 mm', 'EVA Rubber Anna 6 mm', 'Lavero Flex Rubber 4 mm', 'Lavero Flex Rubber 6 mm', 'Rubber Tire 6 mm', 'Vibram 2002  6 mm', 'Jony Sole 6 mm', 'Astrolight Delta 6 mm', 'Tire 8 mm', 'Sportflex 8 mm'],  
    ['White', 'Beige', 'Light Beige', 'Mid Brown', 'Taupe', 'Brown', 'Grey', 'Blue', 'Black', 'Honey', 'Red', 'Orange', 'Yellow', 'Green'],
    ['Additions confirmed', 'No additions']
]
]

// bumper, sole, sole sheet, spoiler
const array_sole_amendments = [
    [['PU White', 'PU Black'], [], ['Fish Black', 'Fish Amber'], []],
    [[], ['EVA Lightweight Black', 'EVA Lightweight Amber', 'EVA Lightweight Off-White', 'Full Rubber Black', 'Full Rubber Amber', 'Full Rubber Blue', 'Full Rubber Pink', 'Full Rubber White'], [], []],
    [[], ['EVA Sole Black', 'EVA Sole Grey', 'EVA Sole White', 'EVA Sole Brown'], ['Piedro Black', 'Piedro Amber', 'Fish Black', 'Fish Amber'], []],
    [['PU White', 'PU Black'], [], ['Rubber Tire Black', 'Rubber Tire Amber', 'Fish Black', 'Fish Amber', 'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber'], []],
    [[], ['EVA Sole Grey', 'EVA Sole White', 'EVA Sole Taupe'], ['Rubber Tire Black', 'Rubber Tire Amber', 'Fish Black', 'Fish Amber', 'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber'], ['Black', 'Dark Brown', 'Light Grey', 'Dark Grey', 'Dark Blue', 'Red', 'Amber', 'Cobalt']], 
    [[], ['SPORTIVE White', 'SPORTIVE Black', 'SPORTIVE Beige', 'SPORTIVE Grey'], ['Rubber Tire Black', 'Rubber Tire Amber', 'Fish Black', 'Fish Amber', 'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber'], []],
    [[], ['EVA Sole Taupe', 'EVA Sole Black'], ['EVA Nora Astro Star Lightweight Sole Amber', 'EVA Nora Astro Star Lightweight Sole Black'], []],
    [[], ['EVA Lightweight Taupe', 'EVA Lightweight Black'], [], []],
    [['EVA White', 'EVA Black'], [], ['Rubber Tire Black', 'Rubber Tire Amber', 'Fish Black', 'Fish Amber', 'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight Amber'], []],
    [[], ['Lightweight Vibram Sole Black', 'Lightweight Vibram Sole Brown', 'Lightweight Sole Forli Uomo', 'Full Rubber Sole Monotana Black', 'Full Rubber Sole Monotana Brown'], [], []],    
    [[], ['Nora Sole Plate Blue with Light Body Colour', 'Nora Sole Plate Black with Light Body Colour', 'Nora Sole Plate Black with Black Body Colour']]
]



const array_fields_by_section = [
    ["#cr56f_lateraljointwidth", "#cr56f_medialjointwidth", "#cr56f_lateralheelwidth", "#cr56f_medialheelwidth", "#cr56f_2hammertoe",
        "#cr56f_2toebox", "#cr56f_2bunionette", "#cr56f_2halluxvalgus", "#cr56f_2depthtoforepart",
        "#cr56f_2depthtotoeheel", "#cr56f_2extrawidthoncone", "#cr56f_2straightenheelclip", "#cr56f_2heeldepthonly",
        "#cr56f_2haglundheelexostosis",
        "#cr56f_3extraspacemedialankle",
        "#cr56f_3extraspacelateralankle"
    ],
    ["#cr56f_lining", "#cr56f_closurelaces", "#cr56f_closurevelcrostraps", "#cr56f_stiffenerhardness", "#cr56f_toepuffs", 
        "#cr56f_toepuffsrimlf_0", "#cr56f_stretchleatherlf_0", 
        "#cr56f_instepmoretothefront", "#cr56f_colourmodifications", "#cr56f_extrapaddingontongue", "#cr56f_zipper"
    ],
    ["#cr56f_2rockersoletypes",
        "#cr56f_6soleamendement2lf_0",
        "#cr56f_6soleamendement1lf_0",
        "#cr56f_7zsmprefabsoleamendementlf_0",
        "#cr56f_7zsmsolesheetamendementlf_0",
        "#cr56f_3solefloatlf_0",
        "#cr56f_3heelfloatlf_0",
        "#cr56f_4solewedgelf_0",
        "#cr56f_4heelwedgelf_0",
        "#cr56f_6removablecarboninsolelf_0", "#cr56f_6fullcarbonsoleplatelf_0", "#cr56f_6sachheellf_0", 
        "#cr56f_6separatesoleslf_0", "#cr56f_6separatesheetslf_0",
        "#cr56f_6thomasheelmediallf_0", "#cr56f_6thomasheellaterallf_0"
    ],
    ["#cr56f_7weltprotectorlf_0", "#cr56f_7protectivetoecaplf_0",
        "#cr56f_comments",
        "#cr56f_7extrapairoflaces_1", "#cr56f_nopiedrologo_1", "#cr56f_7plasticfittingshoes_1", "#cr56f_7urgent_1"
]
]


const array_sub_sections = [
    // ["section_01img01", "section_01img02"],
    ["section3D"],
    [],
    ["section_03020","section_03025","zsmsection","section_03030","section_03040","section_03050","section_03060","section_03070"],
    []
]

const array_fields = [
    "cr56f_lateraljointwidth", 
    "cr56f_medialjointwidth", 
    "cr56f_lateralheelwidth", 
    "cr56f_medialheelwidth",
    "cr56f_2hammertoe",
    "cr56f_2toebox",
    "cr56f_2bunionette",
    "cr56f_2halluxvalgus",
    "cr56f_2depthtoforepart",
    "cr56f_2depthtotoeheel",
    "cr56f_2extrawidthoncone",
    "cr56f_2straightenheelclip",
    "cr56f_2heeldepthonly",
    "cr56f_2haglundheelexostosis",
    "cr56f_3haglund_height_conditional",
    "cr56f_3haglund_position_conditional",
    "cr56f_3extraspacemedialankle",
    "cr56f_3mankle_height_conditional",
    "cr56f_3extraspacelateralankle",
    "cr56f_3ankle_height_conditional",
    "cr56f_lining",
    "cr56f_closurelaces",
    "cr56f_closurevelcrostraps",
    "cr56f_stiffenerhardness",
    "cr56f_toepuffs",
    "cr56f_instepmoretothefront",
    "cr56f_colourmodifications",
    "cr56f_extrapaddingontongue", 
    "cr56f_zipper",
    "cr56f_2rockersoletypes",
    "cr56f_2toes",
    "cr56f_2joint",
    "cr56f_2heel",
    "cr56f_6puevabumper",
    "cr56f_6evawedgecolour",
    "cr56f_6spoiler",
    "cr56f_6runnersole",
    "cr56f_7zsmprefabsole",
    "cr56f_7zsmsolesheet",
    "cr56f_7zsmsolesheetcolour",
    "cr56f_3sf_medial",
    "cr56f_3sf_lateral",
    "cr56f_3hf_medial",
    "cr56f_3hf_lateral",
    "cr56f_4sw_medial",
    "cr56f_4sw_lateral",
    "cr56f_4hw_medial",
    "cr56f_4hw_lateral"
]


const array_booleans_lfrf = [
    "#cr56f_toepuffsrim",
    "#cr56f_stretchleather",
    "#cr56f_6removablecarboninsole",
    "#cr56f_6fullcarbonsoleplate",
    "#cr56f_6sachheel",
    "#cr56f_6separatesoles",
    "#cr56f_6separatesheets",
    "#cr56f_6thomasheelmedial",
    "#cr56f_6thomasheellateral",
    "#cr56f_7weltprotector",
    "#cr56f_7protectivetoecap"
]

const array_booleans = [
    "#cr56f_7extrapairoflaces", 
    "#cr56f_nopiedrologo", 
    "#cr56f_7plasticfittingshoes", 
    "#cr56f_7urgent"
]

const array_sections_trigger = [
    // "#cr56f_checkboxsection3",
    "#cr56f_checkboxsection4",
    "#cr56f_checkboxsection5",
    "#cr56f_checkboxsection6",
    "#cr56f_checkboxsection7"
]


const array_fields_trigger_by_section = [
    [-1], [0, 5], [6, 35]
]

const array_fields_trigger = [
    "#cr56f_2haglundheelexostosislf",
    "#cr56f_2haglundheelexostosisrf",
    "#cr56f_3extraspacemedialanklelf",
    "#cr56f_3extraspacemedialanklerf",
    "#cr56f_3extraspacelateralanklelf",
    "#cr56f_3extraspacelateralanklerf",
    "#cr56f_2rockersoletypeslf",
    "#cr56f_2rockersoletypesrf",
    "#cr56f_6soleamendement2lf_1",
    "#cr56f_6soleamendement2lf_0",
    "#cr56f_6soleamendement2rf_1",
    "#cr56f_6soleamendement2rf_0",
    "#cr56f_6soleamendement1lf_1",
    "#cr56f_6soleamendement1lf_0",
    "#cr56f_6soleamendement1rf_1",
    "#cr56f_6soleamendement1rf_0",
    "#cr56f_7zsmprefabsoleamendementlf_1",
    "#cr56f_7zsmprefabsoleamendementlf_0",
    "#cr56f_7zsmprefabsoleamendementrf_1",
    "#cr56f_7zsmprefabsoleamendementrf_0",
    "#cr56f_7zsmsolesheetamendementlf_1",
    "#cr56f_7zsmsolesheetamendementlf_0",
    "#cr56f_7zsmsolesheetamendementrf_1",
    "#cr56f_7zsmsolesheetamendementrf_0",
    "#cr56f_3solefloatlf_1",
    "#cr56f_3solefloatlf_0",
    "#cr56f_3solefloatrf_1",
    "#cr56f_3solefloatrf_0",
    "#cr56f_3heelfloatlf_1",
    "#cr56f_3heelfloatlf_0",
    "#cr56f_3heelfloatrf_1",
    "#cr56f_3heelfloatrf_0",
    "#cr56f_4solewedgelf_1",
    "#cr56f_4solewedgelf_0",
    "#cr56f_4solewedgerf_1",
    "#cr56f_4solewedgerf_0",
    "#cr56f_4heelwedgelf_1",
    "#cr56f_4heelwedgelf_0",
    "#cr56f_4heelwedgerf_1",
    "#cr56f_4heelwedgerf_0"
]

const array_fields_to_toggle = [
    ["", "", "#cr56f_3haglund_height_conditionallf", "#cr56f_3haglund_position_conditionallf"],
    ["", "", "#cr56f_3haglund_height_conditionalrf", "#cr56f_3haglund_position_conditionalrf"],
    ["", "", "#cr56f_3mankle_height_conditionallf"],
    ["", "", "#cr56f_3mankle_height_conditionalrf"],
    ["", "", "#cr56f_3ankle_height_conditionallf"],
    ["", "", "#cr56f_3ankle_height_conditionalrf"],
    ["", "", "#cr56f_2toeslf", "#cr56f_2jointlf", "#cr56f_2heellf"],
    ["", "", "#cr56f_2toesrf", "#cr56f_2jointrf", "#cr56f_2heelrf"],
    ["show", "", "#cr56f_6puevabumperlf"],
    ["hide", "", "#cr56f_6puevabumperlf"],
    ["show", "", "#cr56f_6puevabumperrf"],
    ["hide", "", "#cr56f_6puevabumperrf"],
    ["show", "", "#cr56f_6evawedgecolourlf", "#cr56f_6spoilerlf", "#cr56f_6runnersolelf"], //"WebResource_runnersole"],
    ["hide", "", "#cr56f_6evawedgecolourlf", "#cr56f_6spoilerlf", "#cr56f_6runnersolelf"], //"WebResource_runnersole"],
    ["show", "", "#cr56f_6evawedgecolourrf", "#cr56f_6spoilerrf", "#cr56f_6runnersolerf"], //"WebResource_runnersole"],
    ["hide", "", "#cr56f_6evawedgecolourrf", "#cr56f_6spoilerrf", "#cr56f_6runnersolerf"], //"WebResource_runnersole"],
    ["show", "", "#cr56f_7zsmprefabsolelf"],
    ["hide", "", "#cr56f_7zsmprefabsolelf"],
    ["show", "", "#cr56f_7zsmprefabsolerf"],
    ["hide", "", "#cr56f_7zsmprefabsolerf"],
    ["show", "", "#cr56f_7zsmsolesheetlf", "#cr56f_7zsmsolesheetcolourlf"],
    ["hide", "", "#cr56f_7zsmsolesheetlf", "#cr56f_7zsmsolesheetcolourlf"],
    ["show", "", "#cr56f_7zsmsolesheetrf", "#cr56f_7zsmsolesheetcolourrf"],
    ["hide", "", "#cr56f_7zsmsolesheetrf", "#cr56f_7zsmsolesheetcolourrf"],
    ["show", "", "#cr56f_3sf_mediallf", "#cr56f_3sf_laterallf"],
    ["hide", "", "#cr56f_3sf_mediallf", "#cr56f_3sf_laterallf"],
    ["show", "", "#cr56f_3sf_medialrf", "#cr56f_3sf_lateralrf"],
    ["hide", "", "#cr56f_3sf_medialrf", "#cr56f_3sf_lateralrf"],
    ["show", "", "#cr56f_3hf_mediallf", "#cr56f_3hf_laterallf"],
    ["hide", "", "#cr56f_3hf_mediallf", "#cr56f_3hf_laterallf"],
    ["show", "", "#cr56f_3hf_medialrf", "#cr56f_3hf_lateralrf"],
    ["hide", "", "#cr56f_3hf_medialrf", "#cr56f_3hf_lateralrf"],
    ["show", "", "#cr56f_4sw_mediallf", "#cr56f_4sw_laterallf"],
    ["hide", "", "#cr56f_4sw_mediallf", "#cr56f_4sw_laterallf"],
    ["show", "", "#cr56f_4sw_medialrf", "#cr56f_4sw_lateralrf"],
    ["hide", "", "#cr56f_4sw_medialrf", "#cr56f_4sw_lateralrf"],
    ["show", "", "#cr56f_4hw_mediallf", "#cr56f_4hw_laterallf"],
    ["hide", "", "#cr56f_4hw_mediallf", "#cr56f_4hw_laterallf"],
    ["show", "", "#cr56f_4hw_medialrf", "#cr56f_4hw_lateralrf"],
    ["hide", "", "#cr56f_4hw_medialrf", "#cr56f_4hw_lateralrf"]
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

$(document).ready(function () {
    get_language();
    get_style_colour_values();
    
    if (exclusive.indexOf("ZSM") != -1){
       is_zsm = true
    }    
     
    console.log("exclusive", exclusive, is_zsm)

    var unit_shoes = sessionStorage.unit;

    hideFields(-1, unit_shoes);
    set_options();
    set_labels();

    // checkbox to collapse/expand sections
    for (let i = 0; i <= array_sections_trigger.length; i++) {
        $(array_sections_trigger[i]).change(function () {
            hideFields(i, unit_shoes);
            webresource_imagerocker()
        });
    };

    for (let i = 0; i < array_fields.length; i++) {
        $("#" + array_fields[i] + "lf").change(function () {
            if (array_fields[i] == 'cr56f_7zsmsolesheet'){
                var indice_array = document.getElementById(array_fields[i] + "lf").value
                adjust_ZSM_colours(array_fields[i] + "colourlf", indice_array);
            }
            if (unit_shoes == "979580004") {
                document.getElementById(array_fields[i] + "rf").value = document.getElementById(array_fields[i] + "lf").value;
                if (array_fields[i] == 'cr56f_7zsmsolesheet'){
                    var indice_array = document.getElementById(array_fields[i] + "rf").value
                    adjust_ZSM_colours(array_fields[i] + "colourrf", indice_array);
                }
            }

            // alert(document.getElementById(array_fields[i] + "lf").value)
        });
    };

    for (let i = 0; i < array_fields.length; i++) {
        $("#" + array_fields[i] + "rf").change(function () {
            if (array_fields[i] == 'cr56f_7zsmsolesheet'){
                var indice_array = document.getElementById(array_fields[i] + "rf").value
                adjust_ZSM_colours(array_fields[i] + "colourrf", indice_array);
            }
        });
    };

    for (let i = 0; i < array_booleans_lfrf.length; i++) {
        $(array_booleans_lfrf[i] + "lf_0").change(function () {
            if (unit_shoes == "979580004") {
                $(array_booleans_lfrf[i] + "rf_0").prop('checked', true);
                $(array_booleans_lfrf[i] + "rf_1").prop('checked', false);
            }
        });

        $(array_booleans_lfrf[i] + "lf_1").change(function () {
            if (unit_shoes == "979580004") {
                $(array_booleans_lfrf[i] + "rf_1").prop('checked', true);
                $(array_booleans_lfrf[i] + "rf_0").prop('checked', false);
            }
        });

    };

console.log("estou aqui 1")

    for (let i = 0; i < array_fields_trigger.length; i++) {
        // console.log("estou no loop indice: ", i)
        conditional_fields(i, 1);

        $(array_fields_trigger[i]).change(function () {
            // console.log("alterei o indice: ", i)
            conditional_fields(i);

            if (unit_shoes > "979580002") {
                var yesno_field = array_fields_trigger[i];
                // console.log("RF=LF: ", yesno_field)

                if (yesno_field.substring(yesno_field.length - 4, yesno_field.length - 1) == "lf_") {
                    // console.log("LF também vou alterar o indice: ", i+2)
                    conditional_fields(i + 2);

                    if (yesno_field.substring(yesno_field.length - 1) == "0") {
                        $(yesno_field.substring(0, yesno_field.length - 4) + "rf_0").prop('checked', true);
                        $(yesno_field.substring(0, yesno_field.length - 4) + "rf_1").prop('checked', false);
                    }
                    else {
                        $(yesno_field.substring(0, yesno_field.length - 4) + "rf_0").prop('checked', false);
                        $(yesno_field.substring(0, yesno_field.length - 4) + "rf_1").prop('checked', true);
                    }
                }
                else if (yesno_field.substring(yesno_field.length - 2) == "lf") {
                    // console.log("RF também vou alterar o indice: ", i+1)
                    conditional_fields(i + 1);
                }
            }
        });
    };
});


function hideFields(section_checkbox, shoe_unit_val) {
    console.log("adds_exclude on hide", adds_exclude, "section_checkbox", section_checkbox)
    var iStart = section_checkbox;
    var iEnd = iStart + 1;
    if (section_checkbox == -1) {
        iStart = 0;
        iEnd = array_fields_by_section.length

        if (shoe_unit_val == "979580000") {
            setLabels(sigla_lf_rf_country[lang_index][1], "")
        }
        else if (shoe_unit_val == "979580001") {
            setLabels("", sigla_lf_rf_country[lang_index][0])
        }
        else if (shoe_unit_val == "979580002") {
            setLabels("", "")
        }
        else {
            setLabels(sigla_lf_rf_country[lang_index][1], sigla_lf_rf_country[lang_index][0])
        }    
    }
    
    for (i = iStart; i < iEnd; i++) {
        checkbox_value = $(array_sections_trigger[i]).prop('checked');
        if (adds_exclude.indexOf(array_sections_trigger[i]) != -1) {
            checkbox_value = false;
            $(array_sections_trigger[i]).parent().parent().parent().hide();
            $(array_sections_trigger[i] + "_label").hide();
        }
        
        for (j = 0; j < array_sub_sections[i].length; j++) {
            //element = document.querySelector("[aria-label='"+array_sub_sections[i][j]+"']")
            element = document.querySelector("[data-name='"+array_sub_sections[i][j]+"']")

            if (checkbox_value == false) {
                // console.log("HIDE section_checkbox", section_checkbox, "checkbox_value", checkbox_value, "element", element, "array_sub_sections", array_sub_sections[i][j], "i", i, "j", j)
                $(element).parent().hide();
            }
            else {
                $(element).parent().show();
            }
        }

        for (j = 0; j < array_fields_by_section[i].length; j++) {
            var element = array_fields_by_section[i][j]
            var exclude_zsm_control = false
            if (is_zsm == false && element.indexOf("ZSM") != -1){
                exclude_zsm_control = true
            }

            if (element.slice(-2) == "_0") {
                element = element.slice(0, -4)
                console.log("1. exclude se <>-1", adds_exclude.indexOf(element), element)
                if (checkbox_value == false || adds_exclude.indexOf(element) != -1 || exclude_zsm_control == true) {
                    $(element + "lf_0").parent().parent().parent().hide();
                    $(element + "lf_1").parent().parent().parent().hide();
                    $(element + "rf_0").parent().parent().parent().hide();
                    $(element + "rf_1").parent().parent().parent().hide();
                }
                else {
                    if (shoe_unit_val == "979580000" || shoe_unit_val == "979580002") {
                        $(element + "lf_0").parent().parent().parent().show();
                        $(element + "lf_1").parent().parent().parent().show();
                        $(element + "rf_0").parent().parent().parent().hide();
                        $(element + "rf_1").parent().parent().parent().hide();
                    }
                    else if (shoe_unit_val == "979580001") {
                        $(element + "lf_0").parent().parent().parent().hide();
                        $(element + "lf_1").parent().parent().parent().hide();
                        $(element + "rf_0").parent().parent().parent().show();
                        $(element + "rf_1").parent().parent().parent().show();
                    }
                    else {
                        $(element + "lf_0").parent().parent().parent().show();
                        $(element + "lf_1").parent().parent().parent().show();
                        $(element + "rf_0").parent().parent().parent().show();
                        $(element + "rf_1").parent().parent().parent().show();
                    }
                }
            }
            else if (element.slice(-2) == "_1") {
                element = element.slice(0, -1)
                console.log("2. exclude se <>-1", adds_exclude.indexOf(element), element)
                if (checkbox_value == false || adds_exclude.indexOf(element) != -1 || exclude_zsm_control == true) {
                    $(element + "0").parent().parent().parent().hide();
                    $(element + "1").parent().parent().parent().hide();
                }
                else {
                    $(element + "0").parent().parent().parent().show();
                    $(element + "1").parent().parent().parent().show();
                }
            }
            else {
                console.log("3. exclude se <>-1", adds_exclude.indexOf(element), element)
                if (checkbox_value == false || adds_exclude.indexOf(element) != -1 || exclude_zsm_control == true) {
                    $(element + "lf").parent().parent().hide();
                    $(element + "rf").parent().parent().hide();
                }
                else {
                    if (shoe_unit_val == "979580000" || shoe_unit_val == "979580002") {
                        $(element + "lf").parent().parent().show();
                        $(element + "rf").parent().parent().hide();
                    }
                    else if (shoe_unit_val == "979580001") {
                        $(element + "lf").parent().parent().hide();
                        $(element + "rf").parent().parent().show();
                    }
                    else {
                        $(element + "lf").parent().parent().show();
                        $(element + "rf").parent().parent().show();
                    }
                }
            }
        } 

        if (i < -4) {
            if (array_fields_trigger_by_section[i][0] >= 0) {
                for (index_trigger = array_fields_trigger_by_section[i][0]; index_trigger <= array_fields_trigger_by_section[i][1]; index_trigger++) {
                    let fieldnamelen = array_fields_trigger[index_trigger].length
                  if (array_fields_trigger[index_trigger].substring(fieldnamelen - 3, fieldnamelen) == "f_0") {
                    conditional_fields(i, index_trigger)
                  }
                  else if ($(array_fields_trigger[index_trigger]).attr("checked") == "checked" ) { 
                        conditional_fields(i, index_trigger)
                    }                    
                };
            }
        }
    }
}


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
                $(array_fields_to_toggle[i][j]).parent().parent().hide();
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
                
                $(element).show();
            }
            else {
                var search_element = array_fields_to_toggle[i][j].substring(0, array_fields_to_toggle[i][j].length-2)    
                console.log("CONDITIONAL exclude se <>-1", adds_exclude.indexOf(search_element), search_element)

                var pos_exclude = adds_exclude.indexOf(search_element+"=")
                if (pos_exclude == -1){
                    pos_exclude = adds_exclude.indexOf(search_element)
                }
                else {
                    var pos_equal = adds_exclude.indexOf("=", pos_exclude) + 1
                    var pos_cardinal = adds_exclude.indexOf("#", pos_exclude+1)    
                    var value2exclude = adds_exclude.slice(pos_equal, pos_cardinal)
                    console.log("******************** pos_equal",pos_equal,"pos_cardinal",pos_cardinal,"value2exclude", value2exclude)
                    adjust_ZSM_prefab_sole(array_fields_to_toggle[i][j].substring(1), value2exclude)
                    pos_exclude = -1
                }

                if (pos_exclude == -1) {
                    $(array_fields_to_toggle[i][j]).parent().parent().show();
                    $(array_fields_to_toggle[i][j]).prop('required', true);
                    $(array_fields_to_toggle[i][j]).closest(".control").prev().addClass("required");
                    
                    if (first_round != 1) {
                        let element = document.querySelector("[aria-label='"+array_fields_to_toggle[i][1]+"']")
                        // console.log("show", i, element)
                        $(element).show();
                    }

                    // Create new validator
                    var Requiredvalidator = document.createElement('span');
                    Requiredvalidator.style.display = "none";
                    Requiredvalidator.id = array_fields_to_toggle[i][j] + "Validator";
                    Requiredvalidator.controltovalidate = array_fields_to_toggle[i][j];

                    var trigger_field = array_fields_trigger[i];
                    var tf_len = trigger_field.length - 3
                    if (trigger_field.substr(tf_len, 2) == "f_") {
                        trigger_field = array_fields_trigger[i].substring(1, tf_len + 1)
                    }
                    else {
                        trigger_field = array_fields_trigger[i].substring(1)
                    }
                    trigger_field = document.getElementById(trigger_field + "_label").textContent;
                    var label = document.getElementById(array_fields_to_toggle[i][j].substring(1) + "_label").textContent;

                    Requiredvalidator.errormessage = "<a href=" + array_fields_to_toggle[i][j] + "_label" +
                        " onclick=javascript:scrollToAndFocus(" + array_fields_to_toggle[i][j].substring(1) + "_label, " +
                        array_fields_to_toggle[i][j].substring(1) + ");return false;" +
                        " referencecontrolid=" + array_fields_to_toggle[i][j].substring(1) + ">" +
                        label + array_required[lang_index] + trigger_field + ".</a>";

                    Requiredvalidator.initialvalue = "";
                    Requiredvalidator.evaluationfunction = function () {
                        var value = $(array_fields_to_toggle[i][j]).val();
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
        };
    };
};


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

    webresource_imagerocker()

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

    count_array = 0;
    array_sections_trigger.forEach(element => {
        $(element + "_label").text(section_labels[lang_index][count_array] + section_label);
        count_array += 1;
    });
// console.log("array_sections_trigger END")

        
    count_array = 0;
    array_booleans_lfrf.forEach(element => {
        $(element + "lf_label").text(booleans_labels_lfrf[lang_index][count_array] + add_label_lf);
        document.querySelector("label[for="+element.substring(1)+"lf_1]").innerHTML = booleans_yes[lang_index];
        document.querySelector("label[for="+element.substring(1)+"lf_0]").innerHTML = booleans_no[lang_index];

        $(element + "rf_label").text(booleans_labels_lfrf[lang_index][count_array] + add_label_rf);
        document.querySelector("label[for="+element.substring(1)+"rf_1]").innerHTML = booleans_yes[lang_index];
        document.querySelector("label[for="+element.substring(1)+"rf_0]").innerHTML = booleans_no[lang_index];

        count_array += 1;
    });
// console.log("array_booleans_lfrf END")

// console.log("array_booleans START")

    count_array = 0;
    array_booleans.forEach(element => {
        console.log(element + "_label", booleans_labels[lang_index][count_array], count_array)
        $(element + "_label").text(booleans_labels[lang_index][count_array]);
        console.log("label[for="+element.substring(1)+"_1]")
        document.querySelector("label[for="+element.substring(1)+"_1]").innerHTML = booleans_yes[lang_index];
        console.log("label[for="+element.substring(1)+"_0]")
        document.querySelector("label[for="+element.substring(1)+"_0]").innerHTML = booleans_no[lang_index];

        count_array += 1;
    });
// console.log("array_booleans END")

    count_array = 0;
    array_fields_trigger.forEach(element => {
        var name_field = element
        if (element.slice(-2) == "_1") {
            document.querySelector("label[for="+element.substring(1)+"]").innerHTML = booleans_yes[lang_index];
            name_field = element.slice(0, -1) + "label"
        }
        else if (element.slice(-2) == "_0") {
            document.querySelector("label[for="+element.substring(1)+"]").innerHTML = booleans_no[lang_index];
            name_field = ''
        }
        else {
             name_field += "_label"
        }

        if (name_field != '') {
            if (name_field.includes("lf_label")) {
            $(name_field).text(triggers_labels[lang_index][count_array] + add_label_lf);
            }
            else {
            $(name_field).text(triggers_labels[lang_index][count_array] + add_label_rf);
            }

            count_array += 1;
        }
    });
// console.log("array_fields_trigger END")

    $("#cr56f_comments_label").text(isolated_fields[lang_index][0]);
    $("#cr56f_additionsconfirmation_label").text(isolated_fields[lang_index][1]);
    $("#cr56f_style_label").text(isolated_fields[lang_index][2]);
    $("#cr56f_style_color_label").text(isolated_fields[lang_index][3]);
    $("#cr56f_closure_label").text(isolated_fields[lang_index][4]);
}


function webresource_imagerocker(){
console.log("array_image_rockersole START")

    var count_array = 0;
    var isrockersolethere = false

    if (adds_exclude.indexOf("WebResource_rockersole") == -1) {
    if (document.getElementById("cr56f_2rockersoletypeslf")) {
        isrockersolethere = true
    }
    else {
        if (document.getElementById("cr56f_2rockersoletypesrf")) {
            isrockersolethere = true
        }
    } 
    }

    // array_image_rockersole.forEach(element => {
        var imagerocker = document.getElementById(array_image_rockersole[0])
        if (imagerocker) {
            $(imagerocker).hide();
        }
        var imagerocker = document.getElementById(array_image_rockersole[1])
        if (imagerocker) {
            $(imagerocker).hide();
        }    
        var imagerocker = document.getElementById(array_image_rockersole[2])
        if (imagerocker) {
            $(imagerocker).hide();
        }
    
    
        var imagerocker = document.getElementById(array_image_rockersole[lang_index])
        if (imagerocker) {
            if (isrockersolethere){
                $(imagerocker).show();
console.log("SHOW:", imagerocker.src, isrockersolethere)
            }
        }

        // console.log("rocker sole:", imagerocker.src, count_array, element, isrockersolethere, count_array)
        // if ( count_array == lang_index && isrockersolethere == true) {
        //     console.log("SHOW", imagerocker)
        //    $(imagerocker).show();
        // } else {
        //     console.log("HIDE", imagerocker)
        //     $(imagerocker).hide();
        // }    
        // count_array += 1;
    // })
console.log("array_image_rockersole END")
}


function get_language() {
    var url_link = window.location.href;
    if ( url_link.includes("/fr-FR/") == true ){
        lang_index = 2
    }
    else if ( url_link.includes("/nl-NL/") == true ){
      lang_index = 1  
    }
    else if ( url_link.includes("/de-DE/") == true ){
      lang_index = 3  
    }
    else {
        lang_index = 0
    }
    console.log("get_language", lang_index, url_link)
  };
  


  const array_dropdown_fields = [
    ['cr56f_lininglf', 979580000],
    ['cr56f_closurelaceslf', 979580000],
    ['cr56f_closurevelcrostrapslf', 979580000],
    ['cr56f_stiffenerhardnesslf', 979580000],
    ['cr56f_toepuffslf', 979580000],
    ['cr56f_zipperlf', 979580000],
    ['cr56f_2rockersoletypeslf', 979580000],
    ['cr56f_6puevabumperlf', 979580000],
    ['cr56f_6evawedgecolourlf', 979580000],
    ['cr56f_6spoilerlf', 979580000],
    ['cr56f_6runnersolelf', 979580000],
    ['cr56f_7zsmprefabsolelf', 979580000],
    ['cr56f_7zsmsolesheetlf', 979580001],
    ['cr56f_7zsmsolesheetcolourlf', 979580000],
    ['cr56f_liningrf', 979580000],
    ['cr56f_closurelacesrf', 979580000],
    ['cr56f_closurevelcrostrapsrf', 979580000],
    ['cr56f_stiffenerhardnessrf', 979580000],
    ['cr56f_toepuffsrf', 979580000],
    ['cr56f_zipperrf', 979580000],
    ['cr56f_2rockersoletypesrf', 979580000],
    ['cr56f_6puevabumperrf', 979580000],
    ['cr56f_6evawedgecolourrf', 979580000],
    ['cr56f_6spoilerrf', 979580000],
    ['cr56f_6runnersolerf', 979580000],
    ['cr56f_7zsmprefabsolerf', 979580000],
    ['cr56f_7zsmsolesheetrf', 979580001],
    ['cr56f_7zsmsolesheetcolourrf', 979580000]
  ]

//     ,
//     ['cr56f_additionsconfirmation', "1"]
// ]

const array_ZSM_sole_sheet_colours = [
[979580001, [1,2,3,7,9,10,11,12]],
[979580002, [10, 13]],
[979580003, [10, 13]],
[979580004, [1,2,3,7,9,10,11,13]],
[979580005, [10, 13]],
[979580006, [10, 13]],
[979580007, [1,2,3,7,9,10,11,12,13]],
[979580008, [1,2,3,7,9,10,11,12,13]],
[979580009, [1,2,3,7,9,10,13]],
[979580010, [1,2,3,7,9,10,13]],
[979580011, [1,2,3,7,9,10,11,12,13]],
[979580012, [1,2,3,7,9,10,11,12,13]],
[979580013, [1,2,3,7,9,10,11,12,13]],
[979580014, [1,2,3,7,9,10,11,12,13]],
[979580015, [4, 10, 13]],
[979580016, [10, 13]],
[979580017, [1, 2, 3, 4, 10, 11, 13]],
[979580018, [14, 15]],
[979580019, [6, 5, 10, 13, 14, 15]],
[979580020, [1, 5, 6, 8, 10, 13, 14, 15]]
]

const array_ZSM_colours = [
[979580009, ' 09 White'], 
[979580017, ' 17 Beige'], 
[979580019, ' 19 Light Beige'], 
[979580030, ' 30 Honey'], 
[979580032, ' 32 Yellow'], 
[979580034, ' 34 Orange'], 
[979580035, ' 35 Mid Brown'], 
[979580038, ' 38 Green'],
[979580041, ' 41 Taupe'], 
[979580046, ' 46 Brown'], 
[979580056, ' 56 Grey'], 
[979580078, ' 78 Blue'], 
[979580081, ' 81 Black'], 
[979580102, '102 Red'], 
[979580103, '103 Blue']
]

const array_ZSM_prefab_sole = [
['Sneaker White 09', 'Sneaker Light Beige 19', 'Sneaker Black 81'], 
['Runner White 09', 'Runner Light Grey 56', 'Runner Black 81']
]

function adjust_ZSM_colours(field_name, index_of_array) {  
        index_of_array = index_of_array - 979580001

        console.log("adjust_ZSM_colours START", index_of_array, array_ZSM_sole_sheet_colours[index_of_array][0])            

        var choiceColumn = document.getElementById(field_name);
        var optionSelected = ""
        var optionSelectedValue = choiceColumn.value
        if (optionSelectedValue == "") {
            optionSelected = ' selected="selected"'
        } 
        // Clear existing options
        choiceColumn.innerHTML = '<option' + optionSelected + ' value="" label="' + array_selected[lang_index] + '" aria-label="' + array_selected[lang_index] + '"></option>';
      
        optionsList = array_ZSM_sole_sheet_colours[index_of_array][1];
        console.log("optionsList", optionsList);
        var newOptions = []

        var count_options = 0
        var colour_index = 0
        optionsList.forEach(option =>{
            count_options += 1
            colour_index = option - 1  
            newOptions[count_options] = { value: array_ZSM_colours[colour_index][0], text: array_ZSM_colours[colour_index][1] }
        });

        // Add new options to the choice column
        newOptions.forEach(function(option) {
            var newOptionElement = document.createElement('option');
            // console.log('option.value', option.value, 'optionSelectedValue', optionSelectedValue)
            if (option.value == optionSelectedValue) {
                newOptionElement.selected = "selected"
            }

            newOptionElement.text = option.text;
            newOptionElement.value = option.value;
            choiceColumn.appendChild(newOptionElement);
        });
        
console.log("adjust_ZSM_colours END")
};   


function adjust_ZSM_prefab_sole(field_name, index_to_exclude) {  

        console.log("adjust_ZSM_prefab_sole START", index_to_exclude, array_ZSM_prefab_sole[index_to_exclude])            

        var choiceColumn = document.getElementById(field_name);
        var optionSelected = ""
        var optionSelectedValue = choiceColumn.value
        if (optionSelectedValue == "") {
            optionSelected = ' selected="selected"'
        } 
        // Clear existing options
        choiceColumn.innerHTML = '<option' + optionSelected + ' value="" label="' + array_selected[lang_index] + '" aria-label="' + array_selected[lang_index] + '"></option>';
        
        if (index_to_exclude == 1){
            optionsList = array_ZSM_prefab_sole[1];
            count_options = 4
        } 
        else {
            optionsList = array_ZSM_prefab_sole[0];
            count_options = 1            
        }

        var newOptions = []
        optionsList.forEach(option =>{
            newOptions[count_options] = { value: (979580000+count_options), text: option }
            count_options += 1
        });

        // Add new options to the choice column
        newOptions.forEach(function(option) {
            var newOptionElement = document.createElement('option');
            // console.log('option.value', option.value, 'optionSelectedValue', optionSelectedValue)
            if (option.value == optionSelectedValue) {
                newOptionElement.selected = "selected"
            }

            newOptionElement.text = option.text;
            newOptionElement.value = option.value;
            choiceColumn.appendChild(newOptionElement);
        });
        
console.log("adjust_ZSM_prefab_sole END")
};   


const array_selected = ['selected', 'selecteren', 'sélectionner', 'ausgewählt']

function set_options() {  
console.log("array_dropdown_fields START")    

    var count_array = 0
    array_dropdown_fields.forEach(element => {
        // Replace 'choiceColumnId' with the actual ID of your choice column
        var choiceColumn = document.getElementById(element[0]);
        console.log(element[0])
        if (choiceColumn) {
            var optionSelected = ""
            var optionSelectedValue = choiceColumn.value
            if (optionSelectedValue == "") {
              optionSelected = ' selected="selected"'
            } 
            // Clear existing options
            choiceColumn.innerHTML = '<option' + optionSelected + ' value="" label="' + array_selected[lang_index] + '" aria-label="' + array_selected[lang_index] + '"></option>';
      
            optionsList = array_dropdown_options[lang_index][count_array];
            console.log("optionsList", optionsList);
            var newOptions = []
            var count_options = 0
            optionsList.forEach(option =>{
                newOptions[count_options] = { value: element[1]+count_options, text: option }
                count_options += 1    
            });
    
            // Add new options to the choice column
            newOptions.forEach(function(option) {
                var newOptionElement = document.createElement('option');
              // console.log('option.value', option.value, 'optionSelectedValue', optionSelectedValue)
                if (option.value == optionSelectedValue) {
                    newOptionElement.selected = "selected"
                }

                newOptionElement.text = option.text;
                newOptionElement.value = option.value;
                choiceColumn.appendChild(newOptionElement);
            });
            console.log('count_array', count_array, 'optionSelectedValue', optionSelectedValue)
        } else {
            console.error('Choice column not found');
        }
    
        count_array += 1
        });
console.log("array_dropdown_fields END")
};   


function set_labels() {  
    var progressBar = document.getElementsByClassName("list-group-item")
    for (var i = 0; i < progressBar.length; i++) {
        progressBar[i].innerHTML = array_progressbar[lang_index][i];
        console.log("array: ", array_progressbar[lang_index][i], progressBar[i])
    }

    document.getElementById("PreviousButton").value = array_prevnextbuttons[lang_index][0]
    document.getElementById("NextButton").value = array_prevnextbuttons[lang_index][1]

  };


function lookupStyle() {
    var styleID = document.getElementById("cr56f_style").value
  
    const queryStyle = "style_id"
    const fetchurl = "/FetchXMLStyles/?" + queryStyle + "="
    var styleQuery = fetchurl + styleID
  
    //console.log("query: ", styleQuery)
  
    var request = $.ajax({
      url: styleQuery,
      type: "GET",
      dataType: "json"
    });
    
    request.done(style => {
      $(style).each(i => {
  
        $("#cr56f_size_scale").attr("value", style[i].ScaleGUID);
        $("#cr56f_size_scale_name").attr("value", style[i].ScaleNAME);
        $("#cr56f_size_scale_entityname").attr("value", "cr56f_wpp_size_scales");
  
      });
    });
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
            adds_exclude = colour[i].StyleADDSEXCLUDE
            if (colour[i].ClosureNAME=="VELCRO") {
                adds_exclude = adds_exclude + "#cr56f_closurelaces"
            }
            else {
                adds_exclude = adds_exclude + "#cr56f_closurevelcrostraps"
            }            
            console.log("adds_exclude on request step 2", adds_exclude)

          $("#cr56f_customizedwidth").val(colour[i].WidthCustomized);
    
          $("#cr56f_style").attr("value", colour[i].StyleGUID);
          $("#cr56f_style_name").attr("value", colour[i].StyleID);
          style_name = colour[i].StyleID

          $("#cr56f_style_entityname").attr("value", "cr56f_wpp_styles");
    
          $("#cr56f_style_color").attr("value", colour[i].ColourGUID);
          $("#cr56f_style_color_name").attr("value", colour[i].ColourID + " : " + colour[i].ColourNAME);
          $("#cr56f_style_color_entityname").attr("value", "cr56f_wpp_style_colors");
    
          $("#cr56f_size_scale").attr("value", colour[i].ScaleGUID);
          $("#cr56f_size_scale_name").attr("value", colour[i].ScaleNAME);
          $("#cr56f_size_scale_entityname").attr("value", "cr56f_wpp_size_scales");
    
          $("#cr56f_closure").attr("value", colour[i].ClosureGUID);
          $("#cr56f_closure_name").attr("value", colour[i].ClosureNAME);
          $("#cr56f_closure_entityname").attr("value", "cr56f_wpp_closures");
    
          let image = document.getElementById("WebResource_picture");
          image.src = "/Image/download.aspx?entity=cr56f_wpp_style_colors&attribute=cr56f_picture&ID=" + colour[i].ColourGUID;
        });
      });
        
  }

