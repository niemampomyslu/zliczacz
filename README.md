# Licznik ogrodzenia

Otwórz `index.html` w przeglądarce. Dane zapisują się w localStorage dla danego adresu strony. Aby uruchomić lokalny serwer: `python3 -m http.server 8000`, potem wejdź na http://localhost:8000. Możesz hostować te pliki na dowolnym hostingu statycznym HTTPS. Kopia JSON umożliwia przeniesienie danych między urządzeniami. Nie ma backendu ani synchronizacji.

## Ceny i kotwy

- **Kotwy** są zawsze liczone automatycznie: jedna kotwa na jeden słupek na każdej z trzech stron. Nie mają własnych przycisków +/-.
- **Ceny jednostkowe** są wspólne dla wszystkich trzech stron (PLN) i zapisują się natychmiast podczas wpisywania. Koszt pozycji = ilość × cena; aplikacja pokazuje koszt strony i całego ogrodzenia.
- Eksport CSV zawiera ilości, ceny i koszty. Kopia JSON obejmuje ceny. Można również wczytywać **stare kopie JSON**, które nie zawierają cen.
- Dotychczasowe liczniki w przeglądarce zachowują się bez zmian: aplikacja nadal korzysta z klucza localStorage `fence-counter-v1`. Nowe ceny początkowo wynoszą 0 zł. Wyzerowanie liczników jednej strony nie usuwa cen.
