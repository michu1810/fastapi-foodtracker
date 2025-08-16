import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function PolitykaPrywatnosci() {
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
      <h1>Polityka prywatności FoodTracker</h1>
      <p><strong>Data wejścia w życie:</strong> 11.08.2025</p>

      <h2>1. Administrator danych</h2>
      <p>Administratorem danych osobowych jest iPurel, e-mail: <strong>support@ipurel.pl</strong>.</p>

      <h2>2. Cele i podstawy przetwarzania</h2>
      <ol>
        <li>Obsługa konta użytkownika (art. 6 ust. 1 lit. b RODO).</li>
        <li>Zapewnienie działania Aplikacji, bezpieczeństwa i zapobieganie nadużyciom (art. 6 ust. 1 lit. f RODO).</li>
        <li>Realizacja obowiązków prawnych (art. 6 ust. 1 lit. c RODO).</li>
        <li>Wysyłka powiadomień e-mail lub marketingowych, jeśli Użytkownik wyrazi zgodę (art. 6 ust. 1 lit. a RODO).</li>
      </ol>

      <h2>3. Zakres danych</h2>
      <p>Przetwarzamy dane takie jak: e-mail, dane techniczne urządzenia, adres IP, logi systemowe, dane o aktywności w Aplikacji.</p>

      <h2>4. Odbiorcy danych</h2>
      <p>Dane mogą być przekazywane dostawcom usług IT (Render, Supabase), usług e-mail, analityki (np. Google Analytics) oraz organom uprawnionym na podstawie prawa.</p>

      <h2>5. Przekazywanie danych poza EOG</h2>
      <p>Korzystamy z usług Render i Supabase, które mogą przetwarzać dane w USA. Stosujemy standardowe klauzule umowne zatwierdzone przez Komisję Europejską.</p>

      <h2>6. Pliki cookie</h2>
      <p>
        Aplikacja korzysta z plików cookie w celu prawidłowego działania, w tym z <strong>cookie sesyjnych HttpOnly</strong> przechowujących refresh token.
        Nie stosujemy cookies w celach marketingowych ani do śledzenia użytkownika.
      </p>

      <h2>7. Czas przechowywania</h2>
      <p>Dane są przechowywane przez okres korzystania z Aplikacji, a po usunięciu konta – usuwane natychmiastowo. Logi systemowe do 6 miesięcy.</p>

      <h2>8. Prawa Użytkownika</h2>
      <ul>
        <li>dostęp do danych,</li>
        <li>sprostowanie danych,</li>
        <li>usunięcie danych,</li>
        <li>ograniczenie przetwarzania,</li>
        <li>sprzeciw wobec przetwarzania,</li>
        <li>przeniesienie danych,</li>
        <li>cofnięcie zgody w dowolnym momencie.</li>
      </ul>

      <h2>9. Zabezpieczenia danych</h2>
      <p>Stosujemy TLS/SSL, hasła przechowujemy w formie hashowanej, dostęp mają tylko upoważnione osoby.</p>

      <h2>10. Open Source i licencja</h2>
      <p>Projekt FoodTracker jest udostępniony na licencji <strong>CC BY-NC 4.0</strong>. Kod źródłowy jest publicznie dostępny, ale bez prawa do komercyjnego wykorzystania.</p>

      <h2>11. Kontakt w sprawach danych osobowych</h2>
      <p>iPurel, e-mail: <strong>support@ipurel.pl</strong></p>
    </div>
  );

  const en = (
    <div
      style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}
      className="text-gray-900 dark:text-slate-200"
    >
      <h1>FoodTracker Privacy Policy</h1>
      <p><strong>Effective date:</strong> 11.08.2025</p>

      <h2>1. Data Controller</h2>
      <p>The data controller is iPurel, e-mail: <strong>support@ipurel.pl</strong>.</p>

      <h2>2. Purposes and Legal Bases</h2>
      <ol>
        <li>User account handling (GDPR Art. 6(1)(b)).</li>
        <li>Ensuring the App works, security and abuse prevention (GDPR Art. 6(1)(f)).</li>
        <li>Compliance with legal obligations (GDPR Art. 6(1)(c)).</li>
        <li>Sending e-mail notifications or marketing if you consent (GDPR Art. 6(1)(a)).</li>
      </ol>

      <h2>3. Scope of Data</h2>
      <p>We process: e-mail, device technical data, IP address, system logs, and in-app activity data.</p>

      <h2>4. Data Recipients</h2>
      <p>Data may be shared with IT providers (Render, Supabase), e-mail services, analytics (e.g. Google Analytics), and competent authorities under the law.</p>

      <h2>5. Transfers outside the EEA</h2>
      <p>We use Render and Supabase which may process data in the USA. Standard Contractual Clauses approved by the European Commission are applied.</p>

      <h2>6. Cookies</h2>
      <p>
        The App uses cookies necessary for proper operation, including an <strong>HttpOnly session cookie</strong> that stores a refresh token.
        We do not use cookies for marketing or cross-site tracking.
      </p>

      <h2>7. Storage Periods</h2>
      <p>Data is kept for as long as you use the App. After account deletion, data is removed immediately. System logs are kept up to 6 months.</p>

      <h2>8. Your Rights</h2>
      <ul>
        <li>access,</li>
        <li>rectification,</li>
        <li>erasure,</li>
        <li>restriction,</li>
        <li>objection,</li>
        <li>data portability,</li>
        <li>withdraw consent at any time.</li>
      </ul>

      <h2>9. Data Security</h2>
      <p>We use TLS/SSL, store passwords hashed, and restrict access to authorized personnel only.</p>

      <h2>10. Open Source & License</h2>
      <p>FoodTracker is released under <strong>CC BY-NC 4.0</strong>. The source code is public, without rights for commercial use.</p>

      <h2>11. Contact</h2>
      <p>iPurel, e-mail: <strong>support@ipurel.pl</strong></p>
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
