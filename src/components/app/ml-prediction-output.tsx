
"use client";

import type { MlOutputData, StrategySnapshotData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Clock, TrendingUp, TrendingDown, Wand2, Lightbulb, ShieldAlert, MessageSquareQuote, Loader2 } from 'lucide-react';
import * as React from 'react';

interface MlPredictionOutputProps {
  isLoading: boolean; // For base predictions (cost, duration, etc.)
  data: MlOutputData | null;
  strategySnapshot: StrategySnapshotData | null;
  isStrategyLoading: boolean;
  onGenerateStrategySnapshot: () => void;
  caseActive: boolean; // To enable/disable generate button
}

const MetricCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode; className?: string }> = ({ title, icon: Icon, children, className }) => (
  <Card className={`shadow-lg ${className}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

const StrategyPointCard: React.FC<{ title: string; icon: React.ElementType; content: string; isLoading?: boolean; colorClass?: string }> = ({ title, icon: Icon, content, isLoading, colorClass = "text-primary" }) => {
  const listItems = React.useMemo(() => {
    if (!content || typeof content !== 'string') return [];
    return content.split(/\n(?=\s*[-*]|\s*\d+\.\s*)/)
      .map(item => item.trim().replace(/^[-*]|\d+\.\s*/, '').trim())
      .filter(item => item.length > 0);
  }, [content]);

  return (
    <Card className="shadow-md flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center text-lg font-medium ${colorClass}`}>
          <Icon className={`h-6 w-6 mr-3`} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : listItems.length > 0 ? (
          <ScrollArea className="h-32 custom-scrollbar pr-3">
            <ul className="space-y-2 list-disc list-inside pl-2 text-sm text-card-foreground/90">
              {listItems.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">Not yet generated or no specific points found.</p>
        )}
      </CardContent>
    </Card>
  );
};


export function MlPredictionOutput({ 
  isLoading, 
  data, 
  strategySnapshot, 
  isStrategyLoading, 
  onGenerateStrategySnapshot,
  caseActive 
}: MlPredictionOutputProps) {

  const parseListString = (listString: string | undefined): string[] => {
    if (!listString || typeof listString !== 'string') return [];
    return listString.split(/\n(?=\s*[-*]|\s*\d+\.\s*)/)
      .map(item => item.trim().replace(/^[-*]|\d+\.\s*/, '').trim())
      .filter(item => item.length > 0);
  };
  
  if (isLoading && !data) { // Initial loading for base predictions
    return (
      <div className="space-y-4">
        <h2 className="font-headline text-2xl font-semibold mb-4">AI Case Analysis</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => ( 
            <Card key={i} className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
         {/* Placeholder for strategy snapshot button area */}
        <Card className="shadow-lg">
            <CardHeader><CardTitle className="font-headline">Strategy Snapshot</CardTitle></CardHeader>
            <CardContent><Skeleton className="h-10 w-1/2" /></CardContent>
        </Card>
      </div>
    );
  }

  if (!data && !strategySnapshot && !isStrategyLoading && !isLoading) { // No data at all and not loading
    return null; 
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-headline text-2xl font-semibold">AI Case Analysis</h2>
        <CardDescription className="mb-6">Core predictions based on submitted case details.</CardDescription>
        {isLoading && !data && <p className="text-sm text-muted-foreground flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading core analysis...</p>}
        {data && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Estimated Cost" icon={DollarSign}>
              <div className="text-2xl font-bold text-primary">{data.estimatedCost}</div>
            </MetricCard>
            <MetricCard title="Expected Duration" icon={Clock}>
              <div className="text-2xl font-bold">{data.expectedDuration}</div>
            </MetricCard>
            <MetricCard title="Win Probability" icon={TrendingUp}>
              <div className="text-2xl font-bold text-green-600">{data.winProbability}%</div>
              <Progress value={data.winProbability} className="h-2 mt-2 bg-green-600/20 [&>div]:bg-green-600" />
            </MetricCard>
            <MetricCard title="Loss Probability" icon={TrendingDown}>
              <div className="text-2xl font-bold text-red-600">{data.lossProbability}%</div>
              <Progress value={data.lossProbability} className="h-2 mt-2 bg-red-600/20 [&>div]:bg-red-600" />
            </MetricCard>
          </div>
        )}
      </div>

      <Card className="shadow-xl border-accent/30">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle className="font-headline text-2xl text-accent flex items-center">
                    <Wand2 className="mr-3 h-7 w-7"/> Strategy Snapshot
                </CardTitle>
                <CardDescription>AI-generated strategic insights for your case.</CardDescription>
            </div>
            <Button 
                onClick={onGenerateStrategySnapshot} 
                disabled={isStrategyLoading || !caseActive}
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-md whitespace-nowrap mt-2 sm:mt-0"
                size="lg"
            >
              {isStrategyLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
              ) : (
                <><Wand2 className="mr-2 h-5 w-5" /> Generate Snapshot</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {(isStrategyLoading || strategySnapshot) && (
             <Card className="bg-card/50">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-md font-semibold text-primary">
                        <MessageSquareQuote className="h-5 w-5 mr-2"/> Opening Statement Hook
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isStrategyLoading && !strategySnapshot?.openingStatementHook ? (
                         <Skeleton className="h-10 w-full" />
                    ) : strategySnapshot?.openingStatementHook ? (
                        <p className="text-sm italic text-foreground/80 leading-relaxed">"{strategySnapshot.openingStatementHook}"</p>
                    ) : (
                        <p className="text-sm text-muted-foreground">Not yet generated.</p>
                    )}
                </CardContent>
            </Card>
          )}

          {(isStrategyLoading || strategySnapshot) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StrategyPointCard 
                title="Top Strengths to Emphasize" 
                icon={Lightbulb} 
                content={strategySnapshot?.topStrengths || ""}
                isLoading={isStrategyLoading && !strategySnapshot?.topStrengths}
                colorClass="text-green-600"
              />
              <StrategyPointCard 
                title="Top Weaknesses to Mitigate" 
                icon={ShieldAlert} 
                content={strategySnapshot?.topWeaknesses || ""}
                isLoading={isStrategyLoading && !strategySnapshot?.topWeaknesses}
                colorClass="text-red-600"
              />
            </div>
          )}
          {!isStrategyLoading && !strategySnapshot && (
             <div className="text-center py-8">
                <Wand2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3"/>
                <p className="text-muted-foreground">Click the button above to generate your AI Strategy Snapshot.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
