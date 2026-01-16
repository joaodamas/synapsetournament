type StepProps = {
  number: string;
  text: string;
};

const Step = ({ number, text }: StepProps) => (
  <div className="flex items-start gap-4">
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff]/10 text-[10px] font-black text-[#7ff7ff]">
      {number}
    </span>
    <p className="text-xs font-medium leading-relaxed text-slate-300">{text}</p>
  </div>
);

export const QuickGuide = () => {
  return (
    <div className="relative overflow-hidden rounded-sm border border-white/10 bg-[#0f1115] p-8 text-slate-100">
      <div className="relative z-10">
        <h2 className="mb-6 text-2xl font-black italic">
          COMO FUNCIONA O SYNAPSE:
        </h2>
        <div className="space-y-4">
          <Step
            number="1"
            text="Logue com sua Steam e vincule seu nivel da GamersClub no perfil."
          />
          <Step
            number="2"
            text="Crie um mix ou entre em um link compartilhado por um amigo."
          />
          <Step
            number="3"
            text="Aguarde os 10 slots encherem. O sorteio sera feito por nivel real."
          />
          <Step
            number="4"
            text="Realize o veto de mapas e conecte no servidor para jogar."
          />
        </div>
      </div>
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#00f2ff]/10 blur-3xl" />
    </div>
  );
};
