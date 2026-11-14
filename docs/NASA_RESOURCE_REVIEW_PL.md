# Mission Architect — audyt NASA i propozycje PR

Data: 14 listopada 2026. Sprawdzony commit: edde4d8.

## Wniosek
Gra reprezentuje cztery segmenty misji. CML i MDL są uproszczonymi adaptacjami koncepcji. GMAT i NASA Mission Viz nie są zintegrowane: link lub inspiracja nie oznacza wykorzystania oprogramowania NASA.

Oficjalna strona Resources nie była dostępna przez narzędzie odczytu. Listę dziewięciu zasobów porównano z publikacją lokalnego organizatora HackAthlone. To audyt kodu, nie test pełnej rozgrywki ani certyfikacja zgodności naukowej.

## Cztery segmenty
- Launch: rakieta, udźwig i termin startu.
- Space: platforma, masa, bilans mocy i instrumenty.
- Ground: stacje, czas kontaktu, przepustowość i dane docierające na Ziemię.
- User: cele, dostarczane dane i wynik naukowy. Brakuje odrębnych decyzji dotyczących analizy oraz potrzeb odbiorców.

Dowód: engine/nasa.py, funkcja segments(); prezentacja w web/nasa.js. Dla typów program i vehicle Ground jest stałym opisem Mission Control, nie rozbudowaną mechaniką.

## Dziewięć zasobów
1. Design and Develop Science Missions: cztery segmenty i sześć kroków procesu. Brakuje jawnego śledzenia wymaganie → dowód spełnienia.
2. Concept Maturity Levels (CMLs): poziomy 1–4, porównanie dwóch projektów i marginesy. Kompletność konfiguracji nie powinna sama oznaczać wykonalności.
3. Mission Design Lab (MDL): role, lista wyposażenia i główne czynniki masy/kosztu. Inspiracja procesem, nie integracja z laboratorium.
4. GMAT: zewnętrzny zasób edukacyjny; brak obliczeń lub walidacji wykonanych w GMAT.
5. NASA Mission Viz: zewnętrzny zasób i inspiracja; własna animacja nie jest integracją Mission Viz.
6. A Learning Game About Telescopes: porównania z realnymi misjami i inspiracja scenariuszem teleskopu. Pełna zgodność cel → pasmo → instrument → optyka wymaga dalszego rozwinięcia i sprawdzenia.
7. CubeSat 101: testowanie, zapasowy egzemplarz, rezerwy i wskazówki. Rezerwa 10% jest regułą gry, nie uniwersalnym wymaganiem NASA.
8. Visualize a Space Mission Using Virtual Reality (2023): inspiracja przebiegiem misji i osią czasu; brak VR.
9. CSA Digital Games and Activities: link do dalszej nauki, bez odrębnej integracji.

## Proponowane PR-y i kryteria odbioru

### PR 1 — Uczciwe oznaczenia zasobów (priorytet P1)
README i biblioteka rozróżniają: mechanika, inspiracja, link, integracja. Nie deklarują korzystania z silnika GMAT ani Mission Viz. Każdy wpis wskazuje faktyczną funkcję albo zewnętrzny zasób.

### PR 2 — User segment: dostarczenie wartości naukowej (P1)
Odbiorca danych ma wymagania ilości, jakości i terminu. Gracz wybiera zdolność przetwarzania kosztem budżetu. Odbiór: misja może wystartować i transmitować, lecz nie spełnić celu odbiorcy; raport wyjaśnia przyczynę.

### PR 3 — CML z dowodami i przegląd MDL (P1)
Wykonalność wymaga braku krytycznych sprzeczności. Trade study wymaga dwóch różnych wariantów i widocznego kompromisu. Point design zawiera wyposażenie, marginesy, ryzyka i uzasadnienie. Odbiór: kompletny, lecz niewykonalny projekt nie otrzymuje potwierdzenia wykonalności. Poziomy pozostają edukacyjną adaptacją.

### PR 4 — Interaktywna wizualizacja trajektorii (P2)
Mapa orbity, statek, fazy, oś czasu i okna kontaktu. Odbiór: zmiana czasu zmienia pozycję i dostępność łączności. Własną wizualizację opisujemy jako własną, nie jako integrację NASA Mission Viz.

### PR 5 — Odtwarzalny scenariusz referencyjny GMAT (P2)
Jeden scenariusz, skrypt GMAT, raport rzeczywistego uruchomienia i porównanie z modelem gry. Odbiór: wersja narzędzia, parametry, jednostki, wyniki i różnice. Sam eksport skryptu nie jest walidacją. Bez deklarowania walidacji całej gry na podstawie jednego przypadku.

### PR 6 — Zgodność celów i instrumentów (P2)
Dla teleskopu: cel → pasmo → instrument → optyka, wraz z wyjaśnieniem niezgodności. Odbiór: droższy instrument nie gwarantuje lepszego wyniku, jeśli nie pasuje do celu naukowego.

## Kolejność
PR 1 → PR 3 → PR 2 → PR 4. GMAT i rozszerzenie instrumentów po stabilnym demo. Propozycje nie są informacją o wdrożonych funkcjach. Obecny patch obejmuje wyłącznie oznaczenia i dokumentację; pozostałe PR-y to plan do review.

## Źródła
- Repo: https://github.com/kosmofranek-maker/mission-architect
- Challenge: https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/?tab=resources
- Pomocnicza publikacja organizatora: https://hackathlone.com/challenges/space-mission-design-game
- NASA: https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf
- GMAT: https://software.nasa.gov/software/GSC-19468-1
- MDL: https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/
