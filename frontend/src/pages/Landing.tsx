import { useAuth0 } from '@auth0/auth0-react';
import { LogoMark } from '../components/Logo';
import { TrendingUp, HandCoins, PieChart, ShieldCheck, type LucideIcon } from 'lucide-react';

export default function Landing() {
  const { loginWithRedirect } = useAuth0();

  const login = () => loginWithRedirect();

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* ambient glow */}
      <div className="absolute -top-28 -left-24 w-80 h-80 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="absolute top-44 -right-28 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl" />

      <div className="relative max-w-md mx-auto min-h-screen flex flex-col px-6 pt-14 pb-10"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}>

        {/* brand */}
        <div className="flex items-center gap-2.5">
          <LogoMark size={40} />
          <span className="text-xl font-bold tracking-tight">Finsight</span>
        </div>

        {/* hero */}
        <div className="mt-14 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-semibold text-indigo-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Personal finance, clarified
          </div>
          <h1 className="mt-5 text-[40px] leading-[1.05] font-bold tracking-tight">
            Clarity for<br />every rupee.
          </h1>
          <p className="mt-4 text-slate-400 text-[15px] leading-relaxed">
            Track spending, lending and savings in one place — and finally see where your money really goes.
          </p>

          <div className="mt-10 flex flex-col gap-3.5">
            <Feature Icon={TrendingUp} title="Savings at a glance" desc="Income split into what you spend, lend and keep." />
            <Feature Icon={HandCoins}  title="Borrows that add up" desc="Every loan, repayment and interest — to the rupee." />
            <Feature Icon={PieChart}   title="Insightful reports" desc="Trends, budgets and category breakdowns." />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 shrink-0">
          <button onClick={() => login()}
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white text-[15px] font-semibold active:opacity-80 transition-opacity shadow-lg shadow-indigo-600/30">
            Log in
          </button>
          <p className="mt-5 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} /> Secured by Auth0 · your data stays yours
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ Icon, title, desc }: { Icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
        <Icon className="text-indigo-300" size={18} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
