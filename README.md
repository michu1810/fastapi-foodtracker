# 🍲 Food Tracker - Zaawansowana Aplikacja Full-Stack

![Python](https://img.shields.io/badge/python-3.13-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green.svg)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-37782A?style=for-the-badge&logo=celery&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

Food Tracker to więcej niż prosta aplikacja do śledzenia jedzenia. To w pełni funkcjonalny, bezpieczny i skalowalny system webowy, zaprojektowany z myślą o najlepszych praktykach inżynierii oprogramowania. Projekt ten demonstruje kompleksowe umiejętności w zakresie tworzenia nowoczesnych aplikacji backendowych, od architektury i bezpieczeństwa, po asynchroniczność i konteneryzację.

## 🌟 Główne Funkcjonalności

- **Zaawansowany system uwierzytelniania:** Rejestracja, logowanie, weryfikacja email, resetowanie hasła.
- **Logowanie przez serwisy zewnętrzne:** Pełna integracja z Google i GitHub przy użyciu protokołu OAuth2.
- **Zarządzanie produktami (CRUD):** Pełna obsługa dodawania, edytowania, usuwania i przeglądania produktów.
- **Inteligentne daty ważności:** System sugeruje datę ważności dla produktów świeżych na podstawie daty zakupu.
- **Asynchroniczne powiadomienia email:** Codzienne, automatyczne powiadomienia o produktach, których termin ważności wkrótce upływa, realizowane za pomocą Celery i Redis.
- **Dashboard użytkownika:** Dynamiczny panel z listą produktów wymagających uwagi.
- **Statystyki i analityka:** Śledzenie oszczędzonych i zmarnowanych pieniędzy oraz wykresy trendów pokazujące wzorce dodawania produktów z uwzględnieniem strefy czasowej użytkownika.
- **System osiągnięć:** Gamifikacja motywująca użytkowników do niemarnowania żywności.

## 🛠️ Stos Technologiczny

| Kategoria | Technologia | Opis |
| :--- | :--- | :--- |
| **Backend** | Python 3.13, FastAPI | Nowoczesny, asynchroniczny framework do budowy wysokowydajnego API. |
| | PostgreSQL, SQLAlchemy | Niezawodna, relacyjna baza danych z asynchronicznym ORM. |
| | Alembic | Narzędzie do zarządzania migracjami schematu bazy danych. |
| | Pydantic | Walidacja danych i zarządzanie konfiguracją z plików `.env`. |
| | Celery, Redis, Celery Beat | System do obsługi zadań w tle i planowania (scheduling). |
| | JWT (Access & Refresh Tokens) | Standard branżowy do bezpiecznej autoryzacji w aplikacjach webowych. |
| **Frontend**| React 19, TypeScript | Budowa interaktywnego i bezpiecznego typowo interfejsu użytkownika. |
| | Vite | Nowoczesne narzędzie do budowania i serwowania aplikacji frontendowych. |
| | Tailwind CSS | Framework CSS typu utility-first do szybkiego prototypowania UI. |
| | Axios | Klient HTTP z interceptorami do obsługi odświeżania tokenów. |
| **Infrastruktura** | Docker, Docker Compose | Pełna konteneryzacja aplikacji z podziałem na środowisko deweloperskie i produkcyjne. |

## 🛡️ Architektura i Aspekty Bezpieczeństwa

Ta aplikacja została zbudowana z silnym naciskiem na bezpieczeństwo i solidną architekturę.

- **Uwierzytelnianie JWT:** System wykorzystuje parę tokenów: krótkożyjący `access_token` i długożyjący `refresh_token`. `refresh_token` jest przechowywany w bezpiecznym ciasteczku **`HttpOnly`**, co uniemożliwia jego odczytanie przez skrypty JavaScript i chroni przed atakami XSS.
- **Bezpieczeństwo Haseł:** Hasła użytkowników są hashowane za pomocą silnego, adaptacyjnego algorytmu **bcrypt**.
- **Ochrona API:** Endpointy są zabezpieczone przed atakami typu brute-force za pomocą **rate-limitingu** opartego na Redis (`slowapi`).
- **Konfiguracja CORS:** Precyzyjnie skonfigurowana polityka CORS zezwala na komunikację tylko z zaufanym adresem aplikacji frontendowej.
- **Konteneryzacja zorientowana na bezpieczeństwo:** Aplikacja w kontenerze Docker działa jako **użytkownik bez uprawnień roota**, co znacznie ogranicza potencjalne szkody w przypadku kompromitacji.
- **Separacja Konfiguracji:** Ścisłe oddzielenie konfiguracji od kodu. Wrażliwe dane (klucze API, hasła) są ładowane ze zmiennych środowiskowych (`.env`) i nigdy nie są częścią repozytorium.
- **Gotowość produkcyjna:** Projekt posiada osobne konfiguracje `docker-compose.yml` dla developmentu (z live-reloading) i `docker-compose.prod.yml` dla produkcji (zoptymalizowany pod kątem wydajności i bezpieczeństwa).

### 🤖 Frontend jako wizytówka dla API

Frontend tej aplikacji, stworzony w React i TypeScript, został zaprojektowany jako rozbudowany, ale wciąż tylko klient dla potężnego i bezpiecznego API backendowego. Jego głównym celem jest demonstracja wszystkich możliwości, jakie oferuje backend. W celu maksymalizacji efektywności i skupienia się na logice serwerowej, UI/UX frontendu było częściowo konsultowane i generowane przy wsparciu AI, co pozwoliło na szybkie stworzenie w pełni funkcjonalnej "witryny" dla API.

## 🚀 Uruchomienie Projektu

Projekt jest w pełni skonteneryzowany i najprostszym sposobem na jego uruchomienie jest Docker Compose.

1.  **Sklonuj repozytorium:**
    ```bash
    git clone [https://github.com/michu1810/fastapi-foodtracker.git](https://github.com/michu1810/fastapi-foodtracker.git)
    cd fastapi-foodtracker
    ```

2.  **Skonfiguruj zmienne środowiskowe:**
    Stwórz pliki `.env` w folderach `foodtracker/` oraz `frontend/` na podstawie znajdujących się tam plików `.env.example`. Uzupełnij je wymaganymi kluczami (baza danych, klucze API dla Google/GitHub/reCAPTCHA, klucze SMTP).

3.  **Zbuduj i uruchom kontenery:**
    ```bash
    docker-compose up --build
    ```

4.  **Gotowe!**
    - Aplikacja frontendowa jest dostępna pod adresem: `http://localhost:5173`
    - Backend API jest dostępne pod adresem: `http://localhost:8000/docs` (interaktywna dokumentacja Swagger UI)

## 🖼️ Galeria

*Tutaj wklej zrzuty ekranu swojej aplikacji!*

![Dashboard](https://via.placeholder.com/800x400.png?text=Zrzut+Ekranu+Panelu+Głównego)
_Panel główny aplikacji_

![Statystyki](https://via.placeholder.com/800x400.png?text=Zrzut+Ekranu+Statystyk)
_Strona ze statystykami i wykresem trendów_


## 👤 Autor

Stworzone przez **Michał Jamros** - [michu1810](https://github.com/michu1810)
