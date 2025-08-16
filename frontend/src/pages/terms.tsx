import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Regulamin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const standalone = params.get("from") === "register";
  const lang: "pl" | "en" = i18n.language?.toLowerCase().startsWith("pl") ? "pl" : "en";

  const pl = (
    <div
      style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}
      className="text-gray-900 dark:text-slate-200"
    >
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
        <li>Aplikacja ma charakter informacyjny i wspomagający – nie zastępuje konsultacji ze specjalistą.</li>
        <li>Usługodawca nie ponosi odpowiedzialności za skutki wykorzystania informacji zawartych w Aplikacji.</li>
        <li>Aplikacja jest udostępniana w formie „as is” bez gwarancji dostępności i poprawności działania.</li>
      </ol>

      <h2>5. Pliki cookie</h2>
      <p>
        Aplikacja wykorzystuje pliki cookie niezbędne do działania (w tym przechowujące <strong>refresh token</strong> w trybie <code>HttpOnly</code>).
        Nie używamy cookies do profilowania ani śledzenia marketingowego.
      </p>

      <h2>6. Open Source i licencja</h2>
      <p>
        FoodTracker jest projektem open-source na licencji <strong>CC BY-NC 4.0</strong>.
        Możesz kopiować i modyfikować z podaniem autorstwa, bez prawa do komercyjnego wykorzystania.
      </p>

      <h2>7. Zmiany Regulaminu</h2>
      <p>Usługodawca może zmienić Regulamin. Użytkownicy zostaną poinformowani przez Aplikację lub e-mail.</p>

      <h2>8. Usuwanie konta</h2>
      <ol>
        <li>Użytkownik może w dowolnym momencie usunąć konto.</li>
        <li>Usługodawca może usunąć konto w razie naruszeń Regulaminu lub prawa.</li>
      </ol>

      <h2>9. Prawo właściwe i sąd</h2>
      <p>Spory rozstrzyga sąd właściwy dla siedziby Usługodawcy, zgodnie z prawem polskim.</p>

      <h2>10. Kontakt</h2>
      <p>W sprawach związanych z Aplikacją: <strong>support@ipurel.pl</strong></p>
    </div>
  );

  const en = (
    <div
      style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}
      className="text-gray-900 dark:text-slate-200"
    >
      <h1>FoodTracker Terms of Service</h1>
      <p><strong>Effective date:</strong> 11.08.2025</p>

      <h2>1. General Provisions</h2>
      <ol>
        <li>FoodTracker is a web application provided by iPurel (“Provider”), e-mail: <strong>support@ipurel.pl</strong>.</li>
        <li>These Terms set the rules of using the App and the rights and obligations of Users.</li>
        <li>By using the App, you accept these Terms and the Privacy Policy.</li>
        <li>The Provider delivers electronic services under Polish law.</li>
      </ol>

      <h2>2. Definitions</h2>
      <ul>
        <li><strong>Provider</strong> – iPurel.</li>
        <li><strong>App</strong> – FoodTracker, accessible via web browser.</li>
        <li><strong>User</strong> – a person using the App.</li>
        <li><strong>Account</strong> – a set of resources in the App’s system assigned to a User.</li>
      </ul>

      <h2>3. Conditions of Use</h2>
      <ol>
        <li>A device with Internet access and a modern browser is required.</li>
        <li>The Provider may temporarily suspend the App for maintenance or updates.</li>
        <li>It is forbidden to use the App unlawfully or to violate third-party rights.</li>
        <li>The User is responsible for content they add and confirms having the rights to it.</li>
      </ol>

      <h2>4. Liability</h2>
      <ol>
        <li>The App is informational/supportive — it does not replace professional advice.</li>
        <li>The Provider is not liable for effects of using information in the App.</li>
        <li>The App is provided “as is”, with no guarantees of availability or flawless operation.</li>
      </ol>

      <h2>5. Cookies</h2>
      <p>
        The App uses strictly necessary cookies (including an <strong>HttpOnly</strong> cookie storing a refresh token).
        We do not use cookies for profiling or marketing tracking.
      </p>

      <h2>6. Open Source & License</h2>
      <p>
        FoodTracker is open-source under <strong>CC BY-NC 4.0</strong>.
        You may copy and modify with attribution, but not for commercial use.
      </p>

      <h2>7. Changes to the Terms</h2>
      <p>The Provider may change the Terms. Users will be notified via the App or e-mail.</p>

      <h2>8. Account Deletion</h2>
      <ol>
        <li>Users can delete their account at any time.</li>
        <li>The Provider may delete an account in case of violations of the Terms or the law.</li>
      </ol>

      <h2>9. Governing Law & Venue</h2>
      <p>Disputes are resolved by the court competent for the Provider’s seat under Polish law.</p>

      <h2>10. Contact</h2>
      <p>For matters related to the App: <strong>support@ipurel.pl</strong></p>
    </div>
  );

  const content = lang === "pl" ? pl : en;

  if (!standalone) return content;

  const backLabel = lang === "pl" ? "Wróć do rejestracji" : "Back to registration";

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-white dark:bg-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <button
          onClick={() => navigate("/register")}
          className="mb-4 inline-flex items-center gap-2 text-teal-700 dark:text-teal-400 hover:underline"
        >
          <span className="text-xl">←</span> {backLabel}
        </button>
        {content}
      </div>
    </div>
  );
}
