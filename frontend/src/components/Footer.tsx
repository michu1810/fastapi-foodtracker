import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type FooterProps = {
  landingUrl?: string;
  email?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
};

export default function Footer({
  landingUrl = "https://ipurel.pl",
  email = "support@ipurel.pl",
  facebook = "https://www.facebook.com/profile.php?id=61578936944815",
  instagram = "https://www.instagram.com/ipurel_official/",
  tiktok = "https://www.tiktok.com/@ipurel_official",
}: FooterProps) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t bg-white dark:bg-slate-900 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">

        {/* Brand + opis */}
        <div className="sm:col-span-2">
          <div className="flex flex-col md:flex-row md:items-start md:gap-6">
            <img
              src="/nazwabeztla.svg"
              alt="ipurel"
              className="h-28 sm:h-20 md:h-28 w-auto select-none shrink-0"
              loading="eager"
            />

            <div className="mt-4 md:mt-0">
              <p className="text-sm text-gray-600 dark:text-slate-300 max-w-prose">
                {t("footer.description")}
              </p>

              <div className="mt-4 flex items-center gap-3">
                <a
                  href={facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition transform hover:scale-110 active:scale-95
                             dark:border-slate-600 dark:hover:bg-slate-800 dark:text-slate-200"
                >
                  <IconFacebook className="h-5 w-5" />
                </a>
                <a
                  href={instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition transform hover:scale-110 active:scale-95
                             dark:border-slate-600 dark:hover:bg-slate-800 dark:text-slate-200"
                >
                  <IconInstagram className="h-5 w-5" />
                </a>
                <a
                  href={tiktok}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition transform hover:scale-110 active:scale-95
                             dark:border-slate-600 dark:hover:bg-slate-800 dark:text-slate-200"
                >
                  <IconTiktok className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Linki */}
        <div>
          <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-500 dark:text-slate-400">{t("footer.info")}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="https://ipurel.pl" target="_blank" rel="noreferrer" className="hover:underline text-gray-700 dark:text-slate-200">
                {t("footer.about")}
              </a>
            </li>
            <li><Link to="/polityka-prywatnosci" className="hover:underline text-gray-700 dark:text-slate-200">{t("footer.privacy")}</Link></li>
            <li><Link to="/regulamin" className="hover:underline text-gray-700 dark:text-slate-200">{t("footer.terms")}</Link></li>
          </ul>
        </div>

        {/* Kontakt + CTA */}
        <div>
          <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-500 dark:text-slate-400">{t("footer.contact")}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={`mailto:${email}`} className="hover:underline text-gray-700 dark:text-slate-200">{email}</a></li>
          </ul>

          <a
            href={landingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 active:scale-95 transition shadow-sm"
          >
            {t("footer.cta")}
          </a>
        </div>
      </div>

      {/* Dolny pasek */}
      <div className="border-t dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between">
          <span>{t("footer.rights", { year })}</span>
          <span className="text-gray-600 dark:text-slate-300">{t("appName", { defaultValue: "FoodTracker" })}</span>
        </div>
      </div>
    </footer>
  );
}

/* Ikony social – SVG */
function IconFacebook(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13 22v-9h3l1-4h-4V6c0-1.1.9-2 2-2h2V1h-3a5 5 0 00-5 5v3H6v4h3v9h4z" />
    </svg>
  );
}
function IconInstagram(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 5a5 5 0 100 10 5 5 0 000-10zm6.5-.75a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zM12 9a3 3 0 110 6 3 3 0 010-6z" />
    </svg>
  );
}
function IconTiktok(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 3h3a5 5 0 005 5v3a7.99 7.99 0 01-5-2v6a6 6 0 11-6-6c.35 0 .69.03 1 .1V12a3 3 0 103 3V3z" />
    </svg>
  );
}
