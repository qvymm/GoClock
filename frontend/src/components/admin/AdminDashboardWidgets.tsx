import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type KpiCardProps = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
};

export function KpiCard({ label, value, description, icon: Icon, iconClass }: KpiCardProps) {
  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_28px_rgba(24,39,31,0.05)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}>
          <Icon size={21} strokeWidth={2} />
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </span>
      </div>
      <p className="mt-5 break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </article>
  );
}

export function ChartCard({
  title,
  description,
  icon: Icon,
  children,
  className = '',
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_28px_rgba(24,39,31,0.05)] sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <Icon size={17} />
        </span>
      </div>
      {children}
    </section>
  );
}

export function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-slate-500">{label} revenue</p>
      <p className="mt-1 text-sm font-extrabold text-emerald-700">
        {Number(payload[0].value).toLocaleString('vi-VN')} VNĐ
      </p>
    </div>
  );
}
