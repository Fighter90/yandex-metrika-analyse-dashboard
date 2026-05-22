/** Placeholder pages — fleshed out in later iterations (Traffic/Funnel/Behavior/Forms/B2B/etc.). */
function ComingSoon({ title, iteration }: { title: string; iteration: string }): JSX.Element {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">Появится в {iteration}.</p>
    </section>
  );
}

export const Traffic = (): JSX.Element => <ComingSoon title="Traffic" iteration="итерации 4–5" />;
export const Funnel = (): JSX.Element => <ComingSoon title="Funnel" iteration="итерации 4–5" />;
export const Hypotheses = (): JSX.Element => (
  <ComingSoon title="Hypotheses" iteration="итерации 6" />
);
export const Decisions = (): JSX.Element => <ComingSoon title="Decisions" iteration="итерации 7" />;
