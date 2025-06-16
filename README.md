# 🍲 Food Tracker - Moje rozwiązanie problemu marnowania żywności

![Python](https://img.shields.io/badge/python-3.13-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green.svg)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red.svg)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-37782A?style=for-the-badge&logo=celery&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Pytest](https://img.shields.io/badge/pytest-✓-green.svg)

## 🎯 Misja Projektu

Każdego roku w Polsce marnuje się blisko 5 milionów ton żywności. Wyrzucamy jedzenie, bo zapominamy o terminach ważności, kupujemy za dużo, źle planujemy. Postanowiłem wykorzystać swoje umiejętności techniczne, aby stworzyć narzędzie, które realnie pomaga walczyć z tym wszechobecnym problemem na poziomie każdego z nas.

**Food Tracker** to moja odpowiedź na to wyzwanie. To w pełni funkcjonalna aplikacja webowa, którą zaprojektowałem i zbudowałem od podstaw, aby dać użytkownikom prosty i skuteczny sposób na zarządzanie domową spiżarnią, oszczędzanie pieniędzy i dbanie o naszą planetę.

To repozytorium to nie tylko kod – to demonstracja mojego podejścia do tworzenia kompleksowych, bezpiecznych i wydajnych systemów backendowych.

## 🌟 Co Zaimplementowałem? Główne Funkcjonalności

Aplikacja oferuje szeroki zakres funkcjonalności, które odzwierciedlają realne potrzeby i motywują do działania:

#### Zarządzanie Użytkownikiem
- **Pełen cykl życia konta:** Od rejestracji, przez weryfikację email, logowanie, po bezpieczną zmianę i resetowanie hasła.
- **Logowanie przez OAuth2:** Zaimplementowałem wygodne logowanie przez konta Google i GitHub.
- **Bezpieczeństwo sesji:** Stworzyłem system oparty na tokenach JWT z mechanizmem Access i Refresh Token.

#### Logika Biznesowa Aplikacji
- **Inteligentne Zarządzanie Produktami (CRUD):** Pełna obsługa dodawania, edytowania i usuwania produktów spożywczych.
- **Asynchroniczne Powiadomienia:** Zaprojektowałem automatyczny system codziennych powiadomień email o produktach, których termin ważności wkrótce upływa, wykorzystując do tego Celery.
- **Obsługa Produktów Świeżych:** Aplikacja potrafi sugerować datę ważności dla produktów bez etykiety (np. warzyw) na podstawie daty ich zakupu.

#### Analityka i Gamifikacja
- **Statystyki Finansowe:** Użytkownik może śledzić realne oszczędności wynikające z niemarnowania kupionej żywności.
- **Wizualizacja Danych:** Zbudowałem endpointy do generowania wykresów trendów, które poprawnie obsługują strefy czasowe, aby dane zawsze były spójne dla użytkownika.
- **System Osiągnięć:** Zaprojektowałem i wdrożyłem ponad 20 różnych osiągnięć, aby motywować użytkowników poprzez gamifikację.

## 🛡️ Architektura i Rozwiązania Techniczne (Backend Deep Dive)

Projektując architekturę backendu, postawiłem sobie kilka kluczowych celów: **bezpieczeństwo, wydajność i skalowalność**. Poniżej przedstawiam najważniejsze decyzje techniczne, które podjąłem, aby je osiągnąć:

-   **API Design (FastAPI):** Wybrałem asynchroniczny framework **FastAPI**, aby zapewnić ekstremalnie wysoką wydajność i niskie opóźnienia, nawet pod dużym obciążeniem. Wykorzystałem wbudowany mechanizm **Dependency Injection** do zarządzania sesjami bazy danych i weryfikacji tożsamości użytkownika.

-   **Uwierzytelnianie i Bezpieczeństwo:** Zaimplementowałem stanowe uwierzytelnianie oparte na **tokenach JWT**. Długożyjący `refresh_token` przechowuję w bezpiecznym ciasteczku **`HttpOnly`**, co stanowi branżowy standard ochrony przed atakami **XSS**. Hasła użytkowników są chronione za pomocą silnego, adaptacyjnego algorytmu **bcrypt**.

-   **Asynchroniczne Zadania w Tle (Celery):** Wysyłkę maili i cykliczne sprawdzanie dat ważności oddelegowałem do asynchronicznych zadań **Celery**. Dzięki temu API pozostaje responsywne. **Celery Beat** działa jako wbudowany harmonogram, gwarantując automatyzację kluczowych procesów.

-   **Baza Danych (PostgreSQL & SQLAlchemy):** Postawiłem na w pełni **asynchroniczny stos bazodanowy** z `asyncpg` i `AsyncSession` w SQLAlchemy. Do zarządzania zmianami w schemacie bazy użyłem **Alembic**, co zapewnia wersjonowanie i bezpieczeństwo migracji. Wartości finansowe przechowuję jako precyzyjny typ **`Decimal`**, aby uniknąć błędów zaokrągleń.

-   **Konteneryzacja i Środowiska (Docker):** Cała aplikacja została zamknięta w kontenerach **Docker**, z osobnymi, zoptymalizowanymi konfiguracjami dla środowiska deweloperskiego (`docker-compose.yml`) i produkcyjnego (`docker-compose.prod.yml`). Dla zwiększenia bezpieczeństwa, procesy w kontenerach działają jako **użytkownik bez uprawnień roota**.

## 🧪 Strategia Testowania

Wierzę, że solidne testy to fundament niezawodnego oprogramowania. Dlatego stworzyłem rozbudowany zestaw **testów automatycznych** napisanych przy użyciu `pytest`.

-   **Izolacja:** Testy uruchamiane są w całkowicie izolowanym środowisku, z tymczasową bazą danych **SQLite w pamięci**, co zapewnia szybkość i powtarzalność wyników.
-   **Zakres:** Testy API weryfikują całe przepływy biznesowe, walidację danych wejściowych (zarówno poprawne, jak i błędne przypadki) oraz krytyczne aspekty bezpieczeństwa, takie jak weryfikacja, czy jeden użytkownik nie ma dostępu do danych innego.

## 🚀 Uruchomienie Projektu

Dzięki konteneryzacji, uruchomienie projektu jest niezwykle proste.

1.  **Sklonuj repozytorium:**
    ```bash
    git clone [https://github.com/michu1810/fastapi-foodtracker.git](https://github.com/michu1810/fastapi-foodtracker.git)
    cd fastapi-foodtracker
    ```

2.  **Skonfiguruj zmienne środowiskowe:**
    Stwórz pliki `.env` w folderach `foodtracker/` oraz `frontend/` na podstawie plików `.env.example`. Uzupełnij je wymaganymi kluczami.

3.  **Zbuduj i uruchom kontenery:**
    ```bash
    docker-compose up --build
    ```

4.  **Gotowe!**
    -   Aplikacja frontendowa jest dostępna pod adresem: `http://localhost:5173`
    -   Interaktywna dokumentacja API (Swagger UI) pod: `http://localhost:8000/docs`

## 🖼️ Galeria

*(Poniżej znajdują się zrzuty ekranu prezentujące aplikację.)*

![Panel Główny](https://i.imgur.com/e4c9de.png)
_Panel główny aplikacji z wykresem trendów._

![Logowanie](https://i.imgur.com/e464a1.jpg)
_Strona logowania z opcjami OAuth._

## 👤 Autor

Projekt stworzony przeze mnie od A do Z. <br>
**Michał Jamros** - [github.com/michu1810](https://github.com/michu1810)