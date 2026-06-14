import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Mail } from "lucide-react";
import type { SVGProps } from "react";

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
  const businessMailto = `mailto:${email}?subject=${encodeURIComponent(t("footer.businessSubject"))}`;

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">

        <div className="sm:col-span-2">
          <div className="flex flex-col md:flex-row md:items-start md:gap-6">
            <img
              src="/nazwabeztla.svg"
              alt="ipurel"
              className="h-28 sm:h-20 md:h-28 w-auto select-none shrink-0"
              loading="eager"
            />

            <div className="mt-4 md:mt-0">
              <p className="max-w-prose text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("footer.description")}
              </p>

              <div className="mt-4 flex items-center gap-3">
                <a
                  href={facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-500/50 dark:hover:bg-teal-500/10 dark:hover:text-teal-200 dark:focus-visible:ring-offset-slate-950"
                >
                  <IconFacebook className="h-5 w-5" />
                </a>
                <a
                  href={instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-500/50 dark:hover:bg-teal-500/10 dark:hover:text-teal-200 dark:focus-visible:ring-offset-slate-950"
                >
                  <IconInstagram className="h-5 w-5" />
                </a>
                <a
                  href={tiktok}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-500/50 dark:hover:bg-teal-500/10 dark:hover:text-teal-200 dark:focus-visible:ring-offset-slate-950"
                >
                  <IconTiktok className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-500 dark:text-slate-400">{t("footer.info")}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="https://ipurel.pl" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-700 transition hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-200 dark:hover:text-teal-200">
                {t("footer.about")}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
            <li><Link to="/polityka-prywatnosci" className="text-slate-700 transition hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-200 dark:hover:text-teal-200">{t("footer.privacy")}</Link></li>
            <li><Link to="/regulamin" className="text-slate-700 transition hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-200 dark:hover:text-teal-200">{t("footer.terms")}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-500 dark:text-slate-400">{t("footer.contact")}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={`mailto:${email}`} className="inline-flex items-center gap-2 text-slate-700 transition hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-200 dark:hover:text-teal-200">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {email}
              </a>
            </li>
          </ul>

          <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 dark:border-teal-500/30 dark:bg-teal-500/10">
            <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">{t("footer.cta")}</p>
            <p className="mt-1 text-xs leading-5 text-teal-800/80 dark:text-teal-100/75">{t("footer.ctaBody")}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row lg:flex-col">
              <a
                href={businessMailto}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 active:scale-95 dark:focus-visible:ring-offset-slate-950"
              >
                {t("footer.ctaAction")}
              </a>
              <a
                href={landingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-teal-300 bg-white px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 active:scale-95 dark:border-teal-500/40 dark:bg-slate-950 dark:text-teal-200 dark:hover:bg-teal-500/10 dark:focus-visible:ring-offset-slate-950"
              >
                {t("footer.website")}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 text-xs text-gray-500 dark:text-slate-400 sm:px-6 lg:px-8">
          <span>{t("footer.rights", { year })}</span>
          <span className="text-gray-600 dark:text-slate-300">{t("appName", { defaultValue: "FoodTracker" })}</span>
        </div>
      </div>
    </footer>
  );
}

/* Social icons */
function IconFacebook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13 22v-9h3l1-4h-4V6c0-1.1.9-2 2-2h2V1h-3a5 5 0 00-5 5v3H6v4h3v9h4z" />
    </svg>
  );
}
function IconInstagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 5a5 5 0 100 10 5 5 0 000-10zm6.5-.75a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zM12 9a3 3 0 110 6 3 3 0 010-6z" />
    </svg>
  );
}
function IconTiktok(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 3h3a5 5 0 005 5v3a7.99 7.99 0 01-5-2v6a6 6 0 11-6-6c.35 0 .69.03 1 .1V12a3 3 0 103 3V3z" />
    </svg>
  );
}
