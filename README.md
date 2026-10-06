# Frysplock

Mobilanpassad bageriapp med produktregister, plocklistor, fryssaldo och fotograferade listor med manuell OCR-granskning. Befintliga flikar och plockflödet är bevarade.

## Start och kontroll

Använd Node.js 22.12 eller senare (alternativt en kompatibel Node 20-version enligt Vites krav).

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

`npm run dev` startar gränssnittet med Vite. Den befintliga servermiljön behöver också köra `api/ocr.js` för att textläsningen ska fungera; Vite kör inte den endpointen själv. Google Vision-nyckeln används endast på servern via `GOOGLE_VISION_API_KEY`. Behåll din befintliga `.env.local` och serverkonfiguration. Nycklar och `.env.local` ingår inte i leveranspaketet.

## Plockning och lager

- Fryslagrets basenhet är plåtar. Plocklistor anger positiva heltal i styck.
- `src/services/stock.js` är den gemensamma saldoberäkningen. Alla nya lagerhändelser sparas i plåtar.
- `plock` minskar fryssaldot, `inlägg` ökar det och `korrigering` ändrar det med angiven differens. `bak` påverkar inte frysen.
- Plocket läser rad, produkt och saldo under samma Dexie-transaction som skriver uttag, eventuell korrigering, plockstatus och liststatus. Ett upprepat anrop för en plockad rad gör inget nytt uttag.
- Plocklistan och alla dess rader sparas tillsammans. Ett skrivfel återställer hela transaktionen.
- Produktnamn kontrolleras efter trimning, normalisering av mellanslag och skiftläge. Styck per plåt måste vara ett positivt ändligt tal.
- Faktiskt saldo anges i plåtar och får vara noll. Komma och punkt accepteras som decimaltecken. Visningen använder svenska decimaler med högst två decimaler; lagerberäkningarna använder full precision.

## Befintlig data

Databasnamn och befintligt Dexie-schema är oförändrade. Befintliga listor och lagerhändelser raderas inte.

Äldre styckhändelser räknas om med händelsens sparade plåtfaktor om den finns, annars med produktens befintliga faktor. Innan en produkt får en ny faktor normaliseras dess äldre styckhändelser till plåtar med den gamla faktorn. Ursprungligt antal och enhet sparas tillsammans med faktorn för spårning.

Om äldre data har okänd enhet, ogiltiga tal eller saknar nödvändig omräkningsfaktor visas ett fel i stället för ett påhittat saldo. Sådan data behöver kontrolleras manuellt. Historiska dubbletter i produktregistret väljs inte automatiskt av OCR.

Äldre `bak`-händelser ligger kvar i historiken men räknas som noll förändring i frysen. Om sådana händelser tidigare räknats som uttag kan saldot därför skilja sig från den tidigare versionen. Kontrollera i så fall det fysiska saldot. Redan registrerade felaktiga dubbelplock raderas inte automatiskt.

## Fotograferade listor

1. Välj kamera eller befintlig bild via enhetens filväljare. Appen anger inte längre `capture`.
2. Dra en ram runt önskad kolumn eller justera kanterna. Det går också att använda hela bilden, beskära igen eller ta bort en bild.
3. Starta textläsningen. Endast den valda bildytan skickas till OCR.
4. Granska matchade och omatchade rader. En omatchad rad kan kopplas till en befintlig produkt, skapa en ny produkt direkt eller uttryckligen ignoreras. Ignorerade rader kan återställas och noteras på den sparade listan.
5. Alla kvarvarande rader måste ha en vald produkt och ett giltigt antal innan listan sparas. Bara entydiga, normaliserade namn eller alias matchas automatiskt; ingen ungefärlig namnmatchning används.

Parsern stödjer bland annat `Kanelbullar 30`, `30 Kanelbullar` och `Kanelbullar 30 st`. Otolkade och tvetydiga textrader finns kvar för manuell hantering. En användare kan välja att komma ihåg en OCR-variant som alias. Alias sparas bara om det inte krockar med en annan produkt.

## Tester

`tests/core.test.js` kör riktiga Dexie-transaktioner mot `fake-indexeddb` i en separat Node-process. Testerna omfattar dubbelplock, konvertering, saldo och korrigering, transaktionsåterställning vid skrivfel, produktvalidering, äldre data och OCR-parsern.

`tests/ocr.test.js` testar beskärningsgeometri och endpointens felhantering med simulerade HTTP-svar. Testerna anropar inte Google och använder ingen riktig API-nyckel. Bildkvalitet, mobilens kamera/filväljare och verklig Google Vision-läsning bör även provas i den befintliga driftmiljön.

Leveranskontroll: 19 automatiska tester godkända; lint utan anmärkningar och produktionsbygge godkänt. Mobilflöden har också kontrollerats i Chromium med verklig IndexedDB: manuell lista, dubbeltryck, plock och saldokorrigering, avslut, historik, touchbeskärning, nya/kopplade/ignorerade OCR-rader, alias och tom OCR-bild. Inget horisontellt överflöde hittades vid 320, 390 eller 768 pixlars bredd. OCR-svaren i webbläsarkontrollen var simulerade.

## Ändrade filer

- `src/services/picking.js`, `productUnits.js`; nya `stock.js` och `productValidation.js`.
- `src/storage/products.js`, `pickLists.js`, `stockEvents.js`.
- `src/screens/Frysplock.jsx`, `NyPlocklista.jsx`, `Plocklista.jsx`, `PlockaProdukt.jsx`, `Produkter.jsx`, `SaldoVy.jsx`, `EfterLista.jsx`, `GranskaLista.jsx`, `FotaLista.jsx`.
- `src/utils/parseOcr.js`; nya `numbers.js` och `images.js`.
- Ny `src/components/BeskärBild.jsx` och tillhörande regler i `src/index.css`.
- `api/ocr.js`, `package.json`, `package-lock.json`, `README.md` samt nya testfiler under `tests/`.

`.env.local` har inte ändrats. Ingen deploy har gjorts och inga användarkonton eller nya lager-/backend-system har lagts till.

## Deg och Baka (första arbetsversion)

### Deg
- Egna degrecept sparas lokalt i IndexedDB.
- Varje recept har en grundmängd vatten och valfria ingredienser/enheter.
- Skriv in dagens vattenmängd så skalas hela receptet proportionellt.
- Inga standardrecept är förifyllda; lägg bara in bageriets verkliga recept.

### Baka
- Bakinformation kopplas till befintliga produkter.
- Stöd för temperatur, baktid, ånga, spjäll/ventil, tining, jäsning och specialinstruktion.
- Valfria snabbtimers för tining, jäsning och bakning.
- Flera timers kan vara igång samtidigt.
- Timers sparar en absolut sluttid, så rätt kvarvarande/överskriden tid visas när appen öppnas igen.
- Timers ger i denna version inget systemlarm när appen är helt stängd.
- Baka skapar inga lagerhändelser och påverkar aldrig fryssaldot.

### Databas
Dexie-schema version 3 lägger till `doughRecipes`, `bakeProfiles` och `bakeTimers` utan att ändra befintliga tabeller eller lagerlogik.
