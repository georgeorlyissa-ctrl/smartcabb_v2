import { motion } from '../../lib/motion';
import { Card } from '../ui/card';
import { Car, Calendar, DollarSign, TrendingUp, Wallet } from '../../lib/admin-icons';

/**
 * Vue « Revenus » du tableau de bord admin.
 *
 * Ordre demandé par l'exploitation :
 *   1. Gain total (toutes sources)
 *   2. Gain des commandes de course (immédiates)
 *   3. Gain des commandes par réservation (à l'avance)
 * puis la tendance sur 12 mois.
 *
 * Les données viennent de `/admin/stats` (champ `revenue`). Le graphique est
 * volontairement en CSS (pas de librairie de charts) pour rester léger et
 * compatible avec le build Vercel.
 */

interface MonthlyPoint {
  month: string;
  label: string;
  shortLabel: string;
  ridesCDF: number;
  reservationsCDF: number;
  totalCDF: number;
}

interface RevenueStats {
  totalCDF: number;
  ridesCDF: number;
  reservationsCDF: number;
  todayCDF: number;
  ridesTodayCDF: number;
  reservationsTodayCDF: number;
  monthCDF: number;
  ridesMonthCDF: number;
  reservationsMonthCDF: number;
  ridesCount: number;
  reservationsCount: number;
  reservationsTotal?: number;
  monthly?: MonthlyPoint[];
}

const formatFC = (value: number) =>
  `${Math.round(Number(value) || 0).toLocaleString('fr-FR')} FC`;

const formatCompact = (value: number) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return `${Math.round(n)}`;
};

export function RevenueOverview({ stats }: { stats: any }) {
  const revenue: RevenueStats | undefined = stats?.revenue;

  const total = revenue?.totalCDF ?? 0;
  const rides = revenue?.ridesCDF ?? 0;
  const reservations = revenue?.reservationsCDF ?? 0;
  const ridesShare = total > 0 ? Math.round((rides / total) * 100) : 0;
  const reservationsShare = total > 0 ? 100 - ridesShare : 0;

  const monthly: MonthlyPoint[] = revenue?.monthly ?? [];
  const maxMonthly = Math.max(1, ...monthly.map((m) => m.totalCDF));
  const hasMonthlyData = monthly.some((m) => m.totalCDF > 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Gain total */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-5 sm:p-6 border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-emerald-50/90 text-xs sm:text-sm font-medium uppercase tracking-wide">
                <Wallet className="w-4 h-4" />
                Gain total
              </p>
              <p className="mt-2 text-3xl sm:text-4xl font-bold leading-tight break-words">
                {formatFC(total)}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-emerald-50/80">
                Toutes sources confondues (courses + réservations)
              </p>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm">
                <span>
                  <span className="text-emerald-100/80">Aujourd'hui :</span>{' '}
                  <strong className="font-semibold">{formatFC(revenue?.todayCDF ?? 0)}</strong>
                </span>
                <span>
                  <span className="text-emerald-100/80">Ce mois :</span>{' '}
                  <strong className="font-semibold">{formatFC(revenue?.monthCDF ?? 0)}</strong>
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* 2 & 3. Ventilation courses / réservations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-4 sm:p-5 h-full">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-500">
                  <Car className="w-4 h-4 text-blue-600" />
                  Commandes de course
                </p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 break-words">
                  {formatFC(rides)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {revenue?.ridesCount ?? 0} course{(revenue?.ridesCount ?? 0) > 1 ? 's' : ''} terminée
                  {(revenue?.ridesCount ?? 0) > 1 ? 's' : ''}
                  {(revenue?.ridesTodayCDF ?? 0) > 0 && (
                    <> · {formatFC(revenue?.ridesTodayCDF ?? 0)} aujourd'hui</>
                  )}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold flex-shrink-0">
                {ridesShare}%
              </span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${ridesShare}%` }} />
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-4 sm:p-5 h-full">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-500">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  Commandes par réservation
                </p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 break-words">
                  {formatFC(reservations)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {revenue?.reservationsCount ?? 0} réservation
                  {(revenue?.reservationsCount ?? 0) > 1 ? 's' : ''} honorée
                  {(revenue?.reservationsCount ?? 0) > 1 ? 's' : ''}
                  {typeof revenue?.reservationsTotal === 'number' && (
                    <> sur {revenue.reservationsTotal}</>
                  )}
                  {(revenue?.reservationsTodayCDF ?? 0) > 0 && (
                    <> · {formatFC(revenue?.reservationsTodayCDF ?? 0)} aujourd'hui</>
                  )}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold flex-shrink-0">
                {reservationsShare}%
              </span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${reservationsShare}%` }} />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Tendance 12 mois */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Tendance des gains sur 12 mois
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Courses
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> Réservations
              </span>
            </div>
          </div>

          {hasMonthlyData ? (
            <>
              <div className="overflow-x-auto pb-1 -mx-1 px-1">
                <div className="flex items-end gap-1.5 sm:gap-3 min-w-[520px] h-40 sm:h-48">
                  {monthly.map((point) => {
                    const totalHeight = (point.totalCDF / maxMonthly) * 100;
                    const ridesPart = point.totalCDF > 0 ? (point.ridesCDF / point.totalCDF) * 100 : 0;
                    const reservationsPart = 100 - ridesPart;
                    return (
                      <div
                        key={point.month}
                        className="flex-1 flex flex-col items-center justify-end h-full group"
                        title={`${point.label} — ${formatFC(point.totalCDF)}\nCourses : ${formatFC(point.ridesCDF)}\nRéservations : ${formatFC(point.reservationsCDF)}`}
                      >
                        <span className="text-[10px] text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {point.totalCDF > 0 ? formatCompact(point.totalCDF) : ''}
                        </span>
                        <div
                          className="w-full max-w-[34px] rounded-t-md overflow-hidden flex flex-col justify-end bg-gray-100 transition-opacity group-hover:opacity-90"
                          style={{ height: `${Math.max(totalHeight, point.totalCDF > 0 ? 3 : 1)}%` }}
                        >
                          {point.totalCDF > 0 && (
                            <>
                              <div className="bg-purple-500" style={{ height: `${reservationsPart}%` }} />
                              <div className="bg-blue-500" style={{ height: `${ridesPart}%` }} />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1.5 sm:gap-3 min-w-[520px] mt-2">
                  {monthly.map((point) => (
                    <div key={`${point.month}-label`} className="flex-1 text-center text-[10px] sm:text-xs text-gray-500">
                      {point.shortLabel}
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Survolez une barre pour voir le détail courses / réservations du mois.
              </p>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-gray-500">
              Aucun gain enregistré sur les 12 derniers mois.
              <br />
              <span className="text-xs text-gray-400">
                Les courses terminées et les réservations honorées apparaîtront ici.
              </span>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
