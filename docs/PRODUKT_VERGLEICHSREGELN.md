# Produktarten: notwendige Trennmerkmale

Planungsstand 05.09.2026, alle 76 aktuellen Seed-IDs erfasst. Diese Matrix ist
eine fachliche Spezifikation, keine Bestätigung der vorhandenen Zuordnungen.
Jede Zeile benötigt vor großem Import eine strukturierte Regel und geprüfte
Beispiele. Packungsmenge/-einheit, Bio-Status und Hersteller-/Eigenmarkenstatus
sind grundsätzlich separat zu führen. Unbekannt ist ein eigener Zustand.

Umsetzung vom selben Tag: Die maschinenlesbaren Pflichtmerkmale stehen in
`data/product_rules.json`. `backend/jobs/catalog_identity.py` erzwingt vollständige
Merkmale vor Eigenmarken-Gruppierung. Am 06.09. wurden drei konkrete Artikel
mit BW-Beobachtungen bestätigt; unvollständige Merkmale geben weiterhin keine
generische Vergleichsgruppe frei. [Pilotbericht](PILOT_2026-09-06.md),
[Ablauf und Grenzen](KATALOG_IMPORT.md).

| Seed-ID | Produktart | Zusätzliche notwendige Trennung / Prüfung |
| --- | --- | --- |
| milk_15 | Milch | Fettgehalt, H-/Frischmilch, Tierart, laktosefrei; Bio nicht aus Seed vererben |
| butter_250 | Butter | gesalzen/ungesalzen, Butter/Mischstreichfett, Tierart |
| eggs_10 | Eier | Haltungsform, Größenklasse, Stückzahl |
| yogurt_500 | Naturjoghurt | Fettgehalt, natur/Frucht, mild, Tierart, laktosefrei |
| cheese_slices_400 | Gouda | Reifegrad, Fettstufe, Scheiben/Stück/gerieben |
| quark_500 | Quark | Mager/20 %/40 % i. Tr., natur/Frucht, Tierart, laktosefrei |
| cream_200 | Sahne | Fettgehalt, frisch/H, gesüßt, pflanzlicher Ersatz |
| mozzarella_125 | Mozzarella | Kuh/Büffel, Fettstufe, Abtropfgewicht |
| bananas_1kg | Bananen | Bio/konventionell/unbekannt, lose/Packung; Süßigkeiten ausschließen |
| apples_1kg | Äpfel | Sorte, Handelsklasse, lose/Packung |
| oranges_1kg | Orangen | Sorte/Verwendungszweck, Klasse, lose/Netz |
| strawberries_500 | Erdbeeren | frisch/TK, Klasse, Schale/lose |
| grapes_500 | Trauben | Farbe, kernlos/mit Kernen, frisch/getrocknet |
| pears_1kg | Birnen | Sorte, Klasse, lose/Packung |
| lemons_500 | Zitronen | Bio, Schalenbehandlung soweit belegt, lose/Netz |
| tomatoes_500 | Tomaten | Rispen/Cocktail/Fleisch, frisch/verarbeitet |
| cucumber_each | Gurken | Salat-/Mini-/Einlegegurke, Stück/Gewicht |
| carrots_1kg | Möhren | Bund/Beutel, frisch/verarbeitet |
| potatoes_25kg | Kartoffeln | Kochtyp, Sorte falls wesentlich, frisch/vorgegart |
| onions_1kg | Zwiebeln | Farbe, Speise-/Gemüsezwiebel/Schalotte |
| bell_peppers_500 | Paprika | Farbe/Mix, Spitz-/Blockpaprika, frisch/Gewürz |
| salad_each | Salat | Art, ganzer Kopf/geschnitten, Stück/Gewicht |
| broccoli_500 | Brokkoli | frisch/TK, ganzer Kopf/Röschen |
| pasta_500 | Nudeln | Form, Getreide, Ei, Vollkorn/glutenfrei |
| rice_1kg | Reis | Basmati/Jasmin/Langkorn, Vollkorn, Kochbeutel/lose |
| oats_500 | Haferflocken | zart/kernig/instant, glutenfrei |
| lentils_500 | Linsen | Sorte, trocken/gegart, Dose/Beutel |
| canned_tomatoes_400 | Dosentomaten | ganz/stückig/passiert, Würzung, Abtropfgewicht wenn relevant |
| tuna_195 | Thunfisch | Tierart, Öl/eigener Saft, Abtropfgewicht |
| flour_1kg | Mehl | Getreide, Type, Vollkorn, glutenfrei |
| sugar_1kg | Zucker | weiß/braun, Kristall/Puder/Gelierzucker |
| oil_1l | Öl | Pflanzenart, raffiniert/kaltgepresst, Mischöl |
| baking_powder | Backpulver | Triebmittelart, Beutelzahl und Inhalt je Beutel |
| cocoa_250 | Kakao | Backkakao/Trinkpulver, Zuckerzusatz, Entölungsgrad |
| yeast | Hefe | frisch/trocken, Gewicht; keine automatische Wirkungsumrechnung |
| coffee_500 | Kaffee | Bohnen/gemahlen/Kapseln, Sorte/Röstung, koffeinfrei |
| water_15l | Wasser | still/medium/classic, Flaschenzahl, Einweg/Mehrweg, Pfand |
| orange_juice_1l | Orangensaft | Saft/Nektar/Getränk, Direktsaft/Konzentrat, Fruchtfleisch, Pfand |
| cola_125l | Cola | konkrete Marke bei Markenwahl, Zucker/Zero/Light, Koffein, Pfand |
| tea_20 | Tee | Sorte, lose/Beutel, Nettogewicht und Beutelzahl |
| beer_05 | Bier | Stil, Alkohol/alkoholfrei, Flasche/Dose/Kasten, Pfand |
| chocolate_100 | Schokolade | Sorte, Füllung, Kakaoanteil, Tafel/Riegel |
| gummy_bears_200 | Fruchtgummi | konkrete Mischung, Gelatine/vegan, zuckerfrei |
| cookies_200 | Kekse | Rezeptur/Sorte, Füllung/Überzug, glutenfrei |
| chips_175 | Chips | Grundzutat, Geschmack, gebacken/frittiert; Paprika ist hier Geschmack |
| nuts_200 | Nüsse/Mischungen | Nussarten, Mischungsverhältnis falls wesentlich, Salz/Röstung |
| frozen_pizza_each | Pizza | Belag, Teigart, Nettogewicht, Stückzahl |
| fries_750 | Pommes | Schnitt, vorfrittiert, Würzung, Zubereitungsart |
| icecream_500 | Eis | Sorte, Milch-/Wassereis, Becher/Stieleis, Volumen/Stückzahl |
| frozen_vegetables_750 | TK-Gemüse | Gemüseart/Mischung, gewürzt/ungewürzt, Sauce |
| fish_sticks_450 | Fischstäbchen | Tierart, Panade, Stückzahl und Gewicht |
| toast_500 | Toast | Getreide, Vollkorn/Mehrkorn, geschnitten |
| bread_rolls_6 | Brötchen | Sorte, fertig/Aufback/TK, Stückzahl und Gewicht |
| wholegrain_bread_500 | Brot | Getreide, Vollkornanteil, geschnitten |
| muesli_500 | Müsli | Mischung, Früchte/Schoko, Zuckerzusatz, glutenfrei |
| cornflakes_500 | Cornflakes | Getreide, gesüßt/ungesüßt, Überzug |
| jam_450 | Konfitüre | Frucht, Fruchtanteil, Konfitüre/Gelee/Fruchtaufstrich |
| honey_500 | Honig | Sorte, flüssig/cremig, Herkunft falls Auswahlkriterium |
| ketchup_500 | Ketchup | Geschmack, Zuckerreduzierung, ml/g nicht gleichsetzen |
| mayonnaise_500 | Mayonnaise | Fettgehalt, Ei/vegan, Salatcreme abgrenzen |
| mustard_250 | Senf | Schärfe, süß/körnig/Dijon, Rezeptur |
| chicken_breast_400 | Hähnchenbrust | frisch/TK, zugeschnitten, mariniert/natur, Haltungsangaben |
| minced_meat_500 | Hackfleisch | Tierart/Mischung, Fettgehalt, frisch/TK, Haltungsangaben |
| salami_200 | Salami | Tierart, Sorte, Scheiben/Stück, Reifung |
| ham_200 | Schinken | gekocht/roh, Tierart, Scheiben/Stück, Formfleisch |
| sausages_400 | Würstchen | Sorte, Tierart, frisch/Glas, Abtropfgewicht |
| toilet_paper_10 | Toilettenpapier | Lagen, Blattzahl je Rolle, Recycling, feucht/trocken |
| detergent_20 | Waschmittel | Voll/Color/Fein, Pulver/flüssig/Pods, WL und Dosierung |
| dish_soap_500 | Spülmittel | Hand/Maschine, Konzentrat, Variante |
| kitchen_towels_4 | Küchenrollen | Lagen, Blattzahl je Rolle, Format |
| diapers_4 | Windeln | Größe/Gewichtsbereich, Pants/Klebewindel, Stückzahl |
| baby_food_190 | Babygläschen | Altersstufe, Mahlzeit/Zutat, Rezeptur, Allergene |
| wet_wipes_80 | Feuchttücher | Baby/Haushalt/Kosmetik, parfümiert, Stückzahl |
| cat_food_400 | Katzenfutter | nass/trocken, Lebensphase, Allein-/Ergänzungsfutter, Rezeptur |
| dog_food_1kg | Hundefutter | nass/trocken, Lebensphase, Tiergröße, Allein-/Ergänzungsfutter |
| cat_litter_10l | Katzenstreu | Material, klumpend, Duft, Liter/kg nicht gleichsetzen |

## Neue Produktarten

| Art | Identität und Trennmerkmale | Importvoraussetzung |
| --- | --- | --- |
| Kinder Joy | Hersteller, Produktlinie, Variante/Edition, Einzel-/Multipack, Inhalt, GTIN | Quellenartikel derselben Ausführung händlerübergreifend zuordnen; Kinder Bueno/Überraschung getrennt |
| Pokémon-Sammelkarten | Spiel, Set, Sprache, Edition, versiegelt/einzeln, Booster/Display/Box, Anzahl, EAN/Hersteller-ID | Keine Zusammenführung nur über „Pokémon“; aktuelle Quelle und Bildrechte separat prüfen |
| Weitere Drogerie | Produktzweck, Form, Zielgruppe, Wirk-/Duftvariante, Füllmenge | Kein Ernährungsschema auf Kosmetik anwenden |
| Weiterer Tierbedarf | Tierart, Verwendungszweck, Größe/Material oder Rezeptur | Futter von Zubehör und Streu trennen |

## Verbindliche Gegenbeispiele für die Umsetzung

- Bio-Bananen und Bananen mit unbekanntem Bio-Status bleiben getrennt.
- Magerquark, Speisequark 20 % und Speisequark 40 % bleiben getrennt.
- Geprüfter Magerquark derselben Merkmale von Milbona, ja! und K-Classic darf
  eine Vergleichsgruppe bilden; die konkrete Eigenmarke bleibt je Preis sichtbar.
- Kinder Joy derselben Packung aus mehreren Händlern darf zusammengehören,
  Kinder Joy und Kinder Überraschung dürfen es nicht.
- Schoko-Bananen sind Süßigkeiten, Bananenbrei ist Baby-/Lebensmittelzubereitung.
- `2 × 250 g`, `500 g` und `0,5 kg` haben denselben Gesamtinhalt, aber nicht
  zwingend denselben konkreten Artikel oder dieselbe Verkaufsverpackung.
- Unvollständige oder widersprüchliche Metadaten gehen in eine Prüfliste;
  ein Ähnlichkeitswert allein gibt die Zusammenführung nicht frei.
