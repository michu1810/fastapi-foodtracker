import { useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Plus, ShieldCheck, Users, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PantryManagement } from '../components/PantryManagement';
import { usePantry } from '../context/PantryContext';
import { pantryService } from '../services/pantryService';
import { useTranslation } from 'react-i18next';

export const PantryManagementPage = () => {
  const { t } = useTranslation();
  const { pantries, selectedPantry, selectPantry, loading, refreshPantries } = usePantry();
  const [firstPantryName, setFirstPantryName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleDataChange = async () => {
    await refreshPantries();
  };

  const handleCreateFirstPantry = async () => {
    if (firstPantryName.trim().length < 2) {
      toast.error(t('pantryMgmt.toasts.createNameTooShort'));
      return;
    }

    setCreating(true);
    try {
      const createdPantry = await pantryService.createPantry(firstPantryName.trim());
      localStorage.setItem('selectedPantryId', String(createdPantry.id));
      toast.success(t('pantryMgmt.toasts.createOk', { name: createdPantry.name }));
      setFirstPantryName('');
      await refreshPantries();
      selectPantry(createdPantry.id);
    } catch (error: unknown) {
      console.error('Create first pantry failed:', error);
      const apiError = error as { response?: { data?: { detail?: string } } };
      toast.error(apiError.response?.data?.detail || t('pantryMgmt.toasts.createFail'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen"
    >
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-slate-200 p-5 dark:border-slate-700 lg:border-b-0 lg:border-r">
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {t('pantryMgmt.page.eyebrow')}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {t('pantryMgmt.page.title')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t('pantryMgmt.page.subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              <HeaderMetric icon={Warehouse} label={t('pantryMgmt.page.totalPantries')} value={String(pantries.length)} />
              <HeaderMetric
                icon={Users}
                label={t('pantryMgmt.page.activeMembers')}
                value={String(selectedPantry?.member_associations.length ?? 0)}
              />
            </div>
          </div>
        </section>

        {pantries.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-white">{t('pantryMgmt.page.switchTitle')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('pantryMgmt.page.switchBody')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {pantries.map((pantry) => (
                  <button
                    key={pantry.id}
                    type="button"
                    onClick={() => selectPantry(pantry.id)}
                    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                      selectedPantry?.id === pantry.id
                        ? 'border-teal-500 bg-teal-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Warehouse className="h-4 w-4" aria-hidden="true" />
                    {pantry.name}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-md dark:border-slate-700 dark:bg-slate-900">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-teal-600 dark:text-teal-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('loadingPantry')}</p>
          </div>
        )}

        {!loading && selectedPantry && (
          <PantryManagement
            pantry={selectedPantry}
            pantryCount={pantries.length}
            onDataChange={handleDataChange}
          />
        )}

        {!loading && !selectedPantry && (
          <section className="rounded-xl border border-teal-200 bg-teal-50 p-5 shadow-md dark:border-teal-500/30 dark:bg-teal-500/10">
            <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr] lg:items-center">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('pantryMgmt.empty.eyebrow')}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {t('pantryMgmt.empty.title')}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-900/80 dark:text-teal-100/80">
                  {t('pantryMgmt.empty.body')}
                </p>
              </div>
              <div className="rounded-xl border border-teal-200 bg-white p-4 shadow-sm dark:border-teal-500/30 dark:bg-slate-950">
                <label htmlFor="first-pantry-name" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('pantryMgmt.modals.namePlaceholder')}
                </label>
                <input
                  id="first-pantry-name"
                  type="text"
                  value={firstPantryName}
                  onChange={(event) => setFirstPantryName(event.target.value)}
                  placeholder={t('pantryMgmt.empty.placeholder')}
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-950 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleCreateFirstPantry}
                  disabled={creating}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-60 active:scale-95 dark:focus-visible:ring-offset-slate-950"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  {t('pantryMgmt.empty.cta')}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
};

type HeaderMetricProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

function HeaderMetric({ icon: Icon, label, value }: HeaderMetricProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
      <Icon className="h-4 w-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
