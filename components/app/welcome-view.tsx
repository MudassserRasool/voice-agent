import { BookOpen, GraduationCap, Mic, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

function WelcomeImage() {
  return (
    <div className="border-primary/15 bg-primary/10 text-primary mb-6 grid size-20 place-items-center rounded-[20px] border">
      <GraduationCap className="size-10" strokeWidth={1.8} />
    </div>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref} className="min-h-svh w-full overflow-hidden">
      <section className="bg-background flex min-h-svh flex-col items-center justify-center px-5 py-20 text-center">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
          <WelcomeImage />

          <p className="text-muted-foreground font-mono text-xs font-bold tracking-wider uppercase">
            AI voice tutor
          </p>

          <h1 className="text-foreground mt-4 max-w-2xl text-4xl leading-tight font-semibold text-balance md:text-6xl">
            Learn by talking it through
          </h1>

          <p className="text-muted-foreground mt-5 max-w-xl text-base leading-7 text-pretty md:text-lg">
            Ask for a lesson, practice questions, or a simpler explanation. LearnMate adapts the
            pace as you answer.
          </p>

          <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
            {[
              { icon: BookOpen, label: 'Explain', text: 'Break down a topic step by step.' },
              { icon: Sparkles, label: 'Practice', text: 'Answer quick checks out loud.' },
              { icon: Mic, label: 'Review', text: 'Fix gaps with targeted follow-ups.' },
            ].map((item) => (
              <div
                key={item.label}
                className="border-border/70 bg-card/70 rounded-lg border p-4 shadow-sm"
              >
                <item.icon className="text-primary mb-3 size-5" aria-hidden="true" />
                <p className="text-foreground text-sm font-semibold">{item.label}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-5">{item.text}</p>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            onClick={onStartCall}
            className="mt-8 h-12 w-full max-w-xs rounded-full font-mono text-xs font-bold tracking-wider uppercase"
          >
            <Mic className="mr-2 size-4" />
            {startButtonText}
          </Button>
        </div>
      </section>
    </div>
  );
};
