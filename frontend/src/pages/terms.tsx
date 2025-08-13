import { useSearchParams, useNavigate } from "react-router-dom";

export default function Regulamin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const standalone = params.get("from") === "register";

  const content = (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>Regulamin korzystania z aplikacji FoodTracker</h1>
      <p><strong>Data wejścia w życie:</strong> 11.08.2025</p>

      <h2>1. Postanowienia ogólne</h2>
      <ol>
        <li>FoodTracker jest aplikacją internetową dostarczaną przez iPurel (dalej: „Usługodawca”), e-mail: <strong>support@ipurel.pl</strong>.</li>
        <li>Regulamin określa zasady korzystania z aplikacji oraz prawa i obowiązki Użytkowników.</li>
        <li>Korzystając z aplikacji, Użytkownik akceptuje niniejszy Regulamin oraz Politykę prywatności.</li>
        <li>Usługodawca świadczy usługi drogą elektroniczną zgodnie z prawem polskim.</li>
      </ol>

      <h2>2. Definicje</h2>
      <ul>
        <li><strong>Usługodawca</strong> – iPurel.</li>
        <li><strong>Aplikacja</strong> – FoodTracker, dostępna w przeglądarce internetowej.</li>
        <li><strong>Użytkownik</strong> – osoba korzystająca z Aplikacji.</li>
        <li><strong>Konto</strong> – zbiór zasobów w systemie Aplikacji przypisany do Użytkownika.</li>
      </ul>

      <h2>3. Warunki korzystania</h2>
      <ol>
        <li>Do korzystania z Aplikacji wymagane jest urządzenie z dostępem do Internetu i aktualną przeglądarką.</li>
        <li>Usługodawca może czasowo wstrzymać działanie Aplikacji w celu konserwacji lub aktualizacji.</li>
        <li>Zabrania się wykorzystywania Aplikacji do celów niezgodnych z prawem lub naruszających prawa osób trzecich.</li>
        <li>Użytkownik odpowiada za treści dodawane w Aplikacji i oświadcza, że posiada do nich prawa.</li>
      </ol>

      <h2>4. Ograniczenie odpowiedzialności</h2>
      <ol>
        <li>Aplikacja ma charakter informacyjny i wspomagający – nie zastępuje konsultacji z lekarzem, dietetykiem lub specjalistą.</li>
        <li>Usługodawca nie ponosi odpowiedzialności za skutki wykorzystania informacji zawartych w Aplikacji.</li>
        <li>Aplikacja jest udostępniana w formie „tak jak jest” (ang. as is) bez gwarancji dostępności i poprawności działania.</li>
      </ol>

      <h2>5. Pliki cookie</h2>
      <p>
        Aplikacja wykorzystuje pliki cookie niezbędne do działania (w tym przechowujące <strong>refresh token</strong> w trybie <code>HttpOnly</code> dla zachowania bezpieczeństwa sesji).
        Pliki cookie nie są wykorzystywane do profilowania ani śledzenia użytkownika w celach marketingowych.
      </p>

      <h2>6. Open Source i licencja</h2>
      <p>
        FoodTracker jest projektem open-source udostępnionym na licencji <strong>CC BY-NC 4.0</strong>.
        Oznacza to, że możesz go kopiować i modyfikować z podaniem autorstwa, ale nie możesz wykorzystywać komercyjnie.
      </p>

      <h2>7. Zmiany Regulaminu</h2>
      <p>Usługodawca zastrzega sobie prawo do zmiany Regulaminu. Użytkownicy zostaną poinformowani o zmianach poprzez Aplikację lub e-mail.</p>

      <h2>8. Usuwanie konta</h2>
      <ol>
        <li>Użytkownik może w dowolnym momencie usunąć swoje konto.</li>
        <li>Usługodawca może usunąć konto Użytkownika w przypadku naruszenia Regulaminu lub przepisów prawa.</li>
      </ol>

      <h2>9. Prawo właściwe i sąd</h2>
      <p>Wszelkie spory rozstrzygane będą przez sąd właściwy dla siedziby Usługodawcy, zgodnie z prawem polskim.</p>

      <h2>10. Kontakt</h2>
      <p>W sprawach związanych z Aplikacją prosimy o kontakt: <strong>support@ipurel.pl</strong></p>
    </div>
  );

  if (!standalone) return content;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-white">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <button
          onClick={() => navigate("/register")}
          className="mb-4 inline-flex items-center gap-2 text-teal-700 hover:underline"
        >
          <span className="text-xl">←</span> Wróć do rejestracji
        </button>
        {content}
      </div>
    </div>
  );
}
